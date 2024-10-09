import { linkStatus } from "../file/directory.js";
import { fileReadStart } from "../file/read.js";
import { Setting } from "../../setting.js";
import { fileHandleChange } from "../file/fileHandle.js";
import { initReloadButton } from "./updateButton.js";
import { searchOpen } from "./searchOpen.js";
import { otherTabsOpenInit } from "./otherTabsOpen.js";
import { pullDownEvent } from "../file/pulldown.js";

import link_off_svg from "../../icon/link-off.svg"
import link_on_svg from "../../icon/link.svg"

export let isFileSelectSync = true;

export const readFileButtonCreate = () => {
    initReloadButton();
    otherTabsOpenInit();
    searchOpen();
    pullDownEvent();
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

    const dynamicHandle_Left = document.getElementById('control-dynamic-Left');
    const dynamicHandle_Right = document.getElementById('control-dynamic-Right');
    dynamicHandle_Left.addEventListener("click", (e) => fileHandleChange("Left", dynamicHandle_Left.checked));
    dynamicHandle_Right.addEventListener("click", (e) => fileHandleChange("Right", dynamicHandle_Right.checked));
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
    if (mode === 'code') {
        document.getElementById('monaco-code').style.display = 'block';
        document.getElementById('monaco-diff').style.display = 'none';
    } else {
        document.getElementById('monaco-code').style.display = 'none';
        document.getElementById('monaco-diff').style.display = 'block';
    }
}