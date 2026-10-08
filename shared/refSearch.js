// 開いているソースが使っているファイル・呼び出しているプログラムを、ライブラリのフォルダから探して定義を作る。
// Web 版の src/monaco/ref/refDefWorker.js と new_init.js を、フォルダの読み方を差し替えられる形にしたもの。
//
// フォルダの構成は Web 版と同じ: ルート / ライブラリ / ソースファイル / メンバー
// フォルダの読み方(fs)は呼び出し側が渡す:
//   fs.list(ref)  → [{ name, isDirectory, ref }]   フォルダの中身
//   fs.read(ref)  → Uint8Array                     ファイルの中身
//   fs.toUri(ref) → 定義の位置(location.uri)に入れる値
//
// Web 版との違い
//   - ソースファイル名(QRPGSRC など)は設定(sourceFiles)で決める。既定は完全一致
//   - ライブラリはライブラリリストの順に探す(同じメンバーが複数あればリストの前の方を使う)
//   - ライブラリ・ソースファイル・メンバーの名前は大文字・小文字を区別しない
import { createRefList, createRefList_rpgle } from '../src/monaco/ref/refList.js';
import { UseIO_Layout } from '../src/monaco/ref/other.js';
import { decodeText } from '../src/monaco/webworker/fileOpen.js';
import { addIndent, addSpaces } from '../src/monaco/file/text_extend.js';
import { pgm_nameGet } from '../src/monaco/lang/pgmName.js';
import { dds_DefinitionList } from '../src/monaco/ref/dds_newRefDef.js';
import { matchSearchName, resolveSourceType, categoryOf } from './sourceFiles.js';
import { TextModel } from './textModel.js';

export const stripExtension = (name) => name.replace(/\.[^/.]+$/, '');

// 探すライブラリ。設定のライブラリリストにあればそれを、なければ「自分」と「先頭 3 文字を含むもの」
export const resolveSearchLibraries = (lib, libraryList) => {
    const setting = libraryList && Array.isArray(libraryList[lib]) ? libraryList[lib] : [];
    if (setting.length !== 0) {
        return [...setting];
    }
    return [lib, '%' + lib.substring(0, 3) + '%'];
};

const selfEntry = (name) => {
    return { name: name, use: new UseIO_Layout(false), isFound: false, data: {}, uri_path: {}, isRegExpFound: false };
};

// 開いているソースから、探す対象の一覧(refListFile)を作る。
// RPG III はインデント済みの行(addIndent の結果)を渡す
export const createRefListFile = (sourceType, member, lines) => {
    switch (sourceType) {
        case 'rpg':
            return createRefList(lines);
        case 'rpgle':
            return createRefList_rpgle(lines);
        case 'dds':
            return { dds: new Map([[member, selfEntry(member)]]), dsp: new Map(), pgm: new Map() };
        case 'dsp':
            return { dds: new Map(), dsp: new Map([[member, selfEntry(member)]]), pgm: new Map() };
        default:
            return null;
    }
};

