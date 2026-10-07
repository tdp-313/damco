// RPG III の「インデント済みテキスト」(src/monaco/file/text_extend.js の addIndent)と元のテキストの位置の対応。
// addIndent は C 仕様書の 27 桁目と 28 桁目の間に 18 桁(インデントの線)を差し込む。行数は変わらない。
// 元のファイルを開いたままでも、インデント済みテキスト用の解析(ホバー・定義・参照)を使えるようにする。
import { addIndent } from '../src/monaco/file/text_extend.js';
import { detectDbcsMode, toColumnLine, jsToIbmColumn, ibmToJsColumn } from '../src/monaco/lang/column.js';

export const INDENT_WIDTH = 18;
const INSERT_COLUMN = 28; // 差し込む位置(IBM の桁、1 始まり)

const isCalcLine = (colLine) => colLine.substring(6, 7) !== '*' && colLine.substring(5, 6) === 'C';

export class RpgIndentMap {
    constructor(rawLines) {
        this.rawLines = rawLines;
        this.indentLines = addIndent(rawLines.join('\n')).split('\n');
        this.rawMode = detectDbcsMode(rawLines);
        this.indentMode = detectDbcsMode(this.indentLines);
    }

    isCalc(lineIndex) {
        const raw = this.rawLines[lineIndex];
        return raw !== undefined && isCalcLine(toColumnLine(raw, this.rawMode));
    }

    // 元の行の JS カラム(1 始まり)→ インデント済みの行の JS カラム
    toIndentColumn(lineIndex, column) {
        if (!this.isCalc(lineIndex)) {
            return column;
        }
        let ibm = jsToIbmColumn(this.rawLines[lineIndex], column, this.rawMode);
        if (ibm >= INSERT_COLUMN) {
            ibm += INDENT_WIDTH;
        }
        return ibmToJsColumn(this.indentLines[lineIndex], ibm, this.indentMode);
    }

    // インデント済みの行の JS カラム(1 始まり)→ 元の行の JS カラム。差し込んだ部分は 28 桁目に寄せる
    toRawColumn(lineIndex, column) {
        if (!this.isCalc(lineIndex)) {
            return column;
        }
        let ibm = jsToIbmColumn(this.indentLines[lineIndex], column, this.indentMode);
        if (ibm >= INSERT_COLUMN + INDENT_WIDTH) {
            ibm -= INDENT_WIDTH;
        } else if (ibm > INSERT_COLUMN) {
            ibm = INSERT_COLUMN;
        }
        return ibmToJsColumn(this.rawLines[lineIndex], ibm, this.rawMode);
    }
}
