// 逆引きの索引。「このファイルを使っているソース」「このプログラムを呼んでいるソース」と、
// 呼び出しツリー(呼び出し先の、さらに呼び出し先)を出すために、ルートの全メンバーを 1 回ずつ読んで作る。
//
// 重くならないようにしていること
//   - 索引に残すのは名前だけ(ファイル名・I/U/O・呼び出し先)。ソースの中身は持たない
//   - 読むのはライブラリリストのライブラリだけ(使用ファイルの一覧と同じ範囲)
//   - メンバーごとの結果をキャッシュし、変わったメンバーだけ読み直す(cache と fs.stamp)
//   - 作るのは必要になったとき(逆引きの一覧を出したとき・ツリーを開いたとき)。呼び出し側が決める
//   - ツリーは開いた階層だけ索引を引く(索引ができていれば、引くのはメモリの中だけ)
//
// フォルダの読み方(fs)は refSearch.js と同じ。加えて、あれば使うもの:
//   fs.key(ref)   → キャッシュのキー(文字列)。なければキャッシュしない
//   fs.stamp(ref) → 更新日時とサイズなど、中身が変わると変わる値。なければキーがある限り読み直さない
import { createRefList, createRefList_rpgle } from '../src/monaco/ref/refList.js';
import { decodeText } from '../src/monaco/webworker/fileOpen.js';
import { addIndent } from '../src/monaco/file/text_extend.js';
import { parseCl } from '../src/monaco/lang/cl/clParse.js';
import { matchSearchName, resolveSourceType, categoryOf, resolveSearchLibraries, stripExtension } from './sourceFiles.js';

const upper = (name) => String(name).toUpperCase();

const ioString = (io) => ['I', 'U', 'O'].filter((c) => io.has(c)).join('');

// ライブラリ修飾(LIB/NAME)と引用符を外す。変数(&PGM)や特殊値(*LIBL)は対象にしない
const objectName = (text) => {
    const name = upper(text).trim().replace(/^'|'$/g, '').split('/').pop().trim();
    return /^[A-Z#@$¥][A-Z0-9#@$¥_.]*$/.test(name) ? name : null;
};

// メンバーごとの結果(scanSource)の形・読み方を変えたら上げる。覚えておいた古い結果は使わずに読み直す
const SCAN_VERSION = 2;

// CL: CALL PGM(...) と DCLF FILE(...)。SBMJOB CMD(CALL PGM(...)) の中の CALL も拾う。
// 解析は、使用ファイルの一覧・定義へ移動と同じ(clParse.js)。
// DCLF のファイルは、表示装置ファイルなら入出力、そうでなければ入力。どちらかは一覧に出すときに決める(device: 'DCLF')
const scanCl = (text) => {
    const parsed = parseCl(text.split(/\r\n|\r|\n/));
    const files = new Map();
    for (const file of parsed.files) {
        files.set(file.name, { name: file.name, io: 'I', device: 'DCLF' });
    }
    return { files: [...files.values()], programs: [...new Set(parsed.programs.map((p) => p.name))], based: [] };
};

// DDS: 論理ファイルの元の物理ファイル(PFILE / JFILE)
const scanDds = (text) => {
    const based = new Set();
    for (const row of text.split(/\r\n|\r|\n/)) {
        if (row.substring(5, 6) !== 'A' || row.substring(6, 7) === '*') {
            continue;
        }
        for (const m of row.substring(44).matchAll(/\b[PJ]FILE\(([^)]*)\)/gi)) {
            for (const part of m[1].split(/\s+/)) {
                const name = objectName(part);
                if (name !== null) {
                    based.add(name);
                }
            }
        }
    }
    return { files: [], programs: [], based: [...based] };
};

