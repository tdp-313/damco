// 逆引き(このファイルを使っているソース・このプログラムを呼んでいるソース)と、呼び出しツリー。
// 索引(shared/usageIndex.js)は、逆引きの一覧を開いたとき・ツリーを開いたときに初めて作る。
// メンバーごとの結果は更新日時とサイズで覚えておき(次の起動にも持ち越す)、変わったメンバーだけ読み直す。
import * as vscode from 'vscode';
import { buildUsageIndex, usageRoots, usageChildren, calleeItems, memberKey, treeNodes } from '../../shared/usageIndex.js';
import { resolveSearchLibraries } from '../../shared/sourceFiles.js';
import { readConfig } from './config.js';
import { searchRoots } from './documents.js';
import { SEARCH_SCHEMES, isDamcoDocument, parseSourcePath, sourceTypeOf, sourceUriOf } from './languages.js';

const CACHE_FILE = 'usage-index.json';
const CACHE_VERSION = 1;

export class UsageService {
    constructor(context, service, output) {
        this.context = context;
        this.service = service;
        this.output = output;
        this.cache = new Map(); // メンバーの Uri → { stamp, type, scan }
        this.loaded = null;
        this.current = null; // { key, promise, index }
        this.progressEmitter = new vscode.EventEmitter();
        this.onDidProgress = this.progressEmitter.event;
    }

    get cacheUri() {
        return this.context.storageUri ? vscode.Uri.joinPath(this.context.storageUri, CACHE_FILE) : null;
    }

    // 前回の起動で覚えた結果を読む(なければ空のまま)
    load() {
        if (this.loaded === null) {
            this.loaded = (async () => {
                try {
                    const data = JSON.parse(new TextDecoder().decode(await vscode.workspace.fs.readFile(this.cacheUri)));
                    if (data.version === CACHE_VERSION && Array.isArray(data.entries)) {
                        this.cache = new Map(data.entries);
                    }
                } catch {
                    // まだ保存していない・ワークスペースがない
                }
            })();
        }
        return this.loaded;
    }

    // 保存は 1 つずつ行う(続けて作り直したときに、書き込みが重ならないように)
    save() {
        this.saving = (this.saving || Promise.resolve()).then(() => this.write());
        return this.saving;
    }

    async write() {
        if (this.cacheUri === null) {
            return;
        }
        try {
            await vscode.workspace.fs.createDirectory(this.context.storageUri);
            const data = JSON.stringify({ version: CACHE_VERSION, entries: [...this.cache] });
            await vscode.workspace.fs.writeFile(this.cacheUri, new TextEncoder().encode(data));
        } catch (error) {
            this.output.appendLine('[逆引きの索引] 保存できませんでした: ' + error);
        }
    }

    // 覚えた結果を捨てて、次に使うときに全部読み直す
    reset() {
        this.cache.clear();
        this.current = null;
    }

    // ドキュメントの場所と設定。逆引きの対象でなければ null
    describe(document) {
        const uri = sourceUriOf(document.uri);
        if (!SEARCH_SCHEMES.includes(uri.scheme)) {
            return null;
        }
        const config = readConfig(uri);
        const type = sourceTypeOf(uri, config.sourceFiles);
        const parsed = parseSourcePath(uri);
        if (type === null || parsed === null) {
            return null;
        }
        const roots = searchRoots(parsed.root, config);
        // 調べるのは、開いているソースのライブラリリストのライブラリ(使用ファイルの一覧と同じ)
        const libraries = resolveSearchLibraries(parsed.lib, config.libraryList);
        const key = [this.service.generation, config.forceShiftJIS, JSON.stringify(config.sourceFiles), JSON.stringify(libraries), ...roots.map((r) => r.ref.toString())].join('|');
        return { uri, config, roots, libraries, key, source: { type, member: parsed.member, lib: parsed.lib, file: parsed.file } };
    }

    // 作ってある索引(なければ null)。作らない
    peek(document) {
        const info = this.describe(document);
        return info !== null && this.current !== null && this.current.key === info.key ? this.current.index : null;
    }

