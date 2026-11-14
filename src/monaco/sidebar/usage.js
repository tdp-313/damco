// サイドバーの「逆引き」: 開いているソースを使っている(呼んでいる)ソースと、呼び出しツリー。
// 索引はこのタブを開いたときに初めて、Web Worker(webworker/usage_worker.js)で作る。
// 調べるのは、開いているソースのライブラリリストのライブラリ(File・PGM のタブと同じ範囲)。
// 画面を止めないよう、ツリーは開いた階層だけ作る。
import { UsageIndex, usageRoots, usageChildren, calleeItems, memberKey, treeNodes, isProgram } from "../../../shared/usageIndex.js";
import { categoryOf, resolveSearchLibraries } from "../../../shared/sourceFiles.js";
import { monaco_handleName, monaco_handleName_RefMaster } from "../../root.js";
import { linkStatus } from "../file/directory.js";
import { Setting } from "../../setting.js";
import { sourceTypeOfFile, fileTypeGet2 } from "../file/fileType.js";
import { fileOpen } from "../webworker/fileOpen.js";
import { addIndent, addSpaces } from "../file/text_extend.js";
import { createURI, modelChange } from "../textmodel.js";
import { tabs_add } from "../../tabs.js";
import { themeCSS_FilterStyle } from "../theme/theme.js";

import reload_svg from "../../icon/reload.svg"
import pencil_svg from "../../icon/pencil.svg"

let worker = null;
let requestId = 0;
let current = null; // { id, key, index, stale, error, waiting: [], onProgress }
let renderToken = 0;

const getWorker = () => {
    if (worker === null) {
        worker = new Worker(new URL('../webworker/usage_worker.js', import.meta.url), { type: 'module' });
        worker.addEventListener('message', (e) => {
            if (current === null || e.data.id !== current.id) {
                return;
            }
            if (e.data.type === 'progress') {
                current.onProgress(e.data);
            } else if (e.data.type === 'done') {
                current.index = new UsageIndex(e.data.members, e.data.stats);
                current.waiting.splice(0).forEach((resolve) => resolve(current.index));
            } else if (e.data.type === 'error') {
                console.error(e.data.message);
                current.error = e.data.message;
                current.waiting.splice(0).forEach((resolve) => resolve(null));
            }
        });
    }
    return worker;
};

// 探すルート。参照先の検索(ref/new_init.js)と同じ: メインのソースならメインと RefMaster、RefMaster のソースなら RefMaster
const rootsOf = (rootName) => {
    const names = rootName === monaco_handleName ? [monaco_handleName, monaco_handleName_RefMaster] : rootName === monaco_handleName_RefMaster ? [monaco_handleName_RefMaster] : [];
    return names.filter((name) => linkStatus[name] && linkStatus[name].handle).map((name) => ({ name, handle: linkStatus[name].handle }));
};

// 索引を(必要なら作って)返す。libraries: 調べるライブラリ。reset: 覚えた結果を捨てて全部読み直す
const ensureIndex = (roots, libraries, onProgress, reset = false) => {
    const key = roots.map((r) => r.name).join('|') + '|' + JSON.stringify(libraries);
    if (current !== null && current.key === key && !current.stale && !reset) {
        current.onProgress = onProgress;
        return current.index ? Promise.resolve(current.index) : new Promise((resolve) => current.waiting.push(resolve));
    }
    if (current !== null) {
        current.waiting.splice(0).forEach((resolve) => resolve(null));
    }
    const entry = { id: ++requestId, key, index: null, stale: false, error: null, waiting: [], onProgress };
    current = entry;
    getWorker().postMessage({ type: 'build', id: entry.id, roots, libraries, reset });
    return new Promise((resolve) => entry.waiting.push(resolve));
};

// 再読み込み(ツールバー)のあとは、次に出すときに変わったメンバーを読み直す
export const markUsageStale = () => {
    if (current !== null) {
        current.stale = true;
    }
};

