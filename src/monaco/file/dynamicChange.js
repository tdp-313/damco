import { cacheNormal } from "../webworker/filesystem_main"
import { monaco_handleName, monaco_handleName_RefMaster } from "../../root"
import { headerFileListCreate } from "../webworker/filesystem_main"

export const dynamicChange = async (target, isRef) => {
    if (target === "Normal") {
        let nowRead = {
            root: cacheNormal.root,
            lib: document.getElementById('control-Library-normal').value,
            folder: document.getElementById('control-Folder-normal').value,
            file: document.getElementById('control-File-normal').value
        }
        if (isRef) {
            nowRead.root = monaco_handleName_RefMaster;
            headerFileListCreate(nowRead);
        } else {
            nowRead.root = monaco_handleName;
            headerFileListCreate(nowRead);
        }
    }
}