const byName = (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
const directories = (entries) => entries.filter((e) => e.isDirectory).sort(byName);
const files = (entries) => entries.filter((e) => !e.isDirectory).sort(byName);

// 名前の大文字・小文字を区別せずに探す
const findKey = (map, name) => {
    if (map.has(name)) {
        return name;
    }
    const upper = name.toUpperCase();
    for (const key of map.keys()) {
        if (key.toUpperCase() === upper) {
            return key;
        }
    }
    return null;
};

const splitString = (inputString, divRegExp) => {
    const match = inputString.match(new RegExp(divRegExp));
    return match ? [...match].map((m) => (m === undefined ? '' : m)) : [];
};

// refListFile の各項目に、見つかったメンバーの中身(data)と場所(uri_path, uri)を入れる
export const searchReferences = async ({ refListFile, roots, searchLibName, sourceFiles, regExp = {}, fs, forceSJIS = false }) => {
    const load = async (entry) => {
        const { text } = decodeText(await fs.read(entry.ref), forceSJIS);
        return { text: text, textArray: text.split(/\r\n|\r|\n/), handle: { name: entry.name } };
    };
    const found = (value, libFile, entry, data, flag) => {
        value.data = data;
        value.uri_path = { root: libFile.root, lib: libFile.lib, file: libFile.file, member: stripExtension(entry.name) };
        value.uri = fs.toUri(entry.ref);
        value[flag] = true;
    };

    // Root-Lib(ライブラリリストの順)
    const rootEntries = [];
    for (const root of roots) {
        rootEntries.push(directories(await fs.list(root.ref)));
    }
    const libraries = [];
    const seen = new Set();
    for (const searchName of searchLibName) {
        for (let r = 0; r < roots.length; r++) {
            for (const entry of rootEntries[r]) {
                const key = roots[r].name + '/' + entry.name.toUpperCase();
                if (!seen.has(key) && matchSearchName(entry.name, searchName)) {
                    seen.add(key);
                    libraries.push({ ref: entry.ref, root: roots[r].name, lib: entry.name });
                }
            }
        }
    }

    // Lib-File
    const libFiles = [];
    const ddsFiles = [];
    for (const library of libraries) {
        for (const entry of directories(await fs.list(library.ref))) {
            const category = categoryOf(resolveSourceType(entry.name, sourceFiles));
            if (category === null || refListFile[category].size === 0) {
                continue;
            }
            const libFile = { ref: entry.ref, root: library.root, lib: library.lib, file: entry.name, type: category };
            libFiles.push(libFile);
            if (category === 'dds') {
                ddsFiles.push(libFile);
            }
        }
    }

    // File-Member
    const fileMembers = [];
    const useRegExp = typeof regExp.div === 'string' && regExp.div !== '' && typeof regExp.search === 'string' && regExp.search !== '';
    for (const libFile of libFiles) {
        const list = refListFile[libFile.type];
        for (const entry of files(await fs.list(libFile.ref))) {
            const member = stripExtension(entry.name);
            const key = findKey(list, member);
            if (key !== null) {
                const value = list.get(key);
                if (!value.isFound) { // 完全一致
                    found(value, libFile, entry, await load(entry), 'isFound');
                    fileMembers.push({ type: libFile.type, searchKey: key, value });
                }
            } else if (useRegExp) {
                // 部分一致があればそれを採用
                for (const [searchKey, value] of list) {
                    if (value.isFound || value.isRegExpFound) {
                        continue;
                    }
                    let regexString = regExp.search;
                    const parts = splitString(searchKey, regExp.div);
                    for (let i = 0; i < parts.length; i++) {
                        regexString = regexString.replace('${strA[' + i + ']}', parts[i]);
                    }
                    if (new RegExp(regexString).test(member)) {
                        found(value, libFile, entry, await load(entry), 'isRegExpFound');
                        fileMembers.push({ type: libFile.type, searchKey, value });
                    }
                }
            }
        }
    }

    // 論理ファイルの PFILE(元の物理ファイル)も探す対象に加える
    const pfiles = new Map();
    for (const fileMember of fileMembers) {
        if (fileMember.type !== 'dds') {
            continue;
        }
        for (const row of fileMember.value.data.textArray) {
            if (row.substring(5, 6) === 'A' && row.substring(6, 7) !== '*' && row.substring(44, 49).trim() === 'PFILE') {
                const key = row.substring(50, row.indexOf(')'));
                const use = structuredClone(fileMember.value.use);
                if (pfiles.has(key)) {
                    use.io = new Set([...pfiles.get(key).io, ...use.io]);
                }
                use.original = false;
                pfiles.set(key, use);
            }
        }
    }
    for (const [key, use] of pfiles) {
        if (refListFile.dds.has(key)) {
            use.io = new Set([...refListFile.dds.get(key).use.io, ...use.io]);
        }
        refListFile.dds.set(key, { name: key, use: use, isFound: false, data: {}, uri_path: {}, isRegExpFound: false });
    }
    if (pfiles.size > 0) {
        for (const libFile of ddsFiles) {
            for (const entry of files(await fs.list(libFile.ref))) {
                const key = findKey(refListFile.dds, stripExtension(entry.name));
                if (key !== null && !refListFile.dds.get(key).isFound) {
                    found(refListFile.dds.get(key), libFile, entry, await load(entry), 'isFound');
                }
            }
        }
    }
    return refListFile;
};

// 見つかったメンバーから、定義の一覧(normalRefDef)と表示装置の標識の参照(otherFileFlagReference)を作る
export const buildRefDef = async (refListFile, sourceFiles) => {
    let refDef = new Map();
    let flagRef = new Map();
    for (const [key, value] of refListFile.pgm) {
        if (!value.isFound) {
            continue;
        }
        const type = resolveSourceType(value.uri_path.file, sourceFiles);
        const text = type === 'rpg' ? addIndent(value.data.text) : addSpaces(value.data.text);
        const model = TextModel.fromText(value.uri, text, { languageId: type });
        refDef = await pgm_nameGet(model, refDef, key, value.data.handle, value.use);
    }
    for (const category of ['dds', 'dsp']) {
        for (const [key, value] of refListFile[category]) {
            if (!value.isFound && !value.isRegExpFound) {
                continue;
            }
            const model = TextModel.fromText(value.uri, addSpaces(value.data.text), { languageId: category });
            [refDef, flagRef] = await dds_DefinitionList(model, refDef, key, value.data.handle, value.use, flagRef);
        }
    }
    return { normalRefDef: refDef, otherFileFlagReference: flagRef };
};

// 1 つのソースについて、探す対象の一覧作り → 検索 → 定義作りをまとめて行う
export const computeReferences = async ({ sourceType, member, lines, lib, roots, libraryList, sourceFiles, regExp, fs, forceSJIS }) => {
    const refListFile = createRefListFile(sourceType, member, lines);
    if (refListFile === null) {
        return null;
    }
    const searchLibName = resolveSearchLibraries(lib, libraryList);
    await searchReferences({ refListFile, roots, searchLibName, sourceFiles, regExp, fs, forceSJIS });
    const { normalRefDef, otherFileFlagReference } = await buildRefDef(refListFile, sourceFiles);
    return { refListFile, normalRefDef, otherFileFlagReference, searchLibName };
};
