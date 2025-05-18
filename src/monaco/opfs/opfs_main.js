import { Directory_Handle_RegisterV2 } from "../file/directory";
import { linkStatus } from "../file/directory";
import { Setting } from "../../setting";
let syncWorker;
export let opfs_message = [];

export const opfsWorkerRegister = async (workerTargetDirName) => {
    // ユーザーはこの変数に FileSystemDirectoryHandle を設定するか、
    // setDirectoryHandle() 関数経由で設定することを想定します。
    await Directory_Handle_RegisterV2(workerTargetDirName);
    let targetDirectoryHandle = linkStatus[workerTargetDirName].selectHandle;
    opfs_message = [];
    syncWorker = new Worker(new URL('./opfs_worker.js', import.meta.url));
    syncWorker.postMessage({
        type: 'SYNC_REQUEST',
        sourceDirectoryHandle: targetDirectoryHandle,
        targetDirName: workerTargetDirName // targetDirNameを渡す
    });

    syncWorker.onmessage = async (e) => {
        const { status, message, targetDirName: workerTargetDirName } = e.data; // workerからtargetDirNameを受け取る
        const prefix = workerTargetDirName ? `[Worker/${workerTargetDirName}]` : "[Worker]";
        
        switch (status) {
            case 'progress':
                console.info(`${prefix} Progress: ${message}`);
                break;
            case 'completed':
                opfs_message.push({ message: message, status: status, timestamp: performance.now() });
                console.log(`${prefix} Completed: ${message}`);
                let rootHandle = await navigator.storage.getDirectory();
                linkStatus[workerTargetDirName].handle = await rootHandle.getDirectoryHandle(workerTargetDirName);
                linkStatus[workerTargetDirName].ishandle = true;
                linkStatus[workerTargetDirName].isOPFS = true;
                Setting.setLastOPFS_Update = new Date();
                break;
            case 'error':
                opfs_message.push({ message: message, status: status, timestamp: performance.now() });
                console.error(`${prefix} Error: ${message}`);
                break;
            case 'warning':
                opfs_message.push({ message: message, status: status, timestamp: performance.now() });
                console.warn(`${prefix} Warning: ${message}`);
                break;
            default:
                console.log(`${prefix} Message: Status: ${status || 'N/A'}, Message: ${message}`);
        }
    };

    syncWorker.onerror = (e) => {
        console.error(`[Worker Fatal Error]: ${e.message || 'Unknown worker error'} (filename: ${e.filename}, lineno: ${e.lineno})`, e);
    };
}

export const clearOPFS = async () => {
    if (window.alert('OPFSをクリアしますか？') === false) {
        return null;
    }
    console.info('OPFSをクリア中...');
    try {
        const opfsRoot = await navigator.storage.getDirectory();
        let count = 0;
        // OPFSのルート直下のエントリをすべて削除
        for await (const name of opfsRoot.keys()) {
            try {
                // ディレクトリかもしれないのでrecursive: trueで試みる
                await opfsRoot.removeEntry(name, { recursive: true });
                count++;
                console.log(`OPFSから ${name} を削除しました。`);
            } catch (e) {
                console.warn(`OPFSクリア中にエントリ "${name}" の削除でエラーが発生しました:`, e.message);
            }
        }
        if (count > 0) {
            console.log(`OPFSをクリアしました (${count} 個のルートエントリを削除)。`);
        } else {
            console.log("OPFSは既に空か、ルートエントリの削除に失敗しました。");
        }
        alert(`OPFSのクリア処理が完了しました。${count}個のエントリが削除対象となりました。詳細はコンソールを確認してください。`);
    } catch (err) {
        console.error('OPFSのクリア処理中にエラーが発生しました:', err);
        alert('OPFSのクリア中にエラーが発生しました。詳細はコンソールを確認してください。');
    }
}