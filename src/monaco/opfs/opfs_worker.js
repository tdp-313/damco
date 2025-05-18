
async function getOPFSRoot() {
    return navigator.storage.getDirectory();
}

/**
 * 指定されたディレクトリハンドル内のすべてのエントリ（ファイルとフォルダ）の情報を再帰的にリスト化します。
 * @param {FileSystemDirectoryHandle} directoryHandle - 探索を開始するディレクトリハンドル。
 * @param {string} currentPath - 現在の相対パス。
 * @param {string} targetDirNameForLogging - ログ出力用のターゲットディレクトリ名。
 * @returns {Promise<Object<string, Object>>} パスをキーとし、エントリ情報（kind, handle, lastModified, name, parentPath）を値とするオブジェクト。
 */
async function listEntriesRecursive(directoryHandle, currentPath = '', targetDirNameForLogging = '') {
    const entries = {};
    try {
        for await (const [name, handle] of directoryHandle.entries()) {
            const path = currentPath ? `${currentPath}/${name}` : name;
            if (handle.kind === 'file') {
                const file = await handle.getFile();
                entries[path] = {
                    kind: 'file',
                    handle: handle,
                    lastModified: file.lastModified,
                    name: name,
                    parentPath: currentPath
                };
            } else if (handle.kind === 'directory') {
                entries[path] = { // ディレクトリ自体のエントリ
                    kind: 'directory',
                    handle: handle,
                    name: name,
                    parentPath: currentPath
                };
                // 再帰的に探索
                Object.assign(entries, await listEntriesRecursive(handle, path, targetDirNameForLogging));
            }
        }
    } catch (e) {
        const logContext = targetDirNameForLogging ? ` (ターゲット: /${targetDirNameForLogging})` : '';
        console.error(`Error listing entries in directory handle "${directoryHandle.name}", path "${currentPath || '/'}":`, e);
        self.postMessage({ status: 'warning', message: `ディレクトリ「${directoryHandle.name}/${currentPath || ''}」の一覧取得中にエラー: ${e.message}`, targetDirName: targetDirNameForLogging });
    }
    return entries;
}

/**
 * 指定されたベースディレクトリハンドルからの相対パスにディレクトリが存在することを確認し、なければ作成します。
 * パス途中のディレクトリも必要に応じて作成します。
 * @param {FileSystemDirectoryHandle} baseDirHandle - 操作の基点となるディレクトリハンドル。
 * @param {string} relativePath - baseDirHandleからの相対パス。
 * @returns {Promise<FileSystemDirectoryHandle>} 指定された相対パスのディレクトリハンドル。
 */
async function getOrCreateDirectoryHandleRecursive(baseDirHandle, relativePath) {
    let currentHandle = baseDirHandle;
    if (relativePath === '' || relativePath === '.') return baseDirHandle; // ベース自体の場合

    const parts = relativePath.split('/').filter(p => p !== ''); // 空のパーツを除去
    for (const part of parts) {
        try {
            currentHandle = await currentHandle.getDirectoryHandle(part, { create: true });
        } catch (e) {
            console.error(`Error getting or creating directory handle for "${part}" within "${baseDirHandle.name}/${relativePath}":`, e);
            throw e;
        }
    }
    return currentHandle;
}

async function copyFileToOPFS(sourceFileHandle, targetParentDirHandle, name, lastModified) {
    console.log(name)
    try {
        const file = await sourceFileHandle.getFile();
        const targetFileHandle = await targetParentDirHandle.getFileHandle(name, { create: true });
        const writable = await targetFileHandle.createWritable();
        await writable.write(file);
        await writable.close();
        return { name: name, lastModified: lastModified }; // コピーしたファイルの情報
    } catch (e) {
        console.error(`Error copying file "${name}" to OPFS directory "${targetParentDirHandle.name}":`, e);
        throw e;
    }
}

async function deleteFromOPFS(targetParentDirHandle, name, kind) {
    try {
        if (kind === 'file') {
            await targetParentDirHandle.removeEntry(name);
        } else if (kind === 'directory') {
            await targetParentDirHandle.removeEntry(name, { recursive: true });
        }
    } catch (e) {
        if (e.name === 'NotFoundError') {
            console.warn(`Attempted to delete ${kind} "${name}" from OPFS directory "${targetParentDirHandle.name}", but it was not found.`);
        } else {
            console.error(`Error deleting ${kind} "${name}" from OPFS directory "${targetParentDirHandle.name}":`, e);
            throw e;
        }
    }
}

async function writeSyncLog(opfsRoot, targetDirName, lastModifiedMap) {
    try {
        const syncLogDirHandle = await opfsRoot.getDirectoryHandle('synclog', { create: true });
        const logFileName = `${targetDirName}.json`;
        const logFileHandle = await syncLogDirHandle.getFileHandle(logFileName, { create: true });
        const writable = await logFileHandle.createWritable();
        await writable.write(JSON.stringify(lastModifiedMap));
        await writable.close();
    } catch (error) {
        console.error(`Error writing sync log for ${targetDirName}:`, error);
    }
}