// 1 つのメンバーが使っているファイル・呼び出しているプログラム。
// RPG III / RPGLE は、使用ファイルの一覧(サイドバー)と同じ解析を使うので、結果は一覧と一致する
export const scanSource = (type, text) => {
    if (type === 'cl') {
        return scanCl(text);
    }
    if (type === 'dds' || type === 'dsp') {
        return scanDds(text);
    }
    if (type !== 'rpg' && type !== 'rpgle') {
        return { files: [], programs: [], based: [] };
    }
    const refList = type === 'rpg' ? createRefList(addIndent(text).split(/\r\n|\r|\n/)) : createRefList_rpgle(text.split(/\r\n|\r|\n/));
    const files = [];
    for (const category of ['dsp', 'dds']) {
        for (const [name, value] of refList[category]) {
            if (name !== '') {
                files.push({ name: upper(name), io: ioString(value.use.io), device: value.use.device });
            }
        }
    }
    const programs = [];
    for (const name of refList.pgm.keys()) {
        const program = objectName(name);
        if (program !== null && !programs.includes(program)) {
            programs.push(program);
        }
    }
    return { files, programs, based: [] };
};

const byName = (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);

// 同時に読む数を抑えて並べて処理する
const mapLimit = async (items, limit, fn) => {
    let next = 0;
    const worker = async () => {
        while (next < items.length) {
            const index = next++;
            await fn(items[index], index);
        }
    };
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
};

// ルートの全メンバーを読んで索引を作る。
//   roots: [{ name, ref }]
//   libraries: 読むライブラリ(ライブラリリスト。% のワイルドカード可)。null なら全部のライブラリ
//   cache: Map(キー → { stamp, scan })。呼び出し側が持ち続けると、2 回目からは変わったメンバーだけ読む
//   onProgress(進み具合)、isCancelled() は省略できる。進み具合:
//     { phase: 'list', lib }                     メンバーを数えている(lib は数えているライブラリ)
//     { phase: 'read', done, total, read, lib, libraries: [{ root, lib, done, total }] }
//                                                done / total: 確認したメンバー、read: そのうち中身を読んだ数、lib: 読んでいるライブラリ
// 取り消されたときは null
export const buildUsageIndex = async ({ roots, sourceFiles, fs, libraries = null, forceSJIS = false, cache = null, onProgress = null, isCancelled = null, concurrency = 16 }) => {
    const targets = [];
    const scanned = []; // 読んだソースファイル(フォルダ)のキー
    const inList = (name) => libraries === null || libraries.some((searchName) => matchSearchName(name, searchName));
    for (const root of roots) {
        for (const library of (await fs.list(root.ref)).filter((e) => e.isDirectory && inList(e.name)).sort(byName)) {
            if (onProgress) {
                onProgress({ phase: 'list', lib: library.name });
            }
            for (const file of (await fs.list(library.ref)).filter((e) => e.isDirectory).sort(byName)) {
                const type = resolveSourceType(file.name, sourceFiles);
                if (type === null) {
                    continue;
                }
                if (cache && fs.key) {
                    scanned.push(fs.key(file.ref));
                }
                for (const entry of (await fs.list(file.ref)).filter((e) => !e.isDirectory).sort(byName)) {
                    targets.push({ root: root.name, lib: library.name, file: file.name, member: stripExtension(entry.name), name: entry.name, type, ref: entry.ref });
                }
            }
            if (isCancelled && isCancelled()) {
                return null;
            }
        }
    }

    const members = new Array(targets.length);
    const used = new Set();
    let done = 0;
    let read = 0;
    let cancelled = false;
    // ライブラリごとの進み具合(ルートが違えば別に数える)
    const perLibrary = new Map();
    for (const target of targets) {
        const key = target.root + '/' + target.lib;
        if (!perLibrary.has(key)) {
            perLibrary.set(key, { root: target.root, lib: target.lib, done: 0, total: 0 });
        }
        perLibrary.get(key).total++;
    }
    let reported = 0;
    const report = (lib, force) => {
        const now = Date.now();
        if (onProgress && (force || now - reported >= 80)) {
            reported = now;
            onProgress({ phase: 'read', done, total: targets.length, read, lib, libraries: [...perLibrary.values()].map((l) => ({ ...l })) });
        }
    };
    report(targets.length > 0 ? targets[0].lib : '', true);
    await mapLimit(targets, concurrency, async (target, index) => {
        if (cancelled || (isCancelled && isCancelled())) {
            cancelled = true;
            return;
        }
        const key = cache && fs.key ? fs.key(target.ref) : null;
        let scan = null;
        let stamp = null;
        try {
            if (key !== null) {
                used.add(key);
                stamp = fs.stamp ? await fs.stamp(target.ref) : '';
                const cached = cache.get(key);
                if (cached && cached.stamp === stamp && cached.type === target.type && cached.version === SCAN_VERSION) {
                    scan = cached.scan;
                }
            }
            if (scan === null) {
                const { text } = decodeText(await fs.read(target.ref), forceSJIS);
                scan = scanSource(target.type, text);
                read++;
                if (key !== null) {
                    cache.set(key, { stamp, type: target.type, version: SCAN_VERSION, scan });
                }
            }
        } catch {
            // 読めないメンバーは、何も使っていないものとして索引に入れる
            scan = { files: [], programs: [], based: [] };
        }
        members[index] = { ...target, uri: fs.toUri(target.ref), files: scan.files, programs: scan.programs, based: scan.based };
        done++;
        perLibrary.get(target.root + '/' + target.lib).done++;
        report(target.lib, done === targets.length);
    });
    if (cancelled) {
        return null;
    }
    // なくなったメンバーのキャッシュを捨てる(今回読んだフォルダの分だけ。ほかのライブラリの分は次に使うので残す)
    if (cache && fs.key) {
        const inScanned = (key) => scanned.some((dir) => key.startsWith(dir) && '/\\'.includes(key.charAt(dir.length)));
        for (const key of [...cache.keys()]) {
            if (!used.has(key) && inScanned(key)) {
                cache.delete(key);
            }
        }
    }
    return new UsageIndex(members, { read });
};

