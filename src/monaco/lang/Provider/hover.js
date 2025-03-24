import { getRow_Text } from "../syntax/rpg_indent_text.js";
import { getRow_DDSText } from "../syntax/dds_text.js";
import { tip_dds } from "../syntax/dds_text.js";
import { tip_rpg } from "../syntax/rpg_indent_text.js";
import { sourceRefDefStart } from "../../ref/sourceRefDef.js";
import * as monaco from 'monaco-editor';

export const regHover = () => {
    monaco.languages.registerHoverProvider('rpg-indent', {
        provideHover: async function (model, position) {
            // 変数名の取得
            let word = model.getWordAtPosition(position);
            if (!word) {
                return null;
            };
            let row = model.getLineContent(position.lineNumber);
            let text = getRow_Text(row, position.column);
            const wordStr = text.text.trim();
            if (wordStr.length === 0) {
                return null;
            }
            //rpg-source create
            model.otherData.sourceRefDef = await sourceRefDefStart(model);

            let tooltip_text = await hoverTextCreate(text, wordStr, "rpg-indent", model);
            // ホバー情報の作成
            return {
                range: new monaco.Range(position.lineNumber, text.startColumn, position.lineNumber, text.endColumn),
                contents: [
                    { value: tooltip_text[0] },
                    { value: tooltip_text[1] },
                    { value: tooltip_text[2] }
                ]
            };
        }
    });
    monaco.languages.registerHoverProvider('dds', {
        provideHover: async function (model, position) {
            // 変数名の取得
            let word = model.getWordAtPosition(position);
            if (!word) {
                return null;
            };
            let row = model.getLineContent(position.lineNumber);
            let text = getRow_DDSText(row, position.column);

            const wordStr = text.text.trim();
            if (wordStr.length === 0) {
                return null;
            }
            let tooltip_text = await hoverTextCreate(text, wordStr, "dds", model);
            // ホバー情報の作成
            return {
                range: new monaco.Range(position.lineNumber, text.startColumn, position.lineNumber, text.endColumn),
                contents: [
                    { value: tooltip_text[0] },
                    { value: tooltip_text[1] },
                    { value: tooltip_text[2] }
                ]
            };
        }
    });
}

const hoverTextCreate = async (text, wordStr, lang, model) => {
    let tooltip_text = ["", "", ""];
    let target = 'tip_' + text.type;
    let tipSrc = lang === "dds" ? tip_dds[target] : tip_rpg[target];
    if (tipSrc.type === "fixed") {
        tooltip_text[0] = '**' + wordStr + '**';
        tooltip_text[1] = tipSrc.description;
    } else if (tipSrc.type === "simpleDetail") {
        let tip = tipSrc.detail[text.text.trim()];
        if (typeof (tip) === "undefined") {
            tooltip_text[0] = '**' + tipSrc.name + " : " + wordStr + '**';
            tooltip_text[1] = tipSrc.description
        } else {
            tooltip_text[0] = '**' + tip.name + " : " + wordStr + '**';
            tooltip_text[1] = tip.description;
            if (typeof (tip.description2) !== 'undefined') {
                tooltip_text[2] = tip.description2;
            }
        }
    } else if (tipSrc.type === "Detail_2") {
        let tip = tipSrc.detail[text.text];
        tooltip_text[0] = '**' + tipSrc.name + " : " + wordStr + '**';
        tooltip_text[1] = tip.description;
    } else if (tipSrc.type === "substr") {
        let tip = tipSrc.detail[text.text.substring(0, tipSrc.len)];
        tooltip_text[0] = '**' + tipSrc.name + " : " + wordStr + '**';
        tooltip_text[1] = tip.description;
    } else if (tipSrc.type === "auto-fixed") {
        tooltip_text[0] = '**' + wordStr + '**';
        let refDef = await model.otherData.normalRefDef.get(wordStr);
        if (typeof (refDef) !== 'undefined') {
            for (let i = 0; i < refDef.length; i++) {
                if (refDef[i].description !== "") {
                    tooltip_text[1] = refDef[i].description;
                    break;
                }
            }
        } else {
            let sourceDef = await model.otherData.sourceRefDef.get(wordStr);
            if (typeof (sourceDef) !== 'undefined') {
                tooltip_text[1] = sourceDef.description;
            } else {
                tooltip_text[1] = tipSrc.description;
            }
        }
    }
    return tooltip_text;
}