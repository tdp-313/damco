import { UsingHandle } from "./fileHandle.js";
import { history } from "./history.js";
import { monaco_handleName } from "../../root.js";
import { isFileSelectSync } from "../header/header_button.js";
import { fileReadBoth, fileTypeGet, fileReadBothModel } from "./read.js";
import { pullDownEventMain } from "./newPulldown.js";
import { modelChange } from "../textmodel.js";
import { Setting } from "../../setting.js";
import * as monaco from 'monaco-editor';


export let fileListHandleSet = {};
let preFileHandleSet = {};
export const pullDownEvent = () => {
    const fileFolderPulldown = document.querySelectorAll('.control-FileFolder-pulldown');
    fileFolderPulldown.forEach((pulldown) => {
        pulldown.addEventListener('change', async (e) => {
            if (e.target.id.indexOf("normal") !== -1) { 
                pullDownEventMain(e.target.id)
                return;
            }
            let file = e.target.id.substring(e.target.id.indexOf("-") + 1, e.target.id.lastIndexOf("-"));
            let L_R = e.target.id.substring(e.target.id.lastIndexOf("-") + 1, e.target.id.length);
            let FileLR = document.getElementById('control-' + file + '-' + L_R);
            if (file === 'Library') {
                let handleName = monaco_handleName;
                await monaco_pulldownCreate(FileLR, L_R, UsingHandle[L_R].handle, 'Library');
                let FileLR_2 = document.getElementById('control-Folder-' + L_R);
                await monaco_pulldownCreate(FileLR_2, L_R, fileListHandleSet[L_R]['Library'][FileLR.value].handle, 'Folder');
                let FileLR_3 = document.getElementById('control-File-' + L_R);
                await monaco_pulldownCreate(FileLR_3, L_R, fileListHandleSet[L_R]['Folder'][FileLR_2.value].handle, 'File');
                await pullDownCreate(L_R, 'Version');
            } else if (file === 'Folder') {
                let FileLR_1 = document.getElementById('control-Library-' + L_R);
                await monaco_pulldownCreate(FileLR, L_R, fileListHandleSet[L_R]['Library'][FileLR_1.value].handle, 'Folder');
                let FileLR_3 = document.getElementById('control-File-' + L_R);
                await monaco_pulldownCreate(FileLR_3, L_R, fileListHandleSet[L_R]['Folder'][FileLR.value].handle, 'File');
                await pullDownCreate(L_R, 'Version');
            } else if (file === 'File') {
                await pullDownCreate(L_R, 'Version');
                //await monaco_pulldownCreate(FileLR, L_R, fileListHandleSet[L_R]['Folder'][FileLR.value].handle, file);
            } else if (file === 'Version') {
                const fileNameDOM = document.getElementById('control-Folder-' + [L_R]).value;
                let uri = await monaco.Uri.parse(FileLR.value);
                if (L_R === 'Left') {
                    let model2 = await modelChange('N/A', fileTypeGet(fileNameDOM, Setting.diffIndent), uri);
                    await fileReadBothModel(model2, null);
                } else if (L_R === 'Right') {
                    let model3 = await modelChange('N/A', fileTypeGet(fileNameDOM, Setting.diffIndent), uri);
                    await fileReadBothModel(null, model3);
                }
                return null;
            }
            //sync 
            if (isFileSelectSync) {
                await fileSelectSync_Process(L_R, FileLR.value, file);
                await pullDownCreate();
            }
            //await pullDownCreate();
            await fileReadBoth();
        });
    });

}

export const pullDownCreate = async (target = 'All', part = "All") => {
    let targetA = [];
    if (target === 'All') {
        targetA.push("Left");
        targetA.push("Right");
    } else {
        targetA.push(target);
    }
    let partA = [];
    if (part === 'All') {
        partA.push("Library");
        partA.push("Folder");
        partA.push("File");
        partA.push("Version");
    } else {
        partA.push(part);
    }

    for (let i = 0; i < targetA.length; i++) {
        const LibLeft = document.getElementById('control-Library-' + targetA[i]);
        if (partA.indexOf("Library") !== -1) {
            await monaco_pulldownCreate(LibLeft, targetA[i], UsingHandle[targetA[i]].handle, "Library");
        }
        const FolderLeft = document.getElementById('control-Folder-' + targetA[i]);
        if (partA.indexOf("Folder") !== -1) {
            await monaco_pulldownCreate(FolderLeft, targetA[i], fileListHandleSet[targetA[i]]["Library"][LibLeft.value].handle, "Folder");
        }
        const FileLeft = document.getElementById('control-File-' + targetA[i]);
        if (partA.indexOf("File") !== -1) {
            let path = UsingHandle[targetA[i]].handle.name + "/" + LibLeft.value + "/" + FolderLeft.value;
            await monaco_pulldownCreate(FileLeft, targetA[i], fileListHandleSet[targetA[i]]["Folder"][FolderLeft.value].handle, "File", path);
        }
        if (partA.indexOf("Version") !== -1) {
            history.reset(targetA[i].toLowerCase());
            history.pullDownCreate(targetA[i].toLowerCase(), UsingHandle[targetA[i]].handle.name, LibLeft.value, FolderLeft.value, FileLeft.value);
        }
    }
}

