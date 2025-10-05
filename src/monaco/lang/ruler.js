import { normalEditor, diffEditor } from "../monaco_root.js";
import { Setting } from "../../setting.js";
import { INLAY_CUT_LENGTH } from "./Provider/inLay.js";
import { DIFF_INDENT_INLAY_DISP } from "./Provider/inLay.js";

const extraRulerChange = document.getElementById('control-extraRuler');
extraRulerChange.addEventListener('click', (e) => {
    //rulerChange(e.target.checked);
    Setting.setInLayhint = e.target.checked;
    rulerChange(true, e.target.checked);
});

export const rulerChange = (isDisp, inLay) => {
    if (isDisp) {
        if (inLay) {
            normalEditor.updateOptions({ rulers: indent_InLayRuler });
        } else {
            normalEditor.updateOptions({ rulers: indent_ruler });
        }

        if (Setting.diffIndent) {
            if (inLay && DIFF_INDENT_INLAY_DISP) {
                diffEditor.updateOptions({ rulers: indent_InLayRuler });
            } else {
                diffEditor.updateOptions({ rulers: indent_ruler });
            }
        } else {
            diffEditor.updateOptions({ rulers: rpg_ruler });
        }
    } else {
        normalEditor.updateOptions({ rulers: [] });
        diffEditor.updateOptions({ rulers: [] });
    }
}

const rpg_ruler = [5, 6, 17, 27, 32, 42, 48, 51, 53, 59];
const indent_ruler = [5, 6, 17, 27, 45, 50, 60, 66, 69, 71, 77];

const indent_InLayRuler = [5, 6, 17, 27 + INLAY_CUT_LENGTH, 46 + INLAY_CUT_LENGTH, 51 + (INLAY_CUT_LENGTH), 62 + (INLAY_CUT_LENGTH * 2), 68 + (INLAY_CUT_LENGTH * 2), 69 + (INLAY_CUT_LENGTH * 3), 72 + (INLAY_CUT_LENGTH * 3), 78 + (INLAY_CUT_LENGTH * 3)];
