import { cache_data } from "../webworker/filesystem_main"
import { monaco_handleName, monaco_handleName_RefMaster } from "../../root"
import { headerFileListCreate, diff_headerFileListCreate } from "../webworker/filesystem_main"

export const dynamicChange = async (target, isRef) => {
    let nowRead = {
        root: cache_data[target].root,
        lib: document.getElementById('control-Library-' + target).value,
        folder: document.getElementById('control-Folder-' + target).value,
        file: document.getElementById('control-File-' + target).value
    }
    if (target === 'normal') {
        if (isRef) {
            nowRead.root = monaco_handleName_RefMaster;
            headerFileListCreate(nowRead);
        } else {
            nowRead.root = monaco_handleName;
            headerFileListCreate(nowRead);
        }
    } else {
        let parm = {};
        parm[target] = nowRead;
        if (isRef) {
            nowRead.root = monaco_handleName_RefMaster;
            diff_headerFileListCreate(parm);
        } else {
            nowRead.root = monaco_handleName;
            diff_headerFileListCreate(parm);
        }
    }
}