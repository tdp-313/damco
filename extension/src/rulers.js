// RPGLE の欄の区切り線。仕様書ごとに欄の位置が違うので、行ごとにその行の仕様書の区切りを引く。
// (Web 版はカーソル行の仕様書に合わせてエディタ全体のルーラーを切り替えている。VS Code のルーラーは
//  設定でしか変えられないため、文字の装飾で線を引く。行の長さより右には引けない)
// RPG III とインデント表示は桁が固定なので、package.json の configurationDefaults の editor.rulers を使う。
import * as vscode from 'vscode';
import { readConfig } from './config.js';

// Web 版 src/monaco/lang/ruler.js の RPGLE_RULERS と同じ(各欄の最終桁)
const RPGLE_RULERS = {
    H: [5, 6, 80],
    F: [5, 6, 16, 17, 18, 19, 20, 35, 42, 43, 80],
    D: [5, 6, 21, 22, 23, 25, 32, 39, 40, 42, 43, 80],
    P: [5, 6, 21, 24, 43, 80],
    C: [5, 6, 8, 11, 25, 35, 49, 63, 68, 70, 76, 80],
    I: [5, 6, 16, 30, 48, 62, 80],
    O: [5, 6, 16, 29, 43, 52, 80],
    free: [5, 7, 80],
};

export const rulerColumnsOf = (line, isFullFree) => {
    if (isFullFree) {
        return [];
    }
    const spec = line.charAt(5).toUpperCase();
    return RPGLE_RULERS[spec] || RPGLE_RULERS.free;
};

export const registerRulers = (context) => {
    // 文字の右端に 1px の線(box-shadow なので文字の幅は変わらない)
    const decoration = vscode.window.createTextEditorDecorationType({
        textDecoration: 'none; box-shadow: inset -1px 0 0 0 var(--vscode-editorRuler-foreground)',
    });
    context.subscriptions.push(decoration);

    const update = (editor) => {
        if (!editor) {
            return;
        }
        const document = editor.document;
        if (document.languageId !== 'damco-rpgle' || !readConfig(document.uri).rpgleRulers) {
            editor.setDecorations(decoration, []);
            return;
        }
        const isFullFree = document.lineCount > 0 && /^\*\*free/i.test(document.lineAt(0).text);
        const ranges = [];
        for (const visible of editor.visibleRanges) {
            const from = Math.max(0, visible.start.line - 20);
            const to = Math.min(document.lineCount - 1, visible.end.line + 20);
            for (let line = from; line <= to; line++) {
                const text = document.lineAt(line).text;
                for (const column of rulerColumnsOf(text, isFullFree)) {
                    if (column <= text.length) {
                        ranges.push(new vscode.Range(line, column - 1, line, column));
                    }
                }
            }
        }
        editor.setDecorations(decoration, ranges);
    };

    const updateAll = () => vscode.window.visibleTextEditors.forEach(update);
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(update));
    context.subscriptions.push(vscode.window.onDidChangeVisibleTextEditors(updateAll));
    context.subscriptions.push(vscode.window.onDidChangeTextEditorVisibleRanges((e) => update(e.textEditor)));
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((e) => {
        vscode.window.visibleTextEditors.filter((editor) => editor.document === e.document).forEach(update);
    }));
    // 言語の割り当てはドキュメントを開き直す形で行われる
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(() => setTimeout(updateAll, 0)));
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('damco.rulers')) {
            updateAll();
        }
    }));
    updateAll();
};
