// ソース検索(Web 版のサイドバーの検索)。
// 開いているソースと同じライブラリの、選んだソースファイルの全メンバーから、検索語をすべて含むものを探す。
import * as vscode from 'vscode';
import { decodeText } from '../../src/monaco/webworker/fileOpen.js';
import { createSourceMatcher } from '../../shared/sourceSearch.js';
import { stripExtension } from '../../shared/refSearch.js';
import { readConfig } from './config.js';
import { parseSourcePath, sourceUriOf } from './languages.js';

const STATE_KEY = 'damco.search.queries';

// ライブラリのフォルダの中から、指定したソースファイルのメンバーを検索する(コマンドとテストから使う)
export const searchSources = async ({ libraryUri, files, queries, forceSJIS, token, progress }) => {
    const matcher = createSourceMatcher(queries);
    if (matcher === null) {
        return [];
    }
    const results = [];
    for (const file of files) {
        const folder = vscode.Uri.joinPath(libraryUri, file);
        let entries = [];
        try {
            entries = await vscode.workspace.fs.readDirectory(folder);
        } catch {
            continue;
        }
        const members = entries.filter(([, type]) => (type & vscode.FileType.File) !== 0).map(([name]) => name).sort();
        for (const name of members) {
            if (token && token.isCancellationRequested) {
                return results;
            }
            const uri = vscode.Uri.joinPath(folder, name);
            const { text } = decodeText(await vscode.workspace.fs.readFile(uri), forceSJIS);
            if (matcher(text)) {
                results.push({ member: stripExtension(name), file, uri });
            }
            if (progress) {
                progress.report({ message: file + '/' + name });
            }
        }
    }
    return results;
};

class SearchResultProvider {
    constructor() {
        this.results = [];
        this.queries = [];
        this.emitter = new vscode.EventEmitter();
        this.onDidChangeTreeData = this.emitter.event;
    }

    set(results, queries) {
        this.results = results;
        this.queries = queries;
        this.emitter.fire();
    }

    getTreeItem(result) {
        const item = new vscode.TreeItem(result.member, vscode.TreeItemCollapsibleState.None);
        item.description = result.file;
        item.tooltip = result.uri.fsPath;
        item.iconPath = new vscode.ThemeIcon('file-code');
        item.command = { command: 'vscode.open', title: '開く', arguments: [result.uri, { preview: true }] };
        return item;
    }

    getChildren(element) {
        return element ? [] : this.results;
    }
}

export const registerSearch = (context) => {
    const provider = new SearchResultProvider();
    const view = vscode.window.createTreeView('damco.search', { treeDataProvider: provider });
    context.subscriptions.push(view);

    context.subscriptions.push(vscode.commands.registerCommand('damco.searchSource', async () => {
        const editor = vscode.window.activeTextEditor;
        const parsed = editor ? parseSourcePath(editor.document.uri) : null;
        if (!parsed) {
            vscode.window.showInformationMessage('ライブラリ / ソースファイル / メンバー の階層にあるソースを開いてから検索してください。');
            return;
        }
        const libraryUri = vscode.Uri.joinPath(sourceUriOf(editor.document.uri), '..', '..');
        let folders = [];
        try {
            folders = (await vscode.workspace.fs.readDirectory(libraryUri))
                .filter(([, type]) => (type & vscode.FileType.Directory) !== 0)
                .map(([name]) => name)
                .sort();
        } catch {
            folders = [parsed.file];
        }
        const picked = await vscode.window.showQuickPick(
            folders.map((name) => ({ label: name, picked: name === parsed.file })),
            { canPickMany: true, title: 'ソース検索: 検索するソースファイル(' + parsed.lib + ')' });
        if (!picked || picked.length === 0) {
            return;
        }
        const previous = context.workspaceState.get(STATE_KEY, ['', '']);
        const query1 = await vscode.window.showInputBox({
            title: 'ソース検索 (1/2)',
            prompt: '検索語(正規表現。% を含むと % = 任意の文字列、_ = 任意の 1 文字)。ファイル名やフィールド名など',
            value: previous[0],
        });
        if (query1 === undefined) {
            return;
        }
        const query2 = await vscode.window.showInputBox({
            title: 'ソース検索 (2/2)',
            prompt: 'さらに絞り込む検索語(AND。空なら 1 つ目だけ)',
            value: previous[1],
        });
        if (query2 === undefined) {
            return;
        }
        const queries = [query1, query2];
        await context.workspaceState.update(STATE_KEY, queries);
        try {
            createSourceMatcher(queries);
        } catch (error) {
            vscode.window.showErrorMessage('検索語の正規表現が正しくありません: ' + error.message);
            return;
        }
        const results = await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: 'ソース検索', cancellable: true },
            (progress, token) => searchSources({
                libraryUri,
                files: picked.map((p) => p.label),
                queries,
                forceSJIS: readConfig(libraryUri).forceShiftJIS,
                token,
                progress,
            }));
        provider.set(results, queries);
        view.description = results.length + ' 件';
        view.message = results.length === 0 ? '見つかりませんでした(' + queries.filter((q) => q).join(', ') + ')' : undefined;
        await vscode.commands.executeCommand('damco.search.focus');
    }));

    // 結果をタブ区切りでクリップボードへ(Web 版の「結果をコピー」と同じ形)
    context.subscriptions.push(vscode.commands.registerCommand('damco.copySearchResults', async () => {
        const desc = provider.queries.filter((q) => q).join('\t');
        const text = provider.results.map((r) => r.member + '\t' + desc + '\n').join('');
        await vscode.env.clipboard.writeText(text);
        vscode.window.showInformationMessage(provider.results.length + ' 件をコピーしました。');
    }));

    return provider;
};