async function readSyncLog(opfsRoot, targetDirName) {
    try {
        const syncLogDirHandle = await opfsRoot.getDirectoryHandle('synclog', { create: true });
        const logFileName = `${targetDirName}.json`;
        const logFileHandle = await syncLogDirHandle.getFileHandle(logFileName);
        const file = await logFileHandle.getFile();
        const text = await file.text();
        return JSON.parse(text);
    } catch (error) {
        // ファイルが存在しない場合は空のオブジェクトを返す
        if (error.name === 'NotFoundError') {
            return {};
        }
        console.error(`Error reading sync log for ${targetDirName}:`, error);
        return {};
    }
}

/**
 * FileSystemDirectoryHandle (同期元) の内容を、OPFS内の指定されたターゲットディレクトリ以下に同期します。
 * @param {FileSystemDirectoryHandle} sourceRootDirectoryHandle - 同期元のルートディレクトリハンドル。
 * @param {string} targetBaseDirNameInOPFS - OPFSのルート直下に作成/使用するターゲットディレクトリ名。
 */
async function sync(sourceRootDirectoryHandle, targetBaseDirNameInOPFS) {
    // Workerからのメッセージにターゲットディレクトリ名を含めることで、複数の同期ジョブのログを区別しやすくする
    const postMsg = (status, message) => self.postMessage({ status, message, targetDirName: targetBaseDirNameInOPFS });

    postMsg('progress', '同期処理を開始...');

    const opfsRoot = await getOPFSRoot();
    let opfsSyncBaseDir; // OPFS側の同期の基点となるディレクトリハンドル
    try {
        // OPFSルート直下にターゲット名のディレクトリを作成/取得
        opfsSyncBaseDir = await opfsRoot.getDirectoryHandle(targetBaseDirNameInOPFS, { create: true });
        postMsg('progress', `OPFS内のターゲットディレクトリ「/${targetBaseDirNameInOPFS}」を準備`);
    } catch (e) {
        console.error(`Failed to create/get target directory /${targetBaseDirNameInOPFS} in OPFS:`, e);
        postMsg('error', `OPFS内にターゲットディレクトリ「/${targetBaseDirNameInOPFS}」を作成/取得できませんでした: ${e.message}`);
        return; // ベースディレクトリがなければ処理続行不可
    }

    postMsg('progress', `同期元(${sourceRootDirectoryHandle.name})のリストを作成...`);
    const sourceEntries = await listEntriesRecursive(sourceRootDirectoryHandle, '', targetBaseDirNameInOPFS);

    postMsg('progress', `同期先(OPFS /${targetBaseDirNameInOPFS})のリストを作成...`);
    const opfsEntries = await listEntriesRecursive(opfsSyncBaseDir, '', targetBaseDirNameInOPFS); // OPFS側もopfsSyncBaseDirを基点に

    // 同期ログの読み込み
    const syncLog = await readSyncLog(opfsRoot, targetBaseDirNameInOPFS);
    const currentLastModifiedMap = {}; // 今回同期でOPFSに保存したファイルのlastModifiedを記録

    postMsg('progress', '比較とコピー/作成を開始...');
    for (const path in sourceEntries) { // path は sourceRootDirectoryHandle からの相対パス
        const sourceEntry = sourceEntries[path];
        const opfsEntry = opfsEntries[path]; // opfsEntriesのキーも opfsSyncBaseDir からの相対パス
        const parentPath = sourceEntry.parentPath; // sourceRootDirectoryHandle からの相対パス
        const name = sourceEntry.name;

        try {
            // OPFS側の親ディレクトリハンドルは、opfsSyncBaseDir からの相対パスで解決
            const targetParentDirHandle = await getOrCreateDirectoryHandleRecursive(opfsSyncBaseDir, parentPath);

            if (sourceEntry.kind === 'directory') {
                if (!opfsEntry || opfsEntry.kind !== 'directory') {
                    if (opfsEntry && opfsEntry.kind !== 'directory') {
                        postMsg('progress', `種類が不一致: OPFSから既存エントリ /${targetBaseDirNameInOPFS}/${path} (${opfsEntry.kind}) を削除中...`);
                        await deleteFromOPFS(targetParentDirHandle, name, opfsEntry.kind);
                        // 同期ログからも削除
                        delete syncLog[path];
                    }
                    postMsg('progress', `OPFSにディレクトリを作成: /${targetBaseDirNameInOPFS}/${path}`);
                    await targetParentDirHandle.getDirectoryHandle(name, { create: true });
                }
            } else if (sourceEntry.kind === 'file') {
                const sourceLastModified = sourceEntry.lastModified;
                const loggedLastModified = syncLog[path]?.lastModified;

                if (!opfsEntry || opfsEntry.kind !== 'file' || sourceLastModified > (loggedLastModified || 0)) {
                    if (opfsEntry && opfsEntry.kind !== 'file') {
                        postMsg('progress', `種類が不一致: OPFSから既存エントリ /${targetBaseDirNameInOPFS}/${path} (${opfsEntry.kind}) を削除中...`);
                        await deleteFromOPFS(targetParentDirHandle, name, opfsEntry.kind);
                        // 同期ログからも削除
                        delete syncLog[path];
                    }
                    postMsg('progress', `OPFSにファイルをコピー中: /${targetBaseDirNameInOPFS}/${path}`);
                    const copiedFileInfo = await copyFileToOPFS(sourceEntry.handle, targetParentDirHandle, name, sourceLastModified);
                    currentLastModifiedMap[path] = { lastModified: copiedFileInfo.lastModified };
                } else if (opfsEntry && opfsEntry.kind === 'file') {
                    // 同期済みとしてログのlastModifiedを保持
                    currentLastModifiedMap[path] = { lastModified: loggedLastModified };
                }
            }
        } catch (error) {
            console.error(`Error processing source entry ${path} for target /${targetBaseDirNameInOPFS}:`, error);
            postMsg('error', `エントリ「/${targetBaseDirNameInOPFS}/${path}」の処理中にエラー: ${error.message}`);
        }
    }

    postMsg('progress', `OPFS /${targetBaseDirNameInOPFS} 内の不要なファイルの削除を開始...`);
    const opfsPathsToDelete = Object.keys(opfsEntries) // opfsEntriesのキーは opfsSyncBaseDir からの相対パス
        .filter(path => !sourceEntries[path])
        .sort((a, b) => b.length - a.length); // 深いパスから削除

    for (const path of opfsPathsToDelete) {
        const opfsEntry = opfsEntries[path];
        const parentPath = opfsEntry.parentPath; // opfsSyncBaseDir からの相対パス
        const name = opfsEntry.name;

        try {
            // OPFS側の親ディレクトリハンドルは、opfsSyncBaseDir からの相対パスで解決
            // parentPathが空文字列の場合は、opfsSyncBaseDir が親
            const targetParentDirHandle = (parentPath === '') ? opfsSyncBaseDir : await getOrCreateDirectoryHandleRecursive(opfsSyncBaseDir, parentPath);

            postMsg('progress', `OPFSから削除中: /${targetBaseDirNameInOPFS}/${path}`);
            await deleteFromOPFS(targetParentDirHandle, name, opfsEntry.kind);
            // 同期ログからも削除
            delete syncLog[path];
        } catch (error) {
            console.error(`Error deleting OPFS entry /${targetBaseDirNameInOPFS}/${path}:`, error);
            postMsg('warning', `OPFSエントリ「/${targetBaseDirNameInOPFS}/${path}」の削除中にエラー: ${error.message}`);
        }
    }

    // 今回の同期で処理したファイルのlastModifiedをログに書き込む
    await writeSyncLog(opfsRoot, targetBaseDirNameInOPFS, currentLastModifiedMap);

    console.log(`Sync process for /${targetBaseDirNameInOPFS} finished.`);
    postMsg('completed', `同期が完了しました。`);
}


