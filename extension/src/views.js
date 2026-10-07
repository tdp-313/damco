// サイドバー: 開いているソースが使っているファイル(画面・DDS)と呼び出しているプログラム。
// Web 版 src/monaco/sidebar/sidebar.js の createUseFileList と同じ内容を TreeView で出す。
import * as vscode from 'vscode';
import { resolveSourceType } from '../../shared/sourceFiles.js';
import { readConfig } from './config.js';
import { isDamcoDocument } from './languages.js';

export const useString = (use) => {
    const io = use && use.io ? use.io : new Set();
    if (io.has('U') && io.has('O')) {
        return 'U/O';
    } else if (io.has('I') && io.has('O')) {
        return 'I/O';
    } else if (io.has('O')) {
        return 'O';
    } else if (io.has('U')) {
        return 'U';
    } else if (io.has('I')) {
        return 'I';
    }
    return '';
};

const parentName = (uri) => {
    const parts = uri.path.split('/').filter((s) => s !== '');
    return parts.length >= 2 ? parts[parts.length - 2] : '';
};

const pathLabel = (uri) => uri.path.split('/').filter((s) => s !== '').slice(-3).join('/');

// 表示する一覧を作る(TreeView 用のデータ。テストからも使う)
export const buildFileList = (otherData, sourceFiles, filter) => {
    const isDisplay = (use) => {
        if (!filter.Ref && !use.original) {
            return false;
        }
        return (use.io.has('I') && filter.Input) || (use.io.has('U') && filter.Update) || (use.io.has('O') && filter.Output);
    };
    const files = [];
    let total = 0;
    const existing = new Set();
    for (const kind of ['dsp', 'dds']) {
        for (const [key, values] of otherData.normalRefDef) {
            for (const value of values) {
                if (value.sourceType !== 'file') {
                    continue;
                }
                const type = resolveSourceType(parentName(value.location.uri), sourceFiles);
                if ((kind === 'dsp') !== (type === 'dsp')) {
                    continue;
                }
                total++;
                existing.add(key);
                if (kind === 'dsp' || isDisplay(value.use)) {
                    files.push({ name: key, kind, description: value.s_description, use: useString(value.use), uri: value.location.uri, found: true });
                }
            }
        }
        for (const [key, value] of otherData.refListFile[kind]) {
            if (existing.has(key)) {
                continue;
            }
            total++;
            if (isDisplay(value.use)) {
                files.push({ name: value.name, kind, description: 'Not Found', use: useString(value.use), uri: null, found: false });
            }
        }
    }
    return { files, total };
};

