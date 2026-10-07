// 開いたファイルに言語と文字コードを割り当てる。
// 言語: 親フォルダ(ソースファイル)の名前を damco.sourceFiles と照らして決める。
// 文字コード: Web 版と同じ判定(UTF-8 か Shift_JIS か)で、Shift_JIS なら開き直す。
import * as vscode from 'vscode';
import { decodeText } from '../../src/monaco/webworker/fileOpen.js';
import { readConfig } from './config.js';
import { LANGUAGE_OF_TYPE, LANGUAGE_SCHEMES, SEARCH_SCHEMES, INDENT_SCHEME, sourceTypeOf, conflictingTypesOf } from './languages.js';

export const registerAssign = (context, output) => {
    const warned = new Set();
    const busy = new Set();

    const warnConflict = (document, config) => {
        const types = conflictingTypesOf(document.uri, config.sourceFiles);
        const folder = document.uri.path.split('/').slice(-2, -1)[0];
        if (types.length > 1 && !warned.has(folder)) {
            warned.add(folder);
            const message = 'ソースファイル「' + folder + '」は damco.sourceFiles の複数の種類(' + types.join(', ') + ')に当てはまります。' + types[0] + ' として扱います。';
            output.appendLine(message);
            vscode.window.showWarningMessage(message);
        }
    };

    const assignEncoding = async (document, config) => {
        if (!SEARCH_SCHEMES.includes(document.uri.scheme) || document.isDirty || !(config.autoDetectEncoding || config.forceShiftJIS)) {
            return;
        }
        const { encode } = decodeText(await vscode.workspace.fs.readFile(document.uri), config.forceShiftJIS);
        if (encode === 'Shift-JIS' && document.encoding !== 'shiftjis') {
            await vscode.workspace.openTextDocument(document.uri, { encoding: 'shiftjis' });
        }
    };

    const assign = async (document) => {
        const scheme = document.uri.scheme;
        if (!LANGUAGE_SCHEMES.includes(scheme) || scheme === INDENT_SCHEME) {
            return;
        }
        const key = document.uri.toString();
        if (busy.has(key)) {
            return;
        }
        const config = readConfig(document.uri);
        const type = sourceTypeOf(document.uri, config.sourceFiles);
        if (type === null) {
            return;
        }
        busy.add(key);
        try {
            warnConflict(document, config);
            let target = document;
            const languageId = LANGUAGE_OF_TYPE[type];
            if (target.languageId !== languageId) {
                target = await vscode.languages.setTextDocumentLanguage(target, languageId);
            }
            await assignEncoding(target, config);
        } catch (error) {
            output.appendLine('[言語・文字コードの割り当て] ' + document.uri.toString() + ': ' + (error && error.message ? error.message : error));
        } finally {
            busy.delete(key);
        }
    };

    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(assign));
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('damco.sourceFiles') || e.affectsConfiguration('damco.forceShiftJIS')) {
            warned.clear();
            vscode.workspace.textDocuments.forEach(assign);
        }
    }));
    vscode.workspace.textDocuments.forEach(assign);
    return assign;
};
