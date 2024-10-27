import { Setting } from "../setting.js";
import { monacoLang } from "./lang/lang_root.js";
import { fileReadStart } from "./file/read.js";
import { extraControlClick } from "./sidebar/open.js";
import { themeDiffApply, themeApply } from "./theme/theme.js";
import { setModeChange } from "./header/header_button.js";
import { rulerChange } from "./lang/ruler.js";
import * as monaco from 'monaco-editor';
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";

//
import darkTherme from "./theme/dark_1.json"

import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";


self.MonacoEnvironment = {
    getWorker(_, label) {
        if (label === "json") {
            return new jsonWorker();
        }
        if (label === "css" || label === "scss" || label === "less") {
            return new cssWorker();
        }
        if (label === "html" || label === "handlebars" || label === "razor") {
            return new htmlWorker();
        }
        if (label === "typescript" || label === "javascript") {
            return new tsWorker();
        }
        return new editorWorker();
    },
};

export let normalEditor = null;
export let diffEditor = null;

export const monacoStart = async () => {
    monacoLang();
    monaco.editor.defineTheme('myTheme', darkTherme);
    
    const editorOptionGeneral = {
        language: 'vb',
        mouseWheelZoom: true,
        scrollBeyondLastLine: false,
        locale: 'ja',
        theme: "myTheme",
        definitionLinkOpensInPeek: true,
        stickyScroll: {
            enabled: true,
        },
        readOnly: true,
    };

    normalEditor = monaco.editor.create(document.getElementById('monaco-code'), {
        automaticLayout: true,
    });

    normalEditor.updateOptions(editorOptionGeneral);
    diffEditor = monaco.editor.createDiffEditor(document.getElementById('monaco-diff'), {
        renderSideBySide: true,
        enableSplitViewResizing: false,
        autoSurround: 'brackets',
        automaticLayout: true,
    });
    rulerChange(document.getElementById('control-extraRuler').checked);
    if (Setting.getInitRead) {
        fileReadStart(false, "init");
    }
    diffEditor.updateOptions(editorOptionGeneral);

    document.getElementById('monaco-code').style.display = 'block';
    document.getElementById('monaco-diff').style.display = 'none';

    const modeChangeCode = document.getElementById('control-EditorModeChange-code');
    modeChangeCode.addEventListener('click', (e) => {
        setModeChange('code');
        normalEditor.layout();
        extraControlClick(false, "init");
    });

    const modeChangeDiff = document.getElementById('control-EditorModeChange-diff');
    modeChangeDiff.addEventListener('click', (e) => {
        setModeChange('diff');
        diffEditor.layout();
        extraControlClick(true);
    });

    extraControlClick(false, "init");

    let isInsert = true;
    const insertChange = document.getElementById('control-extraInsertText');
    insertChange.addEventListener('click', (e) => {
        isInsert = e.target.checked;
        insertIconUpdate();
    });
    const insertIconUpdate = () => {
        if (isInsert) {
            normalEditor.updateOptions({ cursorStyle: "line-thin" });
        } else {
            normalEditor.updateOptions({ cursorStyle: "block" });
        }
        insertChange.checked = isInsert;
    }

    const readOnlyChange = (isWrite) => {
        if (isWrite) {
            normalEditor.updateOptions({ readOnly: false });
            diffEditor.updateOptions({ readOnly: false });

        } else {
            normalEditor.updateOptions({ readOnly: true });
            diffEditor.updateOptions({ readOnly: true });
        }
        const extraReadOnly = document.getElementById('control-extraReadOnly');
        extraReadOnly.checked = isWrite;
    }

    const extraReadOnlyChange = document.getElementById('control-extraReadOnly');
    extraReadOnlyChange.addEventListener('click', (e) => {
        readOnlyChange(e.target.checked);
    });

    themeDiffApply(Setting.getDiffTheme);
    themeApply(Setting.getTheme);

    const reIndentProcess = () => {
        const model = normalEditor.getModel();
        const fullRange = model.getFullModelRange();
        const text = model.getValue();
        const lines = text.split("\n");
        const changeOperation = {
            range: fullRange,
            text: addIndent(revIndent(lines))
        };
        model.pushEditOperations([], [changeOperation], null);
    }

    const spaceInputEnter = async () => {
        var model = await normalEditor.getModel();

        var position = normalEditor.getPosition();

        // テキストを更新する
        var editOperation = {
            range: new monaco.Range(position.lineNumber + 1, 1, position.lineNumber + 1, 1),
            text: " ".repeat(128) + "\n",
        };
        model.pushEditOperations([], [editOperation], null);
        normalEditor.setPosition({
            lineNumber: position.lineNumber + 1,
            column: 6
        });
    }

    normalEditor.onKeyDown(function (e) {
        if (e.code === 'Insert') {
            isInsert = !isInsert;
            insertIconUpdate();
        } else if (e.code === 'Enter') {
            if (extraReadOnlyChange.checked) {
                spaceInputEnter();
                e.stopPropagation();
                e.preventDefault();
                reIndentProcess();
            }
            return null;
        }
        if (isInsert === true) {
            return null;
        }
        // Overwriteしたいテキストを取得する
        if (e.browserEvent.key.length !== 1 || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) {
            //e.preventDefault();
            return;
        }
        let overwriteText = e.browserEvent.key;
        // カーソル位置を取得する
        var position = normalEditor.getPosition();
        var model = normalEditor.getModel();

        // テキストを更新する
        var editOperation = {
            range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column + 1),
            text: overwriteText
        };
        model.pushEditOperations([], [editOperation], null);

        // カーソル位置を更新する
        normalEditor.setPosition({
            lineNumber: position.lineNumber,
            column: position.column + 1
        });

        // デフォルトの動作をキャンセルする
        e.preventDefault();
    });

    normalEditor.addAction({
        id: "rpg_reIndent",
        label: "再インデント処理",
        run: () => { reIndentProcess() }
    });

}

export const loadingPopUpClose = () => {
    const dialog = document.getElementById('loadingPopUp');
    dialog.close();
    dialog.remove();
}
