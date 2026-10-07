// 拡張機能のビルドで 'monaco-editor' の代わりに使う。
// src/monaco 以下の解析処理が使うのは Range だけなので、それだけ用意する(Monaco の 1 始まりの範囲)。
export class Range {
    constructor(startLineNumber, startColumn, endLineNumber, endColumn) {
        this.startLineNumber = startLineNumber;
        this.startColumn = startColumn;
        this.endLineNumber = endLineNumber;
        this.endColumn = endColumn;
    }
}

// 登録処理(regHover など)は拡張機能からは呼ばない
export const languages = {};
export const editor = {};
