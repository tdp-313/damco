// RPGLE 用の定義・参照・ホバー・折りたたみ。解析は rpgle/rpgleParse.js に任せ、ここは Monaco への受け渡しだけ行う。
import * as monaco from 'monaco-editor';
import { parseRpgle, findDefinitions, findReferences, externalAliases, foldingRanges, wordAt } from '../rpgle/rpgleParse.js';
import { describeAt } from '../rpgle/rpgleHelp.js';
import { ibmToJsColumn } from '../column.js';

const parsedCache = new WeakMap();

export const getParsedRpgle = (model) => {
    const version = model.getVersionId();
    const cached = parsedCache.get(model);
    if (cached && cached.version === version) {
        return cached.parsed;
    }
    const parsed = parseRpgle(model.getLinesContent());
    parsedCache.set(model, { version, parsed });
    return parsed;
};

const defLocation = (model, def) => {
    return {
        uri: model.uri,
        range: new monaco.Range(def.line + 1, 1, def.endLine + 1, model.getLineMaxColumn(def.endLine + 1)),
    };
};

// 外部定義(DDS のフィールド・ファイル、呼び出し先プログラム)。
// ファイルの EXTDESC/EXTFILE、プロトタイプの EXTPGM による別名も引く
const externalDefs = (model, parsed, word) => {
    const refDef = model.otherData ? model.otherData.normalRefDef : null;
    if (!refDef) {
        return [];
    }
    const keys = [word.text];
    const alias = word.literal ? null : externalAliases(parsed).get(word.text);
    if (alias && alias !== word.text) {
        keys.push(alias);
    }
    const found = [];
    for (const key of keys) {
        const list = refDef.get(key);
        if (Array.isArray(list)) {
            found.push(...list);
        }
    }
    return found;
};

const currentWord = (model, position, parsed) => {
    const lineText = model.getLineContent(position.lineNumber);
    return wordAt(lineText, position.column, parsed.mode);
};

export const rpgleDefinition = (model, position) => {
    const parsed = getParsedRpgle(model);
    const word = currentWord(model, position, parsed);
    if (!word) {
        return null;
    }
    const locations = [];
    if (!word.literal && word.prefix !== '%' && word.prefix !== '*') {
        for (const def of findDefinitions(parsed, word.text)) {
            locations.push(defLocation(model, def));
        }
    }
    for (const ext of externalDefs(model, parsed, word)) {
        locations.push(ext.location);
    }
    return locations;
};

export const rpgleReferences = (model, position) => {
    const parsed = getParsedRpgle(model);
    const word = currentWord(model, position, parsed);
    if (!word || word.literal) {
        return null;
    }
    const locations = [];
    for (const ref of findReferences(parsed, word.text)) {
        const lineText = model.getLineContent(ref.line + 1);
        locations.push({
            uri: model.uri,
            range: new monaco.Range(
                ref.line + 1, ibmToJsColumn(lineText, ref.start, parsed.mode),
                ref.line + 1, ibmToJsColumn(lineText, ref.end, parsed.mode)),
        });
    }
    for (const ext of externalDefs(model, parsed, word)) {
        locations.push(ext.location);
    }
    return locations;
};

// 自分で定義した名前・外部の定義に加えて、固定形式の欄・命令コード・キーワード・
// 組み込み関数・特殊値の説明を出す(rpgle/rpgleHelp.js)
export const rpgleHover = (model, position) => {
    const parsed = getParsedRpgle(model);
    const lineText = model.getLineContent(position.lineNumber);
    const result = describeAt(parsed, position.lineNumber - 1, lineText, position.column,
        (word) => externalDefs(model, parsed, word));
    if (!result) {
        return null;
    }
    return {
        range: new monaco.Range(position.lineNumber, result.range.start, position.lineNumber, result.range.end),
        contents: result.contents.map((value) => ({ value })),
    };
};

export const rpgleFolding = (model) => {
    return foldingRanges(getParsedRpgle(model));
};
