// Monaco のテキストモデルと同じ形の読み取り専用モデル。
// src/monaco 以下の解析処理(ホバー・定義・参照など)を Monaco なしで動かすために使う。
// 行番号・桁は Monaco と同じく 1 始まり。

// Monaco の既定の単語の区切り(言語設定で wordPattern を指定していない言語と同じ)
const DEFAULT_WORD_REGEXP = /(-?\d*\.\d\w*)|([^`~!@#$%^&*()\-=+[{\]}\\|;:'",.<>/?\s]+)/g;

export class TextModel {
    constructor(uri, lines, options = {}) {
        this.uri = uri;
        this.lines = lines.length > 0 ? lines : [''];
        this.languageId = options.languageId || '';
        this.versionId = options.version || 1;
        this.otherData = options.otherData || null;
    }

    static fromText(uri, text, options = {}) {
        return new TextModel(uri, text.split(/\r\n|\r|\n/), options);
    }

    getLineCount() {
        return this.lines.length;
    }

    getLineContent(lineNumber) {
        const line = this.lines[lineNumber - 1];
        return line === undefined ? '' : line;
    }

    getLinesContent() {
        return this.lines;
    }

    getValue() {
        return this.lines.join('\n');
    }

    getVersionId() {
        return this.versionId;
    }

    getLanguageId() {
        return this.languageId;
    }

    getLineMaxColumn(lineNumber) {
        return this.getLineContent(lineNumber).length + 1;
    }

    getWordAtPosition(position) {
        const line = this.getLineContent(position.lineNumber);
        DEFAULT_WORD_REGEXP.lastIndex = 0;
        let match;
        while ((match = DEFAULT_WORD_REGEXP.exec(line)) !== null) {
            const startColumn = match.index + 1;
            const endColumn = startColumn + match[0].length;
            if (position.column >= startColumn && position.column <= endColumn) {
                return { word: match[0], startColumn, endColumn };
            }
        }
        return null;
    }
}