// 索引のメンバーを別のタブで開く
const openMember = async (member) => {
    try {
        const root = linkStatus[member.root].handle;
        const lib = await root.getDirectoryHandle(member.lib);
        const file = await lib.getDirectoryHandle(member.file);
        const handle = await file.getFileHandle(member.name);
        const raw = await fileOpen(handle, Setting.isForceSJIS);
        let lang = fileTypeGet2(member.file, true);
        const text = lang.indexOf('indent') !== -1 ? addIndent(raw.text) : addSpaces(raw.text);
        const uri = await createURI(member.root, member.lib, member.file, member.member, raw.ext + '__' + raw.timestamp, lang);
        await tabs_add(await modelChange(text, lang, uri), true);
    } catch (error) {
        console.error(error);
        window.alert(member.lib + '/' + member.file + '/' + member.member + ' を開けませんでした');
    }
};

const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) {
        node.className = className;
    }
    if (text !== undefined) {
        node.textContent = text;
    }
    return node;
};

// 種類のラベル(色は monaco.css の .usage-type-*)
const TYPE_LABEL = { rpg: 'RPG', rpgle: 'RPGLE', cl: 'CL', dds: 'DDS', dsp: 'DSPF', lf: 'LF', missing: '?' };
const typeOf = (entry) => (entry.kind === 'pgm' ? entry.member.type : entry.kind);
const IO_CLASS = { 'U/O': 'usage-io-o', 'I/O': 'usage-io-o', O: 'usage-io-o', U: 'usage-io-u', I: 'usage-io-i' };

// 一度に開く上限(「すべて開く」で大きなツリーを開いても固まらないように)
const EXPAND_DEPTH = 8;
const EXPAND_NODES = 400;
// 一度に出す件数
const PAGE_SIZE = 200;

// 1 つの節(カード)と、その下の階層(開いたときに作る)。戻り値: { element, expand(depth, budget), collapse() }
const createNode = (node, childrenOf) => {
    const { entry } = node;
    const type = typeOf(entry);
    const wrap = el('div', 'usage-node');
    const row = el('div', 'usage-row' + (entry.member ? '' : ' usage-missing') + (IO_CLASS[entry.use] ? ' ' + IO_CLASS[entry.use] : ''));
    const caret = el('span', 'usage-caret' + (node.expandable ? '' : ' usage-leaf'), node.expandable ? '›' : '');
    const main = el('span', 'usage-main');
    main.append(el('span', 'usage-name', entry.name));
    main.append(el('span', 'usage-where', entry.member ? entry.member.lib + ' / ' + entry.member.file : 'ソースが見つかりません'));
    const badges = el('span', 'usage-badges');
    if (entry.use) {
        badges.append(el('span', 'usage-chip usage-chip-io', entry.use));
    }
    if (entry.note && entry.kind !== 'missing') {
        badges.append(el('span', 'usage-chip', entry.note === '(循環)' ? '↻ 循環' : entry.note));
    }
    row.append(caret, el('span', 'usage-type usage-type-' + type, TYPE_LABEL[type] || type), main, badges);
    row.title = entry.member ? [entry.member.lib, entry.member.file, entry.member.member].join('/') : entry.name;
    wrap.append(row);

    let children = null;
    let childNodes = [];
    const open = () => {
        if (!node.expandable) {
            return false;
        }
        if (children === null) {
            children = el('div', 'usage-children');
            childNodes = childrenOf(node).map((child) => createNode(child, childrenOf));
            children.append(...childNodes.map((child) => child.element));
            wrap.append(children);
        }
        children.classList.remove('displayHide');
        caret.classList.add('usage-open');
        return true;
    };
    const collapse = () => {
        if (children !== null) {
            children.classList.add('displayHide');
            caret.classList.remove('usage-open');
            childNodes.forEach((child) => child.collapse());
        }
    };
    const expand = (depth, budget) => {
        if (depth <= 0 || budget.left <= 0 || !open()) {
            return;
        }
        budget.left -= childNodes.length;
        childNodes.forEach((child) => child.expand(depth - 1, budget));
    };
    caret.addEventListener('click', (e) => {
        e.stopPropagation();
        if (caret.classList.contains('usage-open')) {
            collapse();
        } else {
            open();
        }
    });
    row.addEventListener('click', (e) => {
        e.stopPropagation();
        if (entry.member) {
            openMember(entry.member);
        }
    });
    return { element: wrap, expand, collapse };
};