    // 索引を(必要なら作って)返す。対象でなければ null
    async ensure(document) {
        const info = this.describe(document);
        if (info === null) {
            return null;
        }
        if (this.current === null || this.current.key !== info.key) {
            const entry = { key: info.key, index: null, promise: null };
            this.current = entry;
            entry.promise = this.build(info, entry).then((index) => {
                entry.index = index;
                return index;
            });
        }
        const index = await this.current.promise;
        return index === null ? null : { index, ...info };
    }

    async build(info, entry) {
        await this.load();
        const forceSJIS = info.config.forceShiftJIS;
        const fs = {
            ...this.service.fs,
            key: (uri) => uri.toString(),
            stamp: async (uri) => {
                const stat = await vscode.workspace.fs.stat(uri);
                return stat.mtime + ':' + stat.size + (forceSJIS ? ':sjis' : '');
            },
        };
        const started = Date.now();
        // 進み具合はステータスバーにも出す(逆引きの一覧を閉じたまま、呼び出しツリーから作ることもあるため)
        let reportStatus = () => { };
        let finish = () => { };
        vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: 'DAMCO 逆引きの索引' }, (progress) => {
            reportStatus = (message) => progress.report({ message });
            return new Promise((resolve) => {
                finish = resolve;
            });
        });
        try {
            const index = await buildUsageIndex({
                roots: info.roots,
                libraries: info.libraries,
                sourceFiles: info.config.sourceFiles,
                fs,
                forceSJIS,
                cache: this.cache,
                onProgress: (progress) => {
                    const message = progressMessage(progress);
                    reportStatus(message);
                    this.progressEmitter.fire({ ...progress, message });
                },
                isCancelled: () => this.current !== entry,
            });
            if (index === null) {
                return null;
            }
            this.output.appendLine('[逆引きの索引] ' + index.stats.total + ' メンバー(読み込み ' + index.stats.read + ')' + (Date.now() - started) + ' ms');
            if (index.stats.read > 0) {
                this.save();
            }
            return index;
        } catch (error) {
            this.output.appendLine('[逆引きの索引] ' + (error && error.stack ? error.stack : error));
            return null;
        } finally {
            finish();
        }
    }
}

// 進み具合の文。例: 1200 / 5000 メンバー(読み込み 800)PRDLIB
export const progressMessage = (progress) => {
    if (progress.phase === 'list') {
        return 'メンバーを数えています… ' + progress.lib;
    }
    return progress.done + ' / ' + progress.total + ' メンバー(読み込み ' + progress.read + ')' + progress.lib;
};

// ---- ツリーの項目 ----
// node: shared/usageIndex.js の treeNodes の節 { entry, path(上の階層のメンバー), expandable }

const ICONS = { pgm: 'symbol-method', dds: 'database', dsp: 'window', lf: 'link', missing: 'warning' };

