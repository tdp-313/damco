import { linkStatus } from "../file/directory.js";
import { fileReadStart } from "../file/read.js";
import { Setting } from "../../setting.js";
import { fileHandleChange } from "../file/fileHandle.js";
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

    dynamicHandle_Normal.addEventListener("click", (e) => dynamicChange("Normal", dynamicHandle_Normal.checked));

    const dynamicHandle_Left = document.getElementById('control-dynamic-Left');
    const dynamicHandle_Right = document.getElementById('control-dynamic-Right');
    dynamicHandle_Left.addEventListener("click", (e) => fileHandleChange("Left", dynamicHandle_Left.checked));
    dynamicHandle_Right.addEventListener("click", (e) => fileHandleChange("Right", dynamicHandle_Right.checked));

    const modeChangeCode = document.getElementById('control-EditorModeChange-code');
    modeChangeCode.addEventListener('click', (e) => {
        setModeChange('code');
    });

    const modeChangeDiff = document.getElementById('control-EditorModeChange-diff');
    modeChangeDiff.addEventListener('click', (e) => {
        setModeChange('diff');
    });
}

export const reload_Process = () => {
    if (Object.keys(linkStatus).length === 0) {
        fileReadStart(false, "init")
    }
    else {
        fileReadStart(false)
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
