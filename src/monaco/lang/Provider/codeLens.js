import { getModelDbcsMode, toColumnLine, stripFill } from "../column.js";
import * as monaco from 'monaco-editor';

export const regCodeLens = () => {

    monaco.languages.registerCodeLensProvider("rpg-indent", {
        provideCodeLenses: async function (model, token) {
            return { lenses: rpgIndentCodeLenses(model), dispose: () => { }, };
        },
        resolveCodeLens: function (model, codeLens, token) {
            return codeLens;
        },
    });
}

// RPG III(インデント済み)の CodeLens。VS Code 拡張機能からも使う
export const rpgIndentCodeLenses = (model) => {
    const nowork = "";
    var lineCount = model.getLineCount();
    const mode = getModelDbcsMode(model);
    let rtn = { lenses: [], dispose: () => { }, };
    for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
        // 行のテキストを取得(全角を含む行は桁位置どおりに読めるよう変換)
        let lineText = toColumnLine(model.getLineContent(lineNumber), mode);
        let op_m = lineText.substring(45, 50).trim();
        let op_1 = stripFill(lineText.substring(17, 27)).trim();
        let op_2 = stripFill(lineText.substring(50, 60)).trim();
        if (op_m.indexOf("BEGSR") !== -1) {
            rtn.lenses.push({
                range: {
                    startLineNumber: lineNumber,
                    startColumn: 45,
                    endLineNumber: lineNumber,
                    endColumn: 70,
                },
                id: "LINE-" + lineNumber,
                command: {
                    id: nowork,
                    title: "   subroutine : " + op_1,
                },
            });
        } else if (op_m.indexOf("CALL") !== -1) {
            rtn.lenses.push({
                range: {
                    startLineNumber: lineNumber,
                    startColumn: 45,
                    endLineNumber: lineNumber,
                    endColumn: 70,
                },
                id: "LINE-" + lineNumber,
                command: {
                    id: nowork,
                    title: "   CALL : " + op_2,
                },
            });
        } else if (op_m.indexOf("ENDDO") !== -1) {
            rtn.lenses.push({
                range: {
                    startLineNumber: lineNumber + 1,
                    startColumn: 45,
                    endLineNumber: lineNumber + 1,
                    endColumn: 70,
                },
                id: "LINE-" + lineNumber,
                command: {
                    id: nowork,
                    title: "",
                },
            });
        } else if (op_m.indexOf("ENDSR") !== -1) {
            rtn.lenses.push({
                range: {
                    startLineNumber: lineNumber + 1,
                    startColumn: 45,
                    endLineNumber: lineNumber + 1,
                    endColumn: 70,
                },
                id: "LINE-" + lineNumber,
                command: {
                    id: nowork,
                    title: "",
                },
            });
        } else if (op_m.indexOf("DO") !== -1) {
            rtn.lenses.push({
                range: {
                    startLineNumber: lineNumber,
                    startColumn: 45,
                    endLineNumber: lineNumber,
                    endColumn: 70,
                },
                id: "LINE-" + lineNumber,
                command: {
                    id: nowork,
                    title: "   DO : " + op_2,
                },
            });
        }
    }
    return rtn.lenses;
}
