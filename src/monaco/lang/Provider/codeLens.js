import { normalEditor } from "../../monaco_root.js";
import * as monaco from 'monaco-editor';

export const regCodeLens = () => {
    let nowork = "";

    monaco.languages.registerCodeLensProvider("rpg-indent", {
        provideCodeLenses: async function (model, token) {
            var lineCount = model.getLineCount();
            let rtn = { lenses: [], dispose: () => { }, };
            for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
                // 行のテキストを取得
                let lineText = model.getLineContent(lineNumber);
                let op_m = lineText.substring(45, 50).trim();
                let op_1 = lineText.substring(17, 27).trim();
                let op_2 = lineText.substring(50, 60).trim();
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
            return rtn;
        },
        resolveCodeLens: function (model, codeLens, token) {
            return codeLens;
        },
    });
}