const push = (map, key, value) => {
    if (map.has(key)) {
        map.get(key).push(value);
    } else {
        map.set(key, [value]);
    }
};

export const isProgram = (member) => categoryOf(member.type) === 'pgm';

export class UsageIndex {
    constructor(members, stats = {}) {
        this.members = members;
        this.stats = { total: members.length, read: stats.read || 0 };
        this.byName = new Map(); // メンバー名 → メンバー
        this.fileUsers = new Map(); // ファイル名 → [{ member, io, device }]
        this.callers = new Map(); // プログラム名 → メンバー
        this.logicals = new Map(); // 物理ファイル名 → 論理ファイルのメンバー
        for (const member of members) {
            push(this.byName, upper(member.member), member);
            for (const file of member.files) {
                push(this.fileUsers, file.name, { member, io: file.io, device: file.device });
            }
            for (const program of member.programs) {
                push(this.callers, program, member);
            }
            for (const name of member.based) {
                push(this.logicals, name, member);
            }
        }
    }

    // 場所(ルート・ライブラリ・ソースファイル・メンバー名)から索引のメンバーを探す
    find({ root, lib, file, member }) {
        const list = this.byName.get(upper(member)) || [];
        return list.find((m) => (root === undefined || m.root === root) && upper(m.lib) === upper(lib) && upper(m.file) === upper(file)) || null;
    }

    // このファイルを使っているソース(F 仕様書・DCL-F・DCLF)
    usersOfFile(name) {
        return this.fileUsers.get(upper(name)) || [];
    }

    // この物理ファイルを元にしている論理ファイル
    logicalsOf(name) {
        return this.logicals.get(upper(name)) || [];
    }

    // このプログラムを呼んでいるソース
    callersOf(name) {
        return this.callers.get(upper(name)) || [];
    }

    // 名前からメンバーを 1 つ決める。from のライブラリリストの順に探し、なければ見つかったもの
    resolve(name, categories, from = null, libraryList = null) {
        const candidates = (this.byName.get(upper(name)) || []).filter((m) => categories.includes(categoryOf(m.type)));
        if (candidates.length <= 1 || from === null) {
            return candidates[0] || null;
        }
        const sameRoot = candidates.filter((m) => m.root === from.root);
        for (const pool of [sameRoot, candidates]) {
            for (const searchName of resolveSearchLibraries(from.lib, libraryList)) {
                const hit = pool.find((m) => matchSearchName(m.lib, searchName));
                if (hit) {
                    return hit;
                }
            }
        }
        return sameRoot[0] || candidates[0];
    }

