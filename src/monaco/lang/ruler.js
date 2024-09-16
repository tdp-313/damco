import { normalEditor, diffEditor } from "../monaco_root.js";
import { Setting } from "../../setting.js";

const extraRulerChange = document.getElementById('control-extraRuler');
extraRulerChange.addEventListener('click', (e) => {
    rulerChange(e.target.checked);
});

export const rulerChange = (isDisp) => {
    if (isDisp) {
        normalEditor.updateOptions({ rulers: [5, 6, 17, 27, 45, 50, 60, 66, 69, 71, 77] });
        if (Setting.diffIndent) {
            diffEditor.updateOptions({ rulers: [5, 6, 17, 27, 45, 50, 60, 66, 69, 71, 77] });
        } else {
            diffEditor.updateOptions({ rulers: [5, 6, 17, 27, 32, 42, 48, 51, 53, 59] });
        }
    } else {
        normalEditor.updateOptions({ rulers: [] });
        diffEditor.updateOptions({ rulers: [] });
    }
    const extraRulerChange = document.getElementById('control-extraRuler');
    extraRulerChange.checked = isDisp;
}