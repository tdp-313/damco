import { getRow_TextJs } from "../syntax/rpg_indent_text.js";
import { getModelDbcsMode, toColumnLine, ibmToJsColumn } from "../column.js";
import { rpgleReferences } from "./rpgle.js";
import * as monaco from 'monaco-editor';

export const regReference = () => {
    monaco.languages.registerReferenceProvider('rpgle', {
        provideReferences: async function (model, position) {
            return rpgleReferences(model, position);
        }
    });

    monaco.languages.registerReferenceProvider('rpg-indent', {
        provideReferences: async function (model, position) {
            return rpgIndentReferences(model, position);
        }
    });
}

// RPG III(インデント済み)の参照検索。VS Code 拡張機能からも使う
export const rpgIndentReferences = async (model, position) => {
    const mode = getModelDbcsMode(model);
    let row = model.getLineContent(position.lineNumber);
    let text = getRow_TextJs(row, position.column, mode);
    const wordStr = text.text.trim();
    const flag_regex = /\*IN[0-9][0-9]/;
    let FlagSearchStr = "";
    if (wordStr === "") {
        return null;
    }
    let ranges = [];
    let lineCount = model.getLineCount();
    for (let i = 1; i <= lineCount; i++) {
        const original = model.getLineContent(i);
        // row は「インデックス = 桁-1」の行。範囲は js() で元の行の位置に戻す
        let row = toColumnLine(original, mode);
        const js = (column) => ibmToJsColumn(original, column, mode);
        if (row.substring(6, 7) !== "*" && row.substring(5, 6) === "C" && position.lineNumber !== i) {
            let op_1 = row.substring(17, 27).trim();
            //let op_m = row.substring(45, 50).trim();
            let op_2 = row.substring(50, 60).trim();
            //let fieldLen = row.substring(67, 70).trim();
            let result = row.substring(60, 66).trim();

            if (wordStr === op_1 || wordStr === op_2 || wordStr === result) {
                ranges.push({ range: new monaco.Range(i, js(row.indexOf(wordStr) + 1), i, js(row.lastIndexOf(wordStr) + wordStr.length + 1)), uri: model.uri });
            }
            if (text.type === 'flag' || text.type === 'flag1' || text.type === 'flag2' || text.type === 'flag3') {
                let wordStr_flag = "*IN" + wordStr;
                let flagL = [row.substring(9, 11).trim(), row.substring(12, 14).trim(), row.substring(15, 17).trim()];
                if (wordStr_flag === op_1 || wordStr_flag === op_2) {
                    ranges.push({ range: new monaco.Range(i, js(row.indexOf(wordStr_flag) + 1), i, js(row.lastIndexOf(wordStr_flag) + wordStr_flag.length + 1)), uri: model.uri });
                } else {
                    if (flagL.includes(wordStr)) {
                        ranges.push({ range: new monaco.Range(i, js(row.indexOf(wordStr_flag) + 1), i, js(row.lastIndexOf(wordStr_flag) + wordStr_flag.length + 1)), uri: model.uri });
                    }
                }
                FlagSearchStr = wordStr_flag;
            }
            if (flag_regex.test(wordStr)) {
                let flag = [];
                flag.push(row.substring(9, 11));
                flag.push(row.substring(12, 14));
                flag.push(row.substring(15, 17));
                flag.push(row.substring(71, 73));
                flag.push(row.substring(73, 75));
                flag.push(row.substring(75, 77));
                if (flag.includes(wordStr.substring(3, 5))) {
                    ranges.push({ range: new monaco.Range(i, js(row.indexOf(wordStr.substring(3, 5)) + 1), i, js(row.lastIndexOf(wordStr.substring(3, 5)) + 3)), uri: model.uri });
                }
                FlagSearchStr = wordStr;
            }
        } else if (row.substring(6, 7) !== "*" && row.substring(5, 6) === "I") {
            let field = row.substring(52, 58).trim();
            if (wordStr === field) {
                ranges.push({ range: new monaco.Range(i, js(row.indexOf(wordStr)), i, js(row.indexOf(wordStr) + wordStr.length)), uri: model.uri });
            }
        }
        else if (row.substring(6, 7) !== "*" && row.substring(5, 6) === "F" && row.substring(52, 53) !== "K") {
            let field = row.substring(6, 14).trim();
            if (wordStr === field) {
                ranges.push({ range: new monaco.Range(i, js(row.indexOf(wordStr)), i, js(row.indexOf(wordStr) + wordStr.length)), uri: model.uri });
            }
        } else if (row.substring(6, 7) !== "*" && row.substring(5, 6) === "F" && row.substring(52, 53) === "K") {
            let field_1 = row.substring(18, 28).trim();
            let field_2 = row.substring(59, 67).trim();
            if (wordStr === field_2) {
                ranges.push({ range: new monaco.Range(i, js(row.indexOf(wordStr)), i, js(row.indexOf(wordStr) + wordStr.length)), uri: model.uri });
            }
        } else if (row.substring(6, 7) !== "*" && row.substring(5, 6) === "O") {
            let field_1 = row.substring(31, 37).trim();
            if (wordStr === field_1) {
                ranges.push({ range: new monaco.Range(i, js(31), i, js(37)), uri: model.uri });
            }
        }
    }
    //
    let refDef = await model.otherData.normalRefDef.get(wordStr);
    if (typeof (refDef) !== 'undefined') {
        for (let i = 0; i < refDef.length; i++) {
            ranges.push(refDef[i].location);
        }
    }
    if (FlagSearchStr !== "") {
        let flagRef = await model.otherData.otherFileFlagReference.get(FlagSearchStr);
        if (typeof (flagRef) !== 'undefined') {
            for (let i = 0; i < flagRef.length; i++){
                ranges.push(flagRef[i].location);
            }
        }
    }
    return ranges;
}
