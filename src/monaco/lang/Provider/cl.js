// CL 用の定義・参照・ホバー。解析は cl/clParse.js に任せ、ここは Monaco への受け渡しだけ行う。
// VS Code 拡張機能からも使う。
import * as monaco from 'monaco-editor';
import { parseCl, tokenAt, fileFieldNames } from '../cl/clParse.js';
import { clHelpFor } from '../cl/clHelp.js';
import { formatExternal } from '../rpgle/rpgleHelp.js';

const parsedCache = new WeakMap();

export const getParsedCl = (model) => {
    const version = model.getVersionId();
    const cached = parsedCache.get(model);
    if (cached && cached.version === version) {
        return cached.parsed;
    }
    const parsed = parseCl(model.getLinesContent());
    parsedCache.set(model, { version, parsed });
    return parsed;
};

const tokenLocation = (model, token) => {
    return { uri: model.uri, range: new monaco.Range(token.line + 1, token.start + 1, token.line + 1, token.end + 1) };
};

// 文(継続行を含む)の範囲
const statementLocation = (model, line, endLine) => {
    return { uri: model.uri, range: new monaco.Range(line + 1, 1, endLine + 1, model.getLineMaxColumn(endLine + 1)) };
};

const refDefOf = (model, key) => {
    const refDef = model.otherData ? model.otherData.normalRefDef : null;
    const list = refDef ? refDef.get(key) : undefined;
    return Array.isArray(list) ? list : [];
};

// 外部の定義。呼び出し先のプログラム、DCLF のファイル、DCLF のファイルのフィールド(&フィールド名)
const externalDefs = (model, parsed, token) => {
    if (token.role === 'program') {
        return refDefOf(model, "'" + token.upper + "'");
    }
    if (token.role === 'file') {
        return refDefOf(model, token.upper).filter((def) => def.sourceType === 'file');
    }
    if (token.upper.startsWith('&') && !parsed.variables.has(token.upper)) {
        const found = [];
        for (const name of fileFieldNames(parsed, token.upper)) {
            found.push(...refDefOf(model, name).filter((def) => def.sourceType !== 'file'));
        }
        return found;
    }
    return [];
};

// 表示装置ファイルの標識(&IN03 → DDS で 03 を使っている行)
const indicatorDefs = (model, parsed, token) => {
    const flagRef = model.otherData ? model.otherData.otherFileFlagReference : null;
    if (!flagRef || parsed.variables.has(token.upper)) {
        return [];
    }
    const found = [];
    for (const name of fileFieldNames(parsed, token.upper)) {
        if (/^IN\d\d$/.test(name)) {
            found.push(...(flagRef.get('*' + name) || []));
        }
    }
    return found;
};

const currentToken = (model, position, parsed) => {
    const token = tokenAt(parsed, position.lineNumber - 1, position.column);
    return token === null || token.inString && token.role === null ? null : token;
};

export const clDefinition = (model, position) => {
    const parsed = getParsedCl(model);
    const token = currentToken(model, position, parsed);
    if (token === null) {
        return null;
    }
    const locations = [];
    if (token.upper.startsWith('&')) {
        const variable = parsed.variables.get(token.upper);
        if (variable) {
            locations.push(statementLocation(model, variable.line, variable.endLine));
        }
        for (const def of indicatorDefs(model, parsed, token)) {
            locations.push(def.location);
        }
    } else if (token.role === 'label') {
        const label = parsed.labels.get(token.upper);
        if (label) {
            locations.push(tokenLocation(model, label));
        }
    } else if (token.role === 'subroutine') {
        const subroutine = parsed.subroutines.get(token.upper);
        if (subroutine) {
            locations.push(statementLocation(model, subroutine.line, subroutine.endLine));
        }
    }
    for (const def of externalDefs(model, parsed, token)) {
        locations.push(def.location);
    }
    return locations;
};

export const clReferences = (model, position) => {
    const parsed = getParsedCl(model);
    const token = currentToken(model, position, parsed);
    if (token === null) {
        return null;
    }
    let tokens = [];
    if (token.upper.startsWith('&')) {
        tokens = parsed.variableRefs.get(token.upper) || [];
    } else if (token.role === 'label') {
        tokens = parsed.labelRefs.get(token.upper) || [];
    } else if (token.role === 'subroutine') {
        tokens = parsed.subroutineRefs.get(token.upper) || [];
    } else if (token.role === 'program') {
        tokens = parsed.programs.filter((p) => p.name === token.upper).map((p) => p.token);
    } else if (token.role === 'file') {
        tokens = parsed.files.filter((f) => f.name === token.upper).map((f) => f.token);
    } else {
        return null;
    }
    const locations = tokens.map((t) => tokenLocation(model, t));
    for (const def of externalDefs(model, parsed, token)) {
        locations.push(def.location);
    }
    return locations;
};

// 変数は型と長さ(DCLF のファイルのフィールドなら DDS の説明)、呼び出し先のプログラム・DCLF のファイルは説明、
// コマンド・演算子・組み込み関数は使い方を出す
export const clHover = (model, position) => {
    const parsed = getParsedCl(model);
    const token = currentToken(model, position, parsed);
    if (token === null) {
        return null;
    }
    const contents = [];
    if (token.upper.startsWith('&')) {
        const variable = parsed.variables.get(token.upper);
        if (variable) {
            contents.push('**' + variable.name + '**', '変数 : `' + [variable.type, variable.len].filter((s) => s !== '').join(' ') + '`');
        }
    }
    if (contents.length === 0) {
        const ext = formatExternal(externalDefs(model, parsed, token));
        if (ext) {
            contents.push('**' + token.upper + '**', ext);
        } else if (indicatorDefs(model, parsed, token).length > 0) {
            contents.push('**' + token.upper + '**', '表示装置ファイルの標識');
        }
    }
    if (contents.length === 0 && !token.inString) {
        const help = clHelpFor(token.upper, token.role);
        if (help) {
            contents.push(help);
        }
    }
    if (contents.length === 0) {
        return null;
    }
    return {
        range: new monaco.Range(position.lineNumber, token.start + 1, position.lineNumber, token.end + 1),
        contents: contents.map((value) => ({ value })),
    };
};
