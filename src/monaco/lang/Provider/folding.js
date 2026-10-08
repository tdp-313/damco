import * as monaco from 'monaco-editor';
import { getModelDbcsMode, toColumnLine } from '../column.js';
import { rpgleFolding } from './rpgle.js';

export const regFolding = () => {
    monaco.languages.registerFoldingRangeProvider('rpgle', {
        provideFoldingRanges: function (model) {
            return rpgleFolding(model);
        }
    });

    monaco.languages.registerFoldingRangeProvider('rpg-indent', {
        provideFoldingRanges: function (model, context, token) {
            return rpgIndentFolding(model);
        }
    })
}

// RPG III(インデント済み)の折りたたみ。VS Code 拡張機能からも使う
export const rpgIndentFolding = (model) => {
    //console.log(model, context, token, "test");
    // 折りたたむ範囲を格納する配列
    var ranges = [];

    // 行数を取得
    var lineCount = model.getLineCount();
    const mode = getModelDbcsMode(model);

    for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
        // 行のテキストを取得(全角を含む行は桁位置どおりに読めるよう変換)
        let lineText = toColumnLine(model.getLineContent(lineNumber), mode);
        // 折りたたみ範囲の開始行を判定
        let plus = lineText.substring(27, 45).indexOf("{");
        if (plus !== -1 && lineText.substring(6, 7) !== "*" && lineText.substring(5, 6) === "C") {
            // 折りたたみ範囲が開始された
            let startLineNumber = -1;
            let endLineNumber = -1;
            startLineNumber = lineNumber;
            for (let endLineRow = startLineNumber + 1; endLineRow <= lineCount; endLineRow++) {
                let endlineText = toColumnLine(model.getLineContent(endLineRow), mode);
                if (endlineText.substring(6, 7) !== "*" && lineText.substring(5, 6) === "C") {
                    if (endlineText.substring(27, 45).substr(plus, 1) === "}") {
                        // 折りたたみ範囲が終了した
                        endLineNumber = endLineRow - 1;

                        // 折りたたみ範囲を配列に追加
                        if (startLineNumber !== -1 && endLineNumber !== -1) {
                            ranges.push({
                                start: startLineNumber,
                                end: endLineNumber
                            });
                        }
                        break;
                    }
                }
            }
        }
    }
    // 折りたたみ範囲を返す
    return ranges;
}
