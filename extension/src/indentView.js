// RPG III のインデント表示(Web 版の通常表示と同じ、読み取り専用)。
// 元のファイルの内容に addIndent をかけたテキストを damco-indent: の仮想ドキュメントとして開く。
import * as vscode from 'vscode';
import { addIndent } from '../../src/monaco/file/text_extend.js';
import { decodeText } from '../../src/monaco/webworker/fileOpen.js';
import { INDENT_LANGUAGE, INDENT_SCHEME, toIndentUri, fromIndentUri } from './languages.js';
import { readConfig } from './config.js';

const openDocumentOf = (uri) => vscode.workspace.textDocuments.find((d) => d.uri.toString() === uri.toString());

class IndentContentProvider {
    constructor() {
        this.emitter = new vscode.EventEmitter();
        this.onDidChange = this.emitter.event;
    }

    async provideTextDocumentContent(uri) {
        const source = fromIndentUri(uri);
        const document = openDocumentOf(source);
        let text;
        if (document) {
            text = document.getText();
        } else {
            text = decodeText(await vscode.workspace.fs.readFile(source), readConfig(source).forceShiftJIS).text;
        }
        return addIndent(text.replace(/\r\n|\r/g, '\n'));
    }

    update(uri) {
        this.emitter.fire(uri);
    }
}

export const openIndentView = async (uri, line) => {
    const document = await vscode.workspace.openTextDocument(toIndentUri(uri));
    const indented = document.languageId === INDENT_LANGUAGE ? document : await vscode.languages.setTextDocumentLanguage(document, INDENT_LANGUAGE);
    const selection = typeof line === 'number' ? new vscode.Range(line, 0, line, 0) : undefined;
    return vscode.window.showTextDocument(indented, { preview: false, selection });
};

export const registerIndentView = (context) => {
    const provider = new IndentContentProvider();
    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(INDENT_SCHEME, provider));

    // 元のファイルが変わったらインデント表示も更新する
    const timers = new Map();
    const refresh = (uri) => {
        const indentUri = toIndentUri(uri);
        if (!vscode.workspace.textDocuments.some((d) => d.uri.toString() === indentUri.toString())) {
            return;
        }
        clearTimeout(timers.get(indentUri.toString()));
        timers.set(indentUri.toString(), setTimeout(() => provider.update(indentUri), 300));
    };
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document.uri.scheme !== INDENT_SCHEME) {
            refresh(e.document.uri);
        }
    }));
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((d) => refresh(d.uri)));

    context.subscriptions.push(vscode.commands.registerCommand('damco.openIndentView', async (uri) => {
        const target = uri instanceof vscode.Uri ? uri : vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.uri;
        if (!target) {
            return;
        }
        const editor = vscode.window.activeTextEditor;
        const line = editor && editor.document.uri.toString() === target.toString() ? editor.selection.active.line : undefined;
        await openIndentView(target.scheme === INDENT_SCHEME ? fromIndentUri(target) : target, line);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('damco.openOriginal', async (uri) => {
        const target = uri instanceof vscode.Uri ? uri : vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.uri;
        if (!target || target.scheme !== INDENT_SCHEME) {
            return;
        }
        const editor = vscode.window.activeTextEditor;
        const document = await vscode.workspace.openTextDocument(fromIndentUri(target));
        await vscode.window.showTextDocument(document, { preview: false, selection: editor ? new vscode.Range(editor.selection.active.line, 0, editor.selection.active.line, 0) : undefined });
    }));

    // インデント表示を開いたときに言語を割り当てる(エディタの復元などで開かれた場合)
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument((d) => {
        if (d.uri.scheme === INDENT_SCHEME && d.languageId !== INDENT_LANGUAGE) {
            vscode.languages.setTextDocumentLanguage(d, INDENT_LANGUAGE);
        }
    }));
};