    // このメンバーが呼び出しているプログラム。target は見つかったメンバー(なければ null)
    calleesOf(member, libraryList = null) {
        return member.programs.map((name) => ({ name, target: this.resolve(name, ['pgm'], member, libraryList) }));
    }

    // このメンバーが使っているファイル
    filesOf(member, libraryList = null) {
        return member.files.map((file) => ({ ...file, target: this.resolve(file.name, ['dds', 'dsp'], member, libraryList) }));
    }
}

// ---- 一覧(ツリー)に出す項目。Web 版と VS Code 拡張機能で同じ内容にする ----
// 項目: { name, member(なければ null), use, kind, note, expandable }
//   kind: 'pgm' | 'dds' | 'dsp' | 'lf'(論理ファイル経由) | 'missing'(ソースが見つからない)

const kindOf = (member) => (isProgram(member) ? 'pgm' : member.type);

const useLabel = (io) => {
    if (io.includes('U') && io.includes('O')) {
        return 'U/O';
    } else if (io.includes('I') && io.includes('O')) {
        return 'I/O';
    }
    return io;
};

const memberItem = (member, extra = {}) => ({ name: member.member, member, use: '', kind: kindOf(member), note: '', expandable: false, ...extra });

const sortItems = (items) => items.sort((a, b) => byName(a, b) || (a.member && b.member ? byName({ name: a.member.lib }, { name: b.member.lib }) : 0));

// 逆引きの最初の階層。開いているソースの種類で内容が変わる
//   DDS・表示装置: 使っているソース(I/U/O)。物理ファイルなら、それを元にした論理ファイルも(開くとその論理ファイルを使っているソース)
//   プログラム: 呼び出しているソース
export const usageRoots = (index, source) => {
    const category = categoryOf(source.type);
    if (category === null) {
        return [];
    }
    if (category === 'pgm') {
        return callerItems(index, source.member);
    }
    const items = fileUserItems(index, source.member, category === 'dsp');
    for (const logical of index.logicalsOf(source.member)) {
        const count = index.usersOfFile(logical.member).length;
        items.push(memberItem(logical, { kind: 'lf', note: '論理ファイル', expandable: count > 0, count }));
    }
    return items;
};

// display: 表示装置ファイルを使っているソースの一覧か(CL の DCLF は、表示装置ファイルなら I/O)
const fileUserItems = (index, name, display = false) => sortItems(index.usersOfFile(name).map((user) => memberItem(user.member, {
    use: useLabel(display && user.device === 'DCLF' ? 'IO' : user.io),
    expandable: isProgram(user.member) && index.callersOf(user.member.member).length > 0,
})));

const callerItems = (index, name) => sortItems(index.callersOf(name).map((member) => memberItem(member, {
    expandable: index.callersOf(member.member).length > 0,
})));

// 逆引きの項目を開いたとき。論理ファイルならそれを使っているソース、プログラムならそれを呼んでいるソース
export const usageChildren = (index, item) => {
    if (item.member === null) {
        return [];
    }
    return item.kind === 'lf' ? fileUserItems(index, item.member.member) : callerItems(index, item.member.member);
};

// 呼び出しツリーの 1 階層。member が呼び出しているプログラム
export const calleeItems = (index, member, libraryList = null) => index.calleesOf(member, libraryList).map(({ name, target }) => {
    if (target === null) {
        return { name, member: null, use: '', kind: 'missing', note: 'Not Found', expandable: false };
    }
    return memberItem(target, { name, expandable: target.programs.length > 0 });
});

// 同じメンバーが上の階層にあるか(A → B → A のような循環を止めるため)
export const memberKey = (member) => [member.root, upper(member.lib), upper(member.file), upper(member.member)].join('/');

// 項目をツリーの節にする。path は上の階層のメンバー。上の階層にあるメンバーは「(循環)」として、それ以上開かない
//   節: { entry, path, expandable }
export const treeNodes = (entries, path) => entries.map((entry) => {
    const key = entry.member ? memberKey(entry.member) : null;
    const cyclic = key !== null && path.includes(key);
    return {
        entry: cyclic ? { ...entry, note: '(循環)' } : entry,
        path: key === null ? path : [...path, key],
        expandable: entry.expandable && !cyclic,
    };
});
