// 固定形式のソース(RPG III・RPGLE・DDS)の色分けを、全角文字を含む行でも桁どおりにする。
// Monarch(syntax/*.js)は全角 1 文字を 1 桁として数えるため、全角の文字定数より右の欄の色がずれる。
// 同じ Monarch の定義を、全角を 2 桁として数えた行(column.js)で動かし、セマンティックトークンとして上から塗る。
// トークンの種類は Monarch のトークン名そのままなので、色はテーマ(dark_1.json / white.json)の規則で決まる。
import { compileMonarch, tokenizeFixedLines } from '../../../shared/monarch.js';
import { rpg_token } from './syntax/rpg.js';
import { rpg_token2 } from './syntax/rpg_indent.js';
import { rpgle_token } from './syntax/rpgle.js';
import { dds_token } from './syntax/dds.js';

const DEFINITIONS = {
    'rpg': rpg_token,
    'rpg-indent': rpg_token2,
    'rpgle': rpgle_token,
    'dds': dds_token,
};
export const SEMANTIC_LANGUAGES = Object.keys(DEFINITIONS);

// 色を付けない部分の種類(テーマの既定の文字色になる)
const PLAIN = 'identifier';

// Monarch の定義に出てくるトークン名を集める(セマンティックトークンの凡例にする)
const collectTokens = (definition, names) => {
    const visit = (action) => {
        if (typeof action === 'string') {
            if (!action.startsWith('@')) {
                names.add(action === '' ? PLAIN : action);
            }
        } else if (Array.isArray(action)) {
            action.forEach(visit);
        } else if (action && typeof action === 'object') {
            if (typeof action.token === 'string') {
                visit(action.token);
            }
            if (action.cases) {
                Object.values(action.cases).forEach(visit);
            }
        }
    };
    for (const rules of Object.values(definition.tokenizer)) {
        for (const rule of rules) {
            if (Array.isArray(rule)) {
                visit(rule[1]);
            } else if (rule && rule.action) {
                visit(rule.action);
            }
        }
    }
};

const names = new Set([PLAIN, 'source']);
for (const create of Object.values(DEFINITIONS)) {
    collectTokens(create(), names);
}
export const SEMANTIC_LEGEND = { tokenTypes: [...names], tokenModifiers: [] };
const typeIndex = new Map(SEMANTIC_LEGEND.tokenTypes.map((name, i) => [name, i]));

const lexers = new Map();
const lexerOf = (languageId) => {
    if (!lexers.has(languageId)) {
        lexers.set(languageId, compileMonarch(DEFINITIONS[languageId]()));
    }
    return lexers.get(languageId);
};

// 行の配列から、セマンティックトークンのデータ(5 個ずつ: 行の差・開始の差・長さ・種類・修飾)を作る。
// 色を付けない部分も PLAIN として出し、Monarch の(ずれた)色が残らないようにする
export const buildSemanticTokens = (lines, languageId) => {
    const tokenized = tokenizeFixedLines(lexerOf(languageId), lines);
    const data = [];
    let lastLine = 0;
    let lastStart = 0;
    for (let line = 0; line < tokenized.length; line++) {
        for (const token of tokenized[line]) {
            const type = typeIndex.has(token.token) ? typeIndex.get(token.token) : typeIndex.get(PLAIN);
            data.push(line - lastLine, line === lastLine ? token.start - lastStart : token.start, token.length, type, 0);
            lastLine = line;
            lastStart = token.start;
        }
    }
    return new Uint32Array(data);
};

// Monaco に登録する(lang_root.js から呼ぶ)
export const regSemanticTokens = (monaco) => {
    for (const languageId of SEMANTIC_LANGUAGES) {
        monaco.languages.registerDocumentSemanticTokensProvider(languageId, {
            getLegend: () => SEMANTIC_LEGEND,
            provideDocumentSemanticTokens: (model) => ({ data: buildSemanticTokens(model.getLinesContent(), languageId) }),
            releaseDocumentSemanticTokens: () => { },
        });
    }
};