const textButton = (label, onClick) => {
    const button = el('button', 'usage-button', label);
    button.addEventListener('click', (e) => {
        e.stopPropagation();
        onClick(button);
    });
    return button;
};

// 見出しと、その下の節。rootLabel を渡すと、開いているソースを根にしたツリーにする
const createSection = ({ title, nodes, childrenOf, emptyText, root = null }) => {
    const section = el('div', 'usage-section');
    const head = el('div', 'usage-title');
    // 件数が多いときは、最初の分だけ作る(残りは「さらに表示」で足す)
    const items = [];
    head.append(el('span', 'usage-title-text', title), el('span', 'usage-count', String(nodes.length)));
    if (nodes.some((node) => node.expandable)) {
        let opened = false;
        head.append(textButton('すべて開く', (button) => {
            opened = !opened;
            if (opened) {
                const budget = { left: EXPAND_NODES };
                items.forEach((item) => item.expand(EXPAND_DEPTH, budget));
            } else {
                items.forEach((item) => item.collapse());
            }
            button.textContent = opened ? 'すべて閉じる' : 'すべて開く';
        }));
    }
    section.append(head);
    let list = section;
    if (root !== null) {
        const rootRow = el('div', 'usage-row usage-root');
        const main = el('span', 'usage-main');
        main.append(el('span', 'usage-name', root.name), el('span', 'usage-where', root.where));
        rootRow.append(el('span', 'usage-type usage-type-' + root.type, TYPE_LABEL[root.type] || root.type), main);
        section.append(rootRow);
        list = el('div', 'usage-children');
        section.append(list);
    }
    if (nodes.length === 0) {
        list.append(el('div', 'usage-empty', emptyText));
    }
    const more = textButton('', () => showMore());
    more.classList.add('usage-more');
    const showMore = () => {
        const added = nodes.slice(items.length, items.length + PAGE_SIZE).map((node) => createNode(node, childrenOf));
        items.push(...added);
        more.before(...added.map((item) => item.element));
        const rest = nodes.length - items.length;
        more.textContent = 'さらに表示(残り ' + rest.toLocaleString() + ' 件)';
        more.classList.toggle('displayHide', rest <= 0);
    };
    list.append(more);
    showMore();
    return section;
};

const iconButton = (src, title, onClick) => {
    const button = el('img', 'refSize control-iconButton hoverButton');
    button.src = src;
    button.title = title;
    button.style.filter = themeCSS_FilterStyle();
    button.addEventListener('click', (e) => {
        e.stopPropagation();
        onClick();
    });
    return button;
};

// 索引を作っている間の進み具合。全体のバーと、ライブラリごとのバー
const createProgress = () => {
    const box = el('div', 'usage-progress');
    const head = el('div', 'usage-progress-head');
    const label = el('span', '', '索引を作成中…');
    const count = el('span', 'usage-progress-count', '');
    head.append(label, count);
    const bar = el('div', 'usage-bar');
    const fill = el('div', 'usage-bar-fill usage-bar-wait');
    bar.append(fill);
    const list = el('div', 'usage-progress-libs');
    box.append(head, bar, list);
    const rows = new Map();
    const update = (progress) => {
        if (progress.phase === 'list') {
            label.textContent = 'メンバーを数えています… ' + progress.lib;
            return;
        }
        label.textContent = '索引を作成中… ' + progress.lib;
        count.textContent = progress.done.toLocaleString() + ' / ' + progress.total.toLocaleString() + (progress.read > 0 ? '(読み込み ' + progress.read.toLocaleString() + ')' : '');
        fill.classList.remove('usage-bar-wait');
        fill.style.width = (progress.total === 0 ? 100 : Math.round(progress.done / progress.total * 100)) + '%';
        for (const library of progress.libraries) {
            const key = library.root + '/' + library.lib;
            if (!rows.has(key)) {
                const row = el('div', 'usage-progress-lib');
                const name = el('span', 'usage-progress-name', library.lib);
                name.title = key;
                const libBar = el('div', 'usage-bar usage-bar-small');
                const libFill = el('div', 'usage-bar-fill');
                libBar.append(libFill);
                const libCount = el('span', 'usage-progress-count');
                row.append(name, libBar, libCount);
                list.append(row);
                rows.set(key, { row, libFill, libCount });
            }
            const { row, libFill, libCount } = rows.get(key);
            const finished = library.done >= library.total;
            libFill.style.width = (library.total === 0 ? 100 : Math.round(library.done / library.total * 100)) + '%';
            libCount.textContent = finished ? '✓ ' + library.total.toLocaleString() : library.done.toLocaleString() + ' / ' + library.total.toLocaleString();
            row.classList.toggle('usage-progress-done', finished);
        }
    };
    return { element: box, update };
};

