import { Setting } from "../../setting.js";
import { initReloadButton } from "./updateButton.js";
import { searchOpen } from "./searchOpen.js";
import { otherTabsOpenInit } from "./otherTabsOpen.js";
import { pullDownEvent } from "../file/pulldown.js";
import { extraControlClick } from "../sidebar/open.js";
import { normalEditor, diffEditor } from "../monaco_root.js";
import { wakeLockInit } from "./otherTabsOpen.js";
import { dynamicChange } from "../file/dynamicChange.js";

import link_off_svg from "../../icon/link-off.svg"
import link_on_svg from "../../icon/link.svg"
import { readEditorStatus } from "../monaco_root.js";
import { diff_headerFileListCreate, headerFileListCreate } from "../webworker/filesystem_main.js";
import { nowReadFilePath } from "../webworker/filesystem_main.js";

export let isFileSelectSync = true;

export const readFileButtonCreate = () => {
    initReloadButton();
    otherTabsOpenInit();
    searchOpen();
    pullDownEvent();
    wakeLockInit(Setting.getWakeLock);
    const initReadButton = document.getElementById('control-initRead');
    initReadButton.addEventListener('click', async (event) => {
        Setting.setInitRead = initReadButton.checked;
    });

    const diffIndentButton = document.getElementById('control-diffExtension');
    diffIndentButton.addEventListener('click', async (event) => {
        Setting.setdiffIndent = diffIndentButton.checked;
        reload_Process();
    });

    const fileSelectSync = document.getElementById('control-FileSelectSync');
    fileSelectSync.addEventListener('click', async (e) => {
        if (isFileSelectSync) {
            //On => Off
            isFileSelectSync = false;
            e.target.src = link_off_svg;

        } else {
            //Off => On
            isFileSelectSync = true;
            e.target.src = link_on_svg;
        }
    });
    const dynamicHandle_Normal = document.getElementById('control-dynamic-normal');
    const dynamicHandle_Left = document.getElementById('control-dynamic-left');
    const dynamicHandle_Right = document.getElementById('control-dynamic-right');

    dynamicHandle_Normal.addEventListener("click", () => dynamicChange("normal", dynamicHandle_Normal.checked));
    dynamicHandle_Left.addEventListener("click", () => dynamicChange("left", dynamicHandle_Left.checked));
    dynamicHandle_Right.addEventListener("click", () => dynamicChange("right", dynamicHandle_Right.checked));

    const modeChangeCode = document.getElementById('control-EditorModeChange-code');
    modeChangeCode.addEventListener('click', (e) => {
        setModeChange('code');
        if (!readEditorStatus.normal) {
            headerFileListCreate({});
            readEditorStatus.normal = true;
        }
    });

    const modeChangeDiff = document.getElementById('control-EditorModeChange-diff');
    modeChangeDiff.addEventListener('click', (e) => {
        setModeChange('diff');
        if (!readEditorStatus.diff) {
            diff_headerFileListCreate();
            readEditorStatus.diff = true;
        }
    });
}

export const reload_Process = async () => {
    const modeChangeCode = document.getElementById('control-EditorModeChange-code');
    const modeChangeDiff = document.getElementById('control-EditorModeChange-diff');
    if (modeChangeCode.checked) {
        let model = await normalEditor.getModel();
        model.otherData.createSkip = false;
        await headerFileListCreate(nowReadFilePath('normal'));
    }
    if (modeChangeDiff.checked) {
        let leftModel = await diffEditor.getOriginalEditor().getModel();
        leftModel.otherData.createSkip = false;
        let rightModel = await diffEditor.getModifiedEditor().getModel();
        rightModel.otherData.createSkip = false;
        let parm = { left: nowReadFilePath('left'), right: nowReadFilePath('right') };
        await diff_headerFileListCreate(parm)
    }
}

export const setModeChange = (mode) => {
    let normalElem = document.querySelectorAll('.header-normalEditor');
    let diffElem = document.querySelectorAll('.header-diffEditor');

    if (mode === 'code') {
        document.getElementById('monaco-code').style.display = 'block';
        document.getElementById('monaco-diff').style.display = 'none';
        normalElem.forEach((elem) => {
            elem.style.display = 'flex';
        });
        diffElem.forEach((elem) => {
            elem.style.display = 'none';
        });
        normalEditor.layout();
        extraControlClick(false, "init");
        document.getElementById('control-EditorModeChange-code').checked = true;
    } else {
        document.getElementById('monaco-code').style.display = 'none';
        document.getElementById('monaco-diff').style.display = 'block';
        normalElem.forEach((elem) => {
            elem.style.display = 'none';
        });
        diffElem.forEach((elem) => {
            elem.style.display = 'flex';
        });
        diffEditor.layout();
        extraControlClick(true);
        document.getElementById('control-EditorModeChange-diff').checked = true;
    }
}
