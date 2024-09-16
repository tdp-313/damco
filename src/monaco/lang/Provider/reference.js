import { getRow_Text } from "../syntax/rpg_indent_text.js";
import { normalRefDef } from "../../ref/other.js";

export const regReference = () => {
    monaco.languages.registerReferenceProvider('rpg-indent', {
        provideReferences: async function (model, position) {
            let row = model.getLineContent(position.lineNumber);
            let text = getRow_Text(row, position.column);
            const wordStr = text.text.trim();
            const flag_regex = /\*IN[0-9][0-9]/;
            if (wordStr === "") {
                return null;
            }
            let ranges = [];
            let lineCount = model.getLineCount();
            for (let i = 1; i <= lineCount; i++) {
                let row = model.getLineContent(i);
                if (row.substring(6, 7) !== "*" && row.substring(5, 6) === "C" && position.lineNumber !== i) {
                    let op_1 = row.substring(17, 27).trim();
                    //let op_m = row.substring(45, 50).trim();
                    let op_2 = row.substring(50, 60).trim();
                    //let fieldLen = row.substring(67, 70).trim();
                    let result = row.substring(60, 66).trim();

                    if (wordStr === op_1 || wordStr === op_2 || wordStr === result) {
                        ranges.push({ range: new monaco.Range(i, row.indexOf(wordStr) + 1, i, row.lastIndexOf(wordStr) + wordStr.length + 1), uri: model.uri });
                    }
                    if (text.type === 'flag' || text.type === 'flag1' || text.type === 'flag2' || text.type === 'flag3') {
                        let wordStr_flag = "*IN" + wordStr;
                        let flagL = [row.substring(9, 11).trim(), row.substring(12, 14).trim(), row.substring(15, 17).trim()];
                        if (wordStr_flag === op_1 || wordStr_flag === op_2) {
                            ranges.push({ range: new monaco.Range(i, row.indexOf(wordStr_flag) + 1, i, row.lastIndexOf(wordStr_flag) + wordStr_flag.length + 1), uri: model.uri });
                        } else {
                            if (flagL.includes(wordStr)) {
                                ranges.push({ range: new monaco.Range(i, row.indexOf(wordStr_flag) + 1, i, row.lastIndexOf(wordStr_flag) + wordStr_flag.length + 1), uri: model.uri });
                            }
                        }

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
                            ranges.push({ range: new monaco.Range(i, row.indexOf(wordStr.substring(3, 5)) + 1, i, row.lastIndexOf(wordStr.substring(3, 5)) + 3), uri: model.uri });
                        }
                    }
                } else if (row.substring(6, 7) !== "*" && row.substring(5, 6) === "I") {
                    let field = row.substring(52, 58).trim();
                    if (wordStr === field) {
                        ranges.push({ range: new monaco.Range(i, row.indexOf(wordStr), i, row.indexOf(wordStr) + wordStr.length), uri: model.uri });
                    }
                }
                else if (row.substring(6, 7) !== "*" && row.substring(5, 6) === "F" && row.substring(52, 53) !== "K") {
                    let field = row.substring(6, 14).trim();
                    if (wordStr === field) {
                        ranges.push({ range: new monaco.Range(i, row.indexOf(wordStr), i, row.indexOf(wordStr) + wordStr.length), uri: model.uri });
                    }
                } else if (row.substring(6, 7) !== "*" && row.substring(5, 6) === "F" && row.substring(52, 53) === "K") {
                    let field_1 = row.substring(18, 28).trim();
                    let field_2 = row.substring(59, 67).trim();
                    if (wordStr === field_2) {
                        ranges.push({ range: new monaco.Range(i, row.indexOf(wordStr), i, row.indexOf(wordStr) + wordStr.length), uri: model.uri });
                    }
                } else if (row.substring(6, 7) !== "*" && row.substring(5, 6) === "O") {
                    let field_1 = row.substring(31, 37).trim();
                    if (wordStr === field_1) {
                        ranges.push({ range: new monaco.Range(i, 31, i, 37), uri: model.uri });
                    }
                }
            }
            //
            let refDef = await normalRefDef.get(wordStr);
            if (typeof (refDef) !== 'undefined') {
                ranges.push(refDef.location);
            }
            return ranges;
        }
    });
}