// サイドバーの中身を作る。model は開いているソース
export const renderUsage = async (container, model, reset = false) => {
    const token = ++renderToken;
    container.innerHTML = '';
    const panel = el('div', 'usage-panel');
    const status = el('div', 'usage-status');
    panel.append(status);
    container.append(panel);
    if (!model || !model.otherData || !model.otherData.uri_parse) {
        status.textContent = 'ソースを開くと、それを使っているソースが出ます';
        return;
    }
    const where = model.otherData.uri_parse;
    const type = sourceTypeOfFile(where.file);
    const roots = rootsOf(where.root);
    if (type === null || roots.length === 0) {
        status.textContent = 'このソースは逆引きの対象外です';
        return;
    }
    const libraries = resolveSearchLibraries(where.lib, Setting.libraryList);
    const progress = createProgress();
    panel.append(progress.element);
    const index = await ensureIndex(roots, libraries, (data) => {
        if (token === renderToken) {
            progress.update(data);
        }
    }, reset);
    if (token !== renderToken) {
        return;
    }
    progress.element.remove();
    if (index === null) {
        status.textContent = '索引を作れませんでした' + (current && current.error ? '(' + current.error + ')' : '');
        return;
    }
    const source = { type, member: where.member, lib: where.lib, file: where.file };
    const self = index.find({ root: where.root, ...source });
    const selfPath = self ? [memberKey(self)] : [];
    const program = categoryOf(type) === 'pgm';

    const users = treeNodes(usageRoots(index, source), selfPath);
    status.textContent = '';
    const scope = el('span', 'usage-scope', 'ライブラリ: ' + libraries.join(', ') + '(' + index.stats.total + ' メンバー)');
    scope.title = 'ライブラリリストのライブラリを調べます(設定の Library List)';
    status.append(
        scope,
        iconButton(pencil_svg, '逆引きの結果をコピー(タブ区切り)', () => {
            const text = users.map(({ entry }) => [entry.name, entry.use, entry.member.lib, entry.member.file, entry.note].join('\t') + '\n').join('');
            navigator.clipboard.writeText(text);
            window.alert("Copied to clipboard!");
        }),
        iconButton(reload_svg, '索引を作り直す(全部読み直す)', () => renderUsage(container, model, true)),
    );
    panel.append(createSection({
        title: program ? '呼び出し元' : '使っているソース',
        nodes: users,
        childrenOf: (node) => treeNodes(usageChildren(index, node.entry), node.path),
        emptyText: where.member + (program ? ' を呼んでいるソースはありません' : ' を使っているソースはありません'),
    }));
    if (program && self) {
        const libraryList = Setting.libraryList;
        panel.append(createSection({
            title: '呼び出しツリー',
            nodes: treeNodes(calleeItems(index, self, libraryList), selfPath),
            childrenOf: (node) => (node.entry.member && isProgram(node.entry.member) ? treeNodes(calleeItems(index, node.entry.member, libraryList), node.path) : []),
            emptyText: '呼び出しているプログラムはありません',
            root: { name: where.member, where: where.lib + ' / ' + where.file, type },
        }));
    }
};
