import { monaco_handleName, monaco_handleName_RefMaster } from "../../root.js";
import { linkStatus } from "./directory.js";
import { pullDownCreate } from "./pulldown.js";
import { fileSelectSync_Process, fileListHandleSet } from "./pulldown.js";
import { fileReadBoth } from "./read.js";

export let UsingHandle = {};

export const fileHandleChange = async (toggle_LR = "Init", mode = false) => {
    if (Object.keys(UsingHandle).length === 0) {
        UsingHandle = { Left: { type: monaco_handleName, handle: null, name: monaco_handleName }, Right: { type: monaco_handleName, handle: null, name: monaco_handleName } }
    }

    if (toggle_LR === "init") {
        UsingHandle.Left.handle = linkStatus[monaco_handleName].handle;
        UsingHandle.Left.type = monaco_handleName;
        UsingHandle.Right.handle = linkStatus[monaco_handleName].handle;
        UsingHandle.Right.type = monaco_handleName;

        return;
    } else if (toggle_LR === "reSync") {
        return;
    }

    if (linkStatus[monaco_handleName_RefMaster].ishandle) {
        if (mode) {
            UsingHandle[toggle_LR].handle = linkStatus[monaco_handleName_RefMaster].handle;
            UsingHandle[toggle_LR].type = monaco_handleName_RefMaster;
        } else {
            UsingHandle[toggle_LR].handle = linkStatus[monaco_handleName].handle;
            UsingHandle[toggle_LR].type = monaco_handleName;
        }
        await pullDownCreate(toggle_LR, "Library");
        let reverse = toggle_LR === 'Left' ? 'Right' : 'Left';
        let FileLR_1 = document.getElementById('control-Library-' + reverse);
        let FileLR_2 = document.getElementById('control-Folder-' + reverse);
        let FileLR_3 = document.getElementById('control-File-' + reverse);
        //Library
        let search_target = Object.keys(fileListHandleSet[toggle_LR].Library);
        for (let i = 0; i < search_target.length; i++) {
            if (search_target[i].indexOf(fileListHandleSet[reverse].Library[FileLR_1.value].name.substring(0, 3)) !== -1) {
                let targetLib = document.getElementById('control-Library-' + toggle_LR);
                targetLib.selectedIndex = i;
                break;
            }
        }
        //File
        await pullDownCreate(toggle_LR, "Folder");
        await fileSelectSync_Process(reverse, FileLR_2.value, "Folder");
        await pullDownCreate(toggle_LR, "File");
        await fileSelectSync_Process(reverse, FileLR_3.value, "File");
        await pullDownCreate(toggle_LR, 'Version');
        await pullDownCreate(reverse, 'Version');
        await fileReadBoth();
    } else {
        UsingHandle.Left.handle = linkStatus[monaco_handleName].handle;
        UsingHandle.Left.type = "normal";
        UsingHandle.Right.handle = linkStatus[monaco_handleName].handle;
        UsingHandle.type = "normal";
    }
}