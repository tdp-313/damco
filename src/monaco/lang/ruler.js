import { normalEditor, diffEditor } from "../monaco_root.js";
import { Setting } from "../../setting.js";

let rpgleRulerUpdate = () => { };

const extraRulerChange = document.getElementById('control-extraRuler');
extraRulerChange.addEventListener('click', (e) => {
    Setting.setRuler = e.target.checked;
    rulerChange(e.target.checked);
    rpgleRulerUpdate();
});

export const rulerChange = (isDisp) => {
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
}

// RPGLE: 仕様書ごとに欄の位置が違うので、カーソル行の仕様書に合わせて切り替える(各欄の最終桁)
const RPGLE_RULERS = {
    H: [5, 6, 80],
    F: [5, 6, 16, 17, 18, 19, 20, 35, 42, 43, 80],
    D: [5, 6, 21, 22, 23, 25, 32, 39, 40, 42, 43, 80],
    P: [5, 6, 21, 24, 43, 80],
    C: [5, 6, 8, 11, 25, 35, 49, 63, 68, 70, 76, 80],
    I: [5, 6, 16, 30, 48, 62, 80],
    O: [5, 6, 16, 29, 43, 52, 80],
    free: [5, 7, 80],
};

export const initRpgleRuler = (editor) => {
    let active = false;
    let lastKey = '';
    const update = () => {
        const model = editor.getModel();
        if (!model || model.getLanguageId() !== 'rpgle') {
            if (active) {
                active = false;
                lastKey = '';
                rulerChange(Setting.getRuler);
            }
            return;
        }
        if (!Setting.getRuler) {
            lastKey = '';
            return;
        }
        active = true;
        const position = editor.getPosition();
        if (!position) {
            return;
        }
        let key = 'none';
        if (!/^\*\*free/i.test(model.getLineContent(1))) {
            const spec = model.getLineContent(position.lineNumber).charAt(5).toUpperCase();
            key = RPGLE_RULERS[spec] ? spec : 'free';
        }
        if (key === lastKey) {
            return;
        }
        lastKey = key;
        editor.updateOptions({ rulers: key === 'none' ? [] : RPGLE_RULERS[key] });
    };
    rpgleRulerUpdate = update;
    editor.onDidChangeCursorPosition(update);
    editor.onDidChangeModel(update);
    editor.onDidChangeModelLanguage(update);
};

const rpg_ruler = [5, 6, 17, 27, 32, 42, 48, 51, 53, 59];
const indent_ruler = [5, 6, 17, 27, 45, 50, 60, 66, 69, 71, 77];
