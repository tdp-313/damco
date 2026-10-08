// 開いているドキュメントごとに、解析用のモデル(Monaco 互換)と参照先の定義を用意する
import * as vscode from 'vscode';
import { TextModel } from '../../shared/textModel.js';
import { RpgIndentMap } from '../../shared/rpgIndent.js';
import { computeReferences } from '../../shared/refSearch.js';
import { readConfig, referenceRootUris } from './config.js';
import { SEARCH_SCHEMES, kindOfLanguage, parseSourcePath, sourceTypeOf, sourceUriOf } from './languages.js';

const emptyOtherData = () => ({
    normalRefDef: new Map(),
    sourceRefDef: new Map(),
    otherFileFlagReference: new Map(),
    refListFile: { dds: new Map(), dsp: new Map(), pgm: new Map() },
    searchLibName: [],
    status: 'none',
});

// Web 版は表示の前に各行を 80 桁まで空白で埋める(addSpaces)。解析も同じ形のテキストで行う
const padLine = (line) => (line.length < 80 ? line + ' '.repeat(80 - line.length) : line);

const documentLines = (document) => {
    const lines = [];
    for (let i = 0; i < document.lineCount; i++) {
        lines.push(document.lineAt(i).text);
    }
    return lines;
};

export class DocumentService {
    constructor(output) {
        this.output = output;
        this.entries = new Map(); // ドキュメントの Uri → { version, model, map }
        this.references = new Map(); // ドキュメントの Uri → { key, promise, otherData }
        this.dirCache = new Map();
        this.generation = 0;
        this.onDidUpdateEmitter = new vscode.EventEmitter();
        this.onDidUpdate = this.onDidUpdateEmitter.event;
    }

    // フォルダの中身はキャッシュする(ファイルの追加・削除で clear する)
    get fs() {
        return {
            list: (uri) => {
                const key = uri.toString();
                if (!this.dirCache.has(key)) {
                    this.dirCache.set(key, Promise.resolve(vscode.workspace.fs.readDirectory(uri)).then(
                        (entries) => entries.map(([name, type]) => ({ name, isDirectory: (type & vscode.FileType.Directory) !== 0, ref: vscode.Uri.joinPath(uri, name) })),
                        () => []));
                }
                return this.dirCache.get(key);
            },
            read: (uri) => vscode.workspace.fs.readFile(uri),
            toUri: (uri) => uri,
        };
    }

    // ファイルが増えた・消えた・変わったとき。次に使うときに探し直す
    invalidate() {
        this.dirCache.clear();
        this.generation++;
    }

    // 解析用のモデル。RPG III の元のファイルはインデント済みのテキストで解析し、位置を対応させる(map)
    get(document) {
        const key = document.uri.toString();
        const cached = this.entries.get(key);
        if (cached && cached.version === document.version && cached.languageId === document.languageId) {
            return cached;
        }
        const lines = documentLines(document);
        const otherData = this.referenceEntry(document).otherData;
        let entry;
        const kind = kindOfLanguage(document.languageId);
        if (kind === 'rpg') {
            const map = new RpgIndentMap(lines);
            entry = { model: new TextModel(document.uri, map.indentLines, { languageId: 'rpg-indent', version: document.version, otherData }), map };
        } else {
            const modelLines = kind === 'rpg-indent' ? lines : lines.map(padLine);
            entry = { model: new TextModel(document.uri, modelLines, { languageId: kind, version: document.version, otherData }), map: null };
        }
        entry.version = document.version;
        entry.languageId = document.languageId;
        this.entries.set(key, entry);
        return entry;
    }

    forget(document) {
        const key = document.uri.toString();
        this.entries.delete(key);
        this.references.delete(key);
    }

    referenceEntry(document) {
        const key = document.uri.toString();
        if (!this.references.has(key)) {
            this.references.set(key, { key: null, promise: null, otherData: emptyOtherData() });
        }
        return this.references.get(key);
    }

    // 参照先の定義を(必要なら作り直して)返す。モデルの otherData にも反映される
    ensureReferences(document) {
        const entry = this.referenceEntry(document);
        const key = document.version + ':' + this.generation;
        if (entry.key === key && entry.promise) {
            return entry.promise;
        }
        entry.key = key;
        entry.promise = this.computeReferences(document, entry, key).catch((error) => {
            this.output.appendLine('[参照先の検索] ' + document.uri.fsPath + ': ' + (error && error.stack ? error.stack : error));
            entry.otherData.status = 'error';
            return entry.otherData;
        });
        return entry.promise;
    }

    async computeReferences(document, entry, key) {
        const source = sourceUriOf(document.uri);
        const otherData = entry.otherData;
        if (!SEARCH_SCHEMES.includes(source.scheme)) {
            otherData.status = 'unsupported';
            return otherData;
        }
        const config = readConfig(source);
        const sourceType = sourceTypeOf(source, config.sourceFiles);
        const parsed = parseSourcePath(source);
        if (sourceType === null || parsed === null) {
            otherData.status = 'unsupported';
            return otherData;
        }
        const model = this.get(document).model;
        otherData.status = 'pending';
        const roots = [{ name: 'main', ref: parsed.root }];
        for (const uri of referenceRootUris(config)) {
            if (!roots.some((r) => r.ref.toString() === uri.toString())) {
                roots.push({ name: uri.path.split('/').filter((s) => s !== '').pop() || uri.toString(), ref: uri });
            }
        }
        const result = await computeReferences({
            sourceType,
            member: parsed.member,
            lines: model.getLinesContent(),
            lib: parsed.lib,
            roots,
            libraryList: config.libraryList,
            sourceFiles: config.sourceFiles,
            regExp: config.regExp,
            fs: this.fs,
            forceSJIS: config.forceShiftJIS,
        });
        if (result === null) {
            otherData.status = 'unsupported';
            return otherData;
        }
        if (entry.key !== key) {
            // 探している間にテキストが変わった。新しい方の結果を使う
            return entry.promise;
        }
        // モデルが同じ otherData を見ているので、中身を入れ替える
        otherData.refListFile = result.refListFile;
        otherData.normalRefDef = result.normalRefDef;
        otherData.otherFileFlagReference = result.otherFileFlagReference;
        otherData.searchLibName = result.searchLibName;
        otherData.roots = roots;
        otherData.sourceType = sourceType;
        otherData.status = 'complete';
        this.onDidUpdateEmitter.fire(document);
        return otherData;
    }

    // 定義・参照・ホバーの前に参照先を待つ。時間がかかるときは待たずに今ある定義で答える
    async ready(document, timeout = 5000) {
        const promise = this.ensureReferences(document);
        await Promise.race([promise, new Promise((resolve) => setTimeout(resolve, timeout))]);
        return this.get(document);
    }
}