export async function monaco_pulldownCreate(create_target, L_R, readHandle, readKind, fullpath = "") {
    let count = 0;
    let backup_target = null;

    if (typeof (fileListHandleSet[L_R]) === 'undefined') {
        fileListHandleSet[L_R] = {};
    }
    if (create_target.value !== "") {
        backup_target = fileListHandleSet[L_R][readKind][create_target.value];
    } else {
        backup_target = { name: "" };
    }
    create_target.innerHTML = '';
    fileListHandleSet[L_R][readKind] = {};
    if (readKind === "Library") {
        fileListHandleSet[L_R].root = { handle: readHandle }
    }

    //console.time("monaco_pulldownCreate");

    let sortedHandle = new Map();
    let preFileHandleSetArray = Object.keys(preFileHandleSet);
    let promiseResults = [];
    if (preFileHandleSetArray.indexOf(fullpath) !== -1 && fullpath !== "") {
        sortedHandle = preFileHandleSet[fullpath];
    } else {
        for await (const entry of readHandle.entries()) {
            promiseResults.push(entry);
        }
        if (fullpath !== "") {
            preFileHandleSet[fullpath] = sortedHandle;
        }
    }

    await Promise.all(promiseResults.map(async ([key, value]) => {
        sortedHandle.set(key, value);
    }));
    //console.timeLog("monaco_pulldownCreate");

    let keysSortedAsc = Array.from(sortedHandle.keys()).sort((a, b) => a > b ? 1 : -1);

    for (let i = 0; i < keysSortedAsc.length; i++) {
        let handle = sortedHandle.get(keysSortedAsc[i]);
        let file_set = new monaco_file(handle, readHandle.name, readHandle.name);
        let insert = document.createElement('option');
        insert.value = file_set.name;
        insert.text = file_set.name;
        await create_target.appendChild(insert);
        fileListHandleSet[L_R][readKind][file_set.name] = file_set;
        if (backup_target.name === file_set.name) {
            create_target.selectedIndex = count;
        }
        count++;
    }
    //console.timeEnd("monaco_pulldownCreate");
    if (count === 0) {
        window.alert("No Data '" + readHandle.name + "' Handle : The folder must contain Lib/File/Member.");
        return false;
    }
}

export const fileSelectSync_Process = async (target, fullname, fileType) => {
    let reverse = target === 'Left' ? 'Right' : 'Left';
    let search_target = Object.keys(fileListHandleSet[reverse][fileType]);
    if (fileType === 'Library') {
        return null;
    }
    for (let i = 0; i < search_target.length; i++) {
        if (fileListHandleSet[target][fileType][fullname].name === fileListHandleSet[reverse][fileType][search_target[i]].name) {
            //console.log("Sync");
            let revPulldown = document.getElementById('control-' + fileType + '-' + reverse);
            revPulldown.selectedIndex = i;
            break;
        }
    }
}

export class monaco_file {
    constructor(handle, parent, file) {
        this.fullname = handle.name;
        this.prefix = this.fullname.indexOf('_') === -1 ? '' : this.fullname.substring(this.fullname.indexOf('_'), this.fullname.indexOf('.'));
        this.ext = this.fullname.substring(this.fullname.indexOf('.'), this.fullname.length);
        this.extFormat = this.fullname.substring(this.fullname.indexOf('.') + 1, this.fullname.length);
        this.handle = handle;
        this.parent = parent;
        this.file = file;
        if (this.prefix.length === 0) {
            this.name = this.fullname.substring(0, this.fullname.indexOf('.'));
            if (this.name.length === 0) {
                this.name = this.fullname;
            }
        }
        else {
            this.name = this.fullname.substring(0, Math.min(this.fullname.indexOf('.'), this.fullname.indexOf('_')));
        }
    }
}