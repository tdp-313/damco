import * as monaco from 'monaco-editor';
import { getRow_Text } from '../syntax/rpg_indent_text';
import { hoverTextCreate } from './hover';
import { Setting } from '../../../setting';

export const INLAY_CUT_LENGTH = 14;

export const DIFF_INDENT_INLAY_DISP = false

export const regInlayHints = () => {
    monaco.languages.registerInlayHintsProvider('rpg-indent', {
        provideInlayHints: async function (model, range, token) {
            const hints = [];
            const lineCount = model.getLineCount();
            
            //Diff Editor then
            if (!DIFF_INDENT_INLAY_DISP && document.getElementById('control-EditorModeChange-diff').checked) {
                return { hints: [], dispose: () => { } };
            }

            if (model.otherData.isComplete === false || Setting.getInLayhint === false) {
                return { hints: [], dispose: () => { } };
            }

            for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
                const lineText = model.getLineContent(lineNumber);
                if (lineText.substring(6, 7) === "*") {
                    continue;
                }
                else if (lineText.substring(5, 6) === "C") {
                    for (let i = 0; i < POSITION_C.length; i++) {
                        hints.push(await createInLaytData(model, lineText, POSITION_C[i], lineNumber));
                    }
                } else if (lineText.substring(5, 6) === "I") {
                    for (let i = 0; i < POSITION_I.length; i++) {
                        hints.push(await createInLaytData(model, lineText, POSITION_I[i], lineNumber));
                    }
                } else if (lineText.substring(5, 6) === "F") {
                    for (let i = 0; i < POSITION_F.length; i++) {
                        hints.push(await createInLaytData(model, lineText, POSITION_F[i], lineNumber));
                    }
                } else if (lineText.substring(5, 6) === "O") {
                    for (let i = 0; i < POSITION_O.length; i++) {
                        hints.push(await createInLaytData(model, lineText, POSITION_O[i], lineNumber));
                    }
                }
            }

            return { hints: hints, dispose: () => { } };
        }
    });
};

const createInLaytData = async (model, lineText, col, row) => {
    let divP = getRow_Text(lineText, col);

    const wordStr = divP.text.trim();
    let cutLength = INLAY_CUT_LENGTH;
    if (lineText.substring(5, 6) === "F") {
        cutLength = 40;
    }

    let hint = {
        label: formatInlayHintLabel("", cutLength), // 表示するテキスト
        position: { lineNumber: row, column: divP.endColumn },
        kind: monaco.languages.InlayHintKind.Parameter,
        paddingLeft: true,
        paddingRight: true,
    }

    if (wordStr.length === 0) {
        return hint;
    }

    let tooltip_text = await hoverTextCreate(divP, wordStr, "rpg-indent", model);
    if (tooltip_text[3] === "") {
        return hint;
    }

    hint.label = [
        {
            label: formatInlayHintLabel(tooltip_text[3].s_description, cutLength), tooltip: tooltip_text[1]
        }
    ];
    return hint;
}


const formatInlayHintLabel = (text, cutLength) => {
    if (text.length <= cutLength) {
        return text + " ".repeat(cutLength - text.length);
    } else {
        return text.substring(0, cutLength);
    }
};

const POSITION_C = [18, 51, 61];
const POSITION_I = [53];
const POSITION_F = [7];
const POSITION_O = [33];