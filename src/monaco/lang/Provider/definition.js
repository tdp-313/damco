import { getRow_DDSText } from "../syntax/dds_text.js";
import { normalRefDef } from "../../ref/other.js";
import { getRow_Text } from "../syntax/rpg_indent_text.js";
import { sourceRefDef } from "../../ref/other.js";
import { sourceRefDefStart } from "../../ref/sourceRefDef.js";
import * as monaco from 'monaco-editor';

export const regDefinition = () => {
    monaco.languages.registerDefinitionProvider('rpg-indent', {
        provideDefinition: async function (model, position) {
            let row = model.getLineContent(position.lineNumber);
            let text = getRow_Text(row, position.column);
            let wordStr = text.text.trim();
            if (wordStr === "") {
                return null;
            }
            let ranges = [];
            let rename_bk = [];
            let lineCount = model.getLineCount();
            for (let i = 1; i <= lineCount; i++) {
                let row = model.getLineContent(i);
                if (row.substring(6, 7) !== "*" && row.substring(5, 6) === "C") {
                    let op_1 = row.substring(17, 27).trim();
                    let op_m = row.substring(45, 50).trim();
                    let op_2 = row.substring(50, 60).trim();
                    let fieldLen = row.substring(67, 70).trim();
                    let result = row.substring(60, 66).trim();
                    if (op_m === 'DEFN') {
                        if (wordStr === result) {
                            ranges.push({ range: new monaco.Range(i, 5, i, 77), uri: model.uri });
                            break;
                        }
                    } else if (op_m === 'PARM') {
                    }
                    else if (op_m === 'PLIST' || op_m === 'KLIST') {
                        if (wordStr === op_1) {
                            let found = false;
                            for (let p = i + 1; p <= lineCount; p++) {
                                let row_extend = model.getLineContent(p);
                                let op_m_extend = row_extend.substring(45, 50).trim();
                                if (op_m_extend !== 'PARM' && op_m_extend !== 'KFLD') {
                                    ranges.push({ range: new monaco.Range(i, 5, p - 1, 77), uri: model.uri });
                                    found = true;
                                    break;
                                }
                            }
                            if (!found) {
                                ranges.push({ range: new monaco.Range(i, 5, i, 77), uri: model.uri });
                            }
                            break;
                        }
                    } else {
                        if (wordStr === result && fieldLen !== '') {
                            ranges.push({ range: new monaco.Range(i, 5, i, 77), uri: model.uri });
                        } else if (wordStr === result && wordStr.substring(0, 1) === "*") {
                            ranges.push({ range: new monaco.Range(i, 5, i, 77), uri: model.uri });
                        }
                    }
                    if (text.type === 'flag' || text.type === 'flag1' || text.type === 'flag2' || text.type === 'flag3') {
                        let wordStr_flag = "*IN" + wordStr;
                        let flagR = [row.substring(71, 73).trim(), row.substring(73, 75).trim(), row.substring(75, 77).trim()];
                        if (wordStr_flag === result) {
                            ranges.push({ range: new monaco.Range(i, 5, i, 77), uri: model.uri });
                        } else {
                            if (flagR.includes(wordStr)) {
                                ranges.push({ range: new monaco.Range(i, 5, i, 77), uri: model.uri });
                            }
                        }
                    }
                } else if (row.substring(6, 7) !== "*" && row.substring(5, 6) === "I") {
                    let field = row.substring(52, 58).trim();
                    if (wordStr === field) {
                        ranges.push({ range: new monaco.Range(i, 5, i, 80), uri: model.uri });
                    }
                } else if (row.substring(6, 7) !== "*" && row.substring(5, 6) === "F" && row.substring(52, 53) === "K") {
                    let field_2 = row.substring(59, 67).trim();
                    if (wordStr === field_2) {
                        for (let ri = i; ri > 0; ri--) {
                            row = model.getLineContent(ri);
                            if (row.substring(6, 7) !== "*" && row.substring(5, 6) === "F" && row.substring(52, 53) !== "K") {
                                wordStr = row.substring(6, 14).trim();
                                rename_bk.push({ range: new monaco.Range(ri, 7, ri, 16), uri: model.uri });
                                break;
                            }
                        }

                    }
                }
            }
            let refDef = await normalRefDef.get(wordStr);
            if (typeof (refDef) !== 'undefined') {
                ranges.push(refDef.location);
            } else {
                await sourceRefDefStart(model, sourceRefDef);
                let sourceDef = await sourceRefDef.get(wordStr);
                if (typeof (sourceDef) !== 'undefined') {
                    ranges.push(sourceDef.location);
                }
            }
            if (rename_bk.length > 0 && ranges.length === 0) {
                ranges = rename_bk;
            }
            return ranges;
        }
    });

    monaco.languages.registerDefinitionProvider('dds', {
        provideDefinition: async function (model, position) {
            let row = model.getLineContent(position.lineNumber);
            let text = getRow_DDSText(row, position.column);
            const wordStr = text.text.trim();
            if (wordStr === "") {
                return null;
            }
            let ranges = [];
            let refDef = await normalRefDef.get(wordStr);
            if (typeof (refDef) !== 'undefined') {
                ranges.push(refDef.location);
            }
            return ranges;
        }
    });
}