export const usageTreeItem = (node) => {
    const { entry } = node;
    const item = new vscode.TreeItem(entry.name, node.expandable ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
    const where = entry.member ? entry.member.lib + '/' + entry.member.file : '';
    item.description = [entry.use, entry.note, where].filter((s) => s).join('  ');
    item.iconPath = new vscode.ThemeIcon(ICONS[entry.kind] || 'file-code');
    if (entry.member) {
        item.tooltip = [entry.member.lib, entry.member.file, entry.member.member].join('/');
        item.command = { command: 'vscode.open', title: '開く', arguments: [entry.member.uri, { preview: true }] };
        item.contextValue = 'damcoFound';
    } else {
        item.tooltip = entry.name + ' : ソースが見つかりません';
    }
    return item;
};

// 呼び出しツリー: uri のメンバーが呼び出しているプログラム。path は上の階層
export const calleeNodes = async (usage, document, memberOrUri, path) => {
    const result = await usage.ensure(document);
    if (result === null) {
        return [];
    }
    let member = memberOrUri;
    if (memberOrUri instanceof vscode.Uri) {
        const text = memberOrUri.toString();
        member = result.index.members.find((m) => m.uri.toString() === text) || null;
    }
    if (member === null) {
        return [];
    }
    // 最初の階層(開いているソースの呼び出し先)から開いたときは、開いているソースも上の階層に数える
    const self = result.index.find(result.source);
    const base = path.length > 0 ? path : [...(self ? [memberKey(self)] : []), memberKey(member)];
    return treeNodes(calleeItems(result.index, member, result.config.libraryList), base);
};

class UsageTreeProvider {
    constructor(usage) {
        this.usage = usage;
        this.document = null;
        this.roots = [];
        this.onDidLoad = () => { };
        this.emitter = new vscode.EventEmitter();
        this.onDidChangeTreeData = this.emitter.event;
    }

    set(document) {
        this.document = document;
        this.roots = [];
        this.emitter.fire();
    }

    getTreeItem(node) {
        return usageTreeItem(node);
    }

    async getChildren(node) {
        const document = this.document;
        if (document === null) {
            return [];
        }
        const result = await this.usage.ensure(document);
        if (result === null || this.document !== document) {
            if (!node && this.document === document) {
                this.onDidLoad(null);
            }
            return [];
        }
        if (node) {
            return treeNodes(usageChildren(result.index, node.entry), node.path);
        }
        const self = result.index.find(result.source);
        this.roots = treeNodes(usageRoots(result.index, result.source), self ? [memberKey(self)] : []);
        this.onDidLoad(result);
        return this.roots;
    }
}

export const registerUsage = (context, service, output) => {
    const usage = new UsageService(context, service, output);
    context.subscriptions.push(usage.progressEmitter);
    const provider = new UsageTreeProvider(usage);
    const view = vscode.window.createTreeView('damco.usedBy', { treeDataProvider: provider });
    context.subscriptions.push(view);

    let shown = null;
    let shownKey = '';
    context.subscriptions.push(usage.onDidProgress((progress) => {
        if (view.visible && (progress.phase === 'list' || progress.done < progress.total)) {
            view.message = '索引を作成中… ' + progress.message;
        }
    }));
    provider.onDidLoad = (result) => {
        if (result === null) {
            view.description = undefined;
            view.message = 'ライブラリ / ソースファイル / メンバー の階層にあるソースで使えます';
            return;
        }
        const isProgram = !['dds', 'dsp'].includes(result.source.type);
        view.description = provider.roots.length + ' 件';
        const what = result.source.member + (isProgram ? ' を呼んでいるソース' : ' を使っているソース');
        const scope = '(ライブラリ: ' + result.libraries.join(', ') + ')';
        view.message = provider.roots.length === 0 ? what + 'は見つかりませんでした' + scope : what + scope;
    };

    // 一覧が見えているときだけ索引を作る(閉じている間は何もしない)
    const show = (document, force = false) => {
        shown = document && isDamcoDocument(document) ? document : null;
        if (!view.visible) {
            return;
        }
        // 同じソース・同じ状態なら出し直さない(開いた階層が閉じてしまうため)
        const info = shown === null ? null : usage.describe(shown);
        const key = shown === null ? '' : shown.uri.toString() + '|' + (info === null ? '' : info.key);
        if (key === shownKey && !force) {
            return;
        }
        shownKey = key;
        if (shown === null) {
            view.description = undefined;
            view.message = undefined;
        } else if (usage.peek(shown) === null) {
            view.message = '索引を作成中…';
        }
        provider.set(shown);
    };
    context.subscriptions.push(view.onDidChangeVisibility((e) => {
        if (e.visible) {
            show(shown, true);
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('damco.showUsedBy', () => vscode.commands.executeCommand('damco.usedBy.focus')));
    context.subscriptions.push(vscode.commands.registerCommand('damco.rebuildUsageIndex', () => {
        service.invalidate();
        usage.reset();
        show(shown, true);
    }));
    // 逆引きの一覧(最初の階層)をタブ区切りでクリップボードへ
    context.subscriptions.push(vscode.commands.registerCommand('damco.copyUsedBy', async () => {
        const text = provider.roots.map(({ entry }) => [entry.name, entry.use, entry.member.lib, entry.member.file, entry.note].join('\t') + '\n').join('');
        await vscode.env.clipboard.writeText(text);
        vscode.window.showInformationMessage(provider.roots.length + ' 件をコピーしました。');
    }));

    return { usage, provider, view, show, refresh: () => show(shown) };
};
