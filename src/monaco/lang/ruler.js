import { normalEditor, diffEditor } from "../monaco_root.js";
import { Setting } from "../../setting.js";

const extraRulerChange = document.getElementById('control-extraRuler');
extraRulerChange.addEventListener('click', (e) => {
    rulerChange(e.target.checked);
});

export const rulerChange = (isDisp = extraRulerChange.checked) => {
    if (isDisp) {
        normalEditor.updateOptions({ rulers: indent_ruler });
        if (Setting.diffIndent) {
            diffEditor.updateOptions({ rulers: indent_ruler });
        } else {
            diffEditor.updateOptions({ rulers: rpg_ruler });
        }
    } else {
        normalEditor.updateOptions({ rulers: [] });
        diffEditor.updateOptions({ rulers: [] });
    }
    const extraRulerChange = document.getElementById('control-extraRuler');
    extraRulerChange.checked = isDisp;
}

const rpg_ruler = [5, 6, 17, 27, 32, 42, 48, 51, 53, 59];
const indent_ruler = [5, 6, 17, 27, 45, 50, 60, 66, 69, 71, 77];