export const buildProgramList = (otherData) => {
    const programs = [];
    const existing = new Set();
    for (const [key, values] of otherData.normalRefDef) {
        for (const value of values) {
            if (value.sourceType === 'PGM') {
                const name = key.replace(/'/g, '');
                existing.add(name);
                programs.push({ name, description: value.s_description, uri: value.location.uri, found: true });
            }
        }
    }
    for (const [key, value] of otherData.refListFile.pgm) {
        if (!existing.has(key)) {
            programs.push({ name: value.name, description: 'Not Found', uri: null, found: false });
        }
    }
    return programs;
};

class ListProvider {
    constructor() {
        this.items = [];
        this.emitter = new vscode.EventEmitter();
        this.onDidChangeTreeData = this.emitter.event;
    }

    set(items) {
        this.items = items;
        this.emitter.fire();
    }

    getTreeItem(item) {
        return item;
    }

    getChildren(element) {
        return element ? [] : this.items;
    }
}

const toTreeItem = (entry, icon) => {
    const item = new vscode.TreeItem(entry.name, vscode.TreeItemCollapsibleState.None);
    item.description = [entry.use, entry.description].filter((s) => s).join('  ');
    item.iconPath = new vscode.ThemeIcon(entry.found ? icon : 'warning');
    if (entry.uri) {
        item.tooltip = pathLabel(entry.uri);
        item.command = { command: 'vscode.open', title: '開く', arguments: [entry.uri, { preview: true }] };
        item.contextValue = 'damcoFound';
    } else {
        item.tooltip = entry.name + ' : ライブラリリストのライブラリに見つかりません';
    }
    return item;
};

export const registerViews = (context, service) => {
    const filesProvider = new ListProvider();
    const programsProvider = new ListProvider();
    const filesView = vscode.window.createTreeView('damco.files', { treeDataProvider: filesProvider });
    const programsView = vscode.window.createTreeView('damco.programs', { treeDataProvider: programsProvider });
    context.subscriptions.push(filesView, programsView);
    const filter = { Input: true, Update: true, Output: true, Ref: true };

    // 一覧に出しているソース。ほかのファイル(設定など)に切り替えても、直前のソースの一覧を残す
    let shownUri = null;
    const target = () => {
        const editor = vscode.window.activeTextEditor;
        if (editor && isDamcoDocument(editor.document)) {
            return editor.document;
        }
        return shownUri === null ? null : vscode.workspace.textDocuments.find((d) => d.uri.toString() === shownUri && isDamcoDocument(d)) || null;
    };

    const refresh = () => {
        const document = target();
        if (!document) {
            if (shownUri !== null) {
                shownUri = null;
                filesProvider.set([]);
                programsProvider.set([]);
                filesView.description = undefined;
                filesView.message = undefined;
                programsView.message = undefined;
            }
            return;
        }
        shownUri = document.uri.toString();
        const otherData = service.referenceEntry(document).otherData;
        const config = readConfig(document.uri);
        const status = otherData.status;
        if (status === 'unsupported') {
            filesProvider.set([]);
            programsProvider.set([]);
            filesView.message = 'ライブラリ / ソースファイル / メンバー の階層にあるソースで使えます';
            programsView.message = undefined;
            return;
        }
        const { files, total } = buildFileList(otherData, config.sourceFiles, filter);
        filesProvider.set(files.map((f) => toTreeItem(f, f.kind === 'dsp' ? 'window' : 'database')));
        programsProvider.set(buildProgramList(otherData).map((p) => toTreeItem(p, 'symbol-method')));
        filesView.description = files.length + '/' + total;
        const libraries = otherData.searchLibName && otherData.searchLibName.length > 0 ? 'ライブラリ: ' + otherData.searchLibName.join(', ') : '';
        filesView.message = status === 'pending' || status === 'none' ? '検索中…' : status === 'error' ? '検索に失敗しました(出力パネルの DAMCO を参照)' : libraries;
        programsView.message = status === 'pending' || status === 'none' ? '検索中…' : undefined;
    };

    const activate = () => {
        const document = target();
        if (document) {
            service.ensureReferences(document);
        }
        refresh();
    };

    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(activate));
    context.subscriptions.push(service.onDidUpdate((document) => {
        if (document.uri.toString() === shownUri || (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document === document)) {
            refresh();
        }
    }));
    // 編集中は少し待ってから探し直す
    let timer;
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((e) => {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document === e.document && isDamcoDocument(e.document)) {
            clearTimeout(timer);
            timer = setTimeout(activate, 1000);
        }
    }));
    // 言語の割り当て・設定の変更ではドキュメントが開き直される
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(() => setTimeout(activate, 0)));
    context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(() => setTimeout(activate, 0)));

    context.subscriptions.push(vscode.commands.registerCommand('damco.filterFiles', async () => {
        const items = [
            { label: 'I', description: '入力', key: 'Input' },
            { label: 'U', description: '更新', key: 'Update' },
            { label: 'O', description: '出力', key: 'Output' },
            { label: 'PFILE', description: '論理ファイルの元の物理ファイルも出す', key: 'Ref' },
        ].map((item) => Object.assign(item, { picked: filter[item.key] }));
        const picked = await vscode.window.showQuickPick(items, { canPickMany: true, title: '使用ファイルの絞り込み' });
        if (picked) {
            for (const item of items) {
                filter[item.key] = picked.includes(item);
            }
            refresh();
        }
    }));

    activate();
    return { refresh, filesProvider, programsProvider };
};
