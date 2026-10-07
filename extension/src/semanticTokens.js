// 色分け。Web 版の Monarch の定義(src/monaco/lang/syntax)を shared/monarch.js で動かし、セマンティックトークンにする
import * as vscode from 'vscode';
import { compileMonarch, tokenizeLines } from '../../shared/monarch.js';
import { rpg_token } from '../../src/monaco/lang/syntax/rpg.js';
import { rpg_token2 } from '../../src/monaco/lang/syntax/rpg_indent.js';
import { rpgle_token } from '../../src/monaco/lang/syntax/rpgle.js';
import { dds_token } from '../../src/monaco/lang/syntax/dds.js';
import { cl_token } from '../../src/monaco/lang/syntax/cl.js';
import { LEGEND_TYPES, semanticTypeOf } from './tokenTypes.js';
import { INDENT_LANGUAGE } from './languages.js';

export const LEGEND = new vscode.SemanticTokensLegend(LEGEND_TYPES, []);

const DEFINITIONS = {
    'damco-rpg': rpg_token,
    [INDENT_LANGUAGE]: rpg_token2,
    'damco-rpgle': rpgle_token,
    'damco-dds': dds_token,
    'damco-cl': cl_token,
};

const lexers = new Map();
const lexerOf = (languageId) => {
    if (!lexers.has(languageId)) {
        lexers.set(languageId, compileMonarch(DEFINITIONS[languageId]()));
    }
    return lexers.get(languageId);
};

export const buildSemanticTokens = (document) => {
    const lines = [];
    for (let i = 0; i < document.lineCount; i++) {
        lines.push(document.lineAt(i).text);
    }
    const builder = new vscode.SemanticTokensBuilder(LEGEND);
    const tokenized = tokenizeLines(lexerOf(document.languageId), lines);
    for (let line = 0; line < tokenized.length; line++) {
        for (const token of tokenized[line]) {
            const type = semanticTypeOf(token.token);
            if (type !== null) {
                builder.push(line, token.start, token.length, LEGEND_TYPES.indexOf(type), 0);
            }
        }
    }
    return builder.build();
};

export const registerSemanticTokens = (context, output) => {
    const selector = Object.keys(DEFINITIONS).map((language) => ({ language }));
    context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider(selector, {
        provideDocumentSemanticTokens: (document) => {
            try {
                return buildSemanticTokens(document);
            } catch (error) {
                output.appendLine('[色分け] ' + (error && error.stack ? error.stack : error));
                return new vscode.SemanticTokensBuilder(LEGEND).build();
            }
        },
    }, LEGEND));
};