self.onmessage = async (event) => {
    if (event.data && event.data.type === 'SYNC_REQUEST') {
        const { sourceDirectoryHandle, targetDirName } = event.data;

        // targetDirNameの検証を追加
        if (!targetDirName || typeof targetDirName !== 'string' || targetDirName.trim() === "" || targetDirName.includes('/') || targetDirName.includes('\\') || targetDirName === '.' || targetDirName === '..') {
            self.postMessage({ status: 'error', message: `OPFS内のターゲットディレクトリ名「${targetDirName || ''}」が無効です。スラッシュやバックスラッシュ、'.' , '..' は含めず、空でない文字列を指定してください。`, targetDirName: targetDirName || "N/A" });
            return;
        }
        const cleanTargetDirName = targetDirName.trim();

        if (!sourceDirectoryHandle || sourceDirectoryHandle.kind !== 'directory') {
            self.postMessage({ status: 'error', message: '同期元のディレクトリハンドルが提供されていないか、無効です。', targetDirName: cleanTargetDirName });
            return;
        }

        try {
            await sync(sourceDirectoryHandle, cleanTargetDirName);
        } catch (error) { // sync関数内で捕捉されなかった致命的エラー
            console.error(`Critical error during sync worker execution for target /${cleanTargetDirName}:`, error);
            self.postMessage({ status: 'error', message: `同期中に致命的なエラーが発生しました: ${error.message}`, targetDirName: cleanTargetDirName });
        }
    }
};