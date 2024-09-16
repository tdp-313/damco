import { linkStatus } from "./directory.js";
import { monaco_file } from "./pulldown.js";
import { file_read_text } from "./IO.js";
import { createURI, modelChange } from "../textmodel.js";
import { fileTypeGet } from "./read.js";
import { Setting } from "../../setting.js";
import { addIndent, addSpaces } from "./text_extend.js";

export class historyItemLayout {
    constructor(model) {
        this.model = model;
        this.StrURI = model.uri.toString();
        this.time = model.uri.query.substring(model.uri.query.indexOf("=") + 1, model.uri.query.length);
    }
}

const searchHandle = async (fileName, readhandle) => {
    for await (const handle of readhandle.values()) {
        if (handle.name === fileName) {
            return handle;
        }
    }
    return null;
}

const searchmemberHandle = async (lib, file, member, readhandle) => {
    let rtn = [];
    for await (const handle of readhandle.values()) {
        let tempFile = new monaco_file(handle, lib, file);
        if (tempFile.name === member) {
            rtn.push(tempFile);
        }
    }
    return rtn;
}

export class hisotoryPullodown {
    constructor() {
        this.left = new Map();
        this.right = new Map();
        this.leftDOM = document.getElementById('control-Version-Left');
        this.rightDOM = document.getElementById('control-Version-Right');
        this.left_backup = "";
        this.right_backup = "";
    }

    reset = async (lr) => {
        if (lr === 'left') {
            this.left_backup = this.leftDOM.value;
            this.left.clear();
            this.leftDOM.innerHTML = '';
        }
        else if (lr === 'right') {
            this.right_backup = this.rightDOM.value;
            this.right.clear();
            this.rightDOM.innerHTML = '';
        }
        else {
            this.left_backup = this.leftDOM.value;
            this.right_backup = this.rightDOM.value;
            this.left.clear();
            this.leftDOM.innerHTML = '';
            this.right.clear();
            this.rightDOM.innerHTML = '';
        }
    }

    applyDisplay = async () => {
        this.leftDOM.innerHTML = '';
        let l = [...this.left].sort((a, b) => {
            if (a[1].time.startsWith("★")) return -1;
            if (b[1].time.startsWith("★")) return 1;

            const numA = parseInt(a[1].time.split("__")[0], 10);
            const numB = parseInt(b[1].time.split("__")[0], 10);

            return numB - numA;
        });
        for (let i = 0; i < l.length; i++) {
            let insert = document.createElement('option');
            insert.value = l[i][1].model.uri;
            insert.text = l[i][1].time;
            this.leftDOM.appendChild(insert);
            if (l.length === 1) {
                this.leftDOM.style.appearance = "none";
                this.leftDOM.style.display = "none";
            } else {
                this.leftDOM.style.display = "block";
                this.leftDOM.style.appearance = "auto";
            }
        }
        this.rightDOM.innerHTML = '';
        let r = [...this.right].sort((a, b) => {
            if (a[1].time.startsWith("★")) return -1;
            if (b[1].time.startsWith("★")) return 1;

            const numA = parseInt(a[1].time.split("__")[0], 10);
            const numB = parseInt(b[1].time.split("__")[0], 10);

            return numB - numA;
        });
        for (let i = 0; i < r.length; i++) {
            let insert = document.createElement('option');
            insert.value = r[i][1].model.uri;
            insert.text = r[i][1].time;
            this.rightDOM.appendChild(insert);
            if (r.length === 1) {
                this.rightDOM.style.display = "none";
                //this.rightDOM.style.appearance = "none";
            } else {
                this.rightDOM.style.display = "block";
                //this.rightDOM.style.appearance = "auto";
            }
        }

    }

    register = async (lr, data) => {
        this[lr].set(data.StrURI, data);
        await this.applyDisplay();
    }


    pullDownCreate = async (lr, rootHandleName, lib, file, member) => {
        let linkStatusList = Object.keys(linkStatus);

        //RootHandle Get (History)
        let nowLinkStatusName = '';
        for (let i = 0; i < linkStatusList.length; i++) {
            if (linkStatus[linkStatusList[i]].ishandle) {
                if (linkStatus[linkStatusList[i]].handle.name === rootHandleName) {
                    nowLinkStatusName = linkStatusList[i];
                    break;
                }
            }
        }

        if (nowLinkStatusName === '') {
            return null;
        }

        let rootHisHandle = null;
        let hisHandleName = nowLinkStatusName;
        if (!hisHandleName.endsWith('-his')) {
            hisHandleName = hisHandleName + '-his';
        }
        if (linkStatus[hisHandleName].ishandle) {
            rootHisHandle = linkStatus[hisHandleName].handle;
        } else {
            return null;
        }
        let libHandle = await searchHandle(lib, rootHisHandle);
        if (libHandle === null) {
            return null;
        }
        let fileHandle = await searchHandle(file, libHandle);
        if (fileHandle === null) {
            return null;
        }
        let memberHandle = await searchmemberHandle(lib, file, member, fileHandle);
        if (memberHandle.length === 0) {
            return null;
        }

        for (let i = 0; i < memberHandle.length; i++) {
            let FileData = await file_read_text("", memberHandle[i].handle, false, "text");
            let Uri = await createURI(rootHisHandle.name, memberHandle[i].parent, memberHandle[i].file, memberHandle[i].name, FileData.time);
            let lang = fileTypeGet(memberHandle[i].file, Setting.diffIndent);
            let text = FileData.text;
            if (lang.includes('indent')) {
                text = await addIndent(text);
            } else {
                text = addSpaces(text);
            }
            let newHistoryTemp = new historyItemLayout(await modelChange(text, lang, Uri))
            this[lr].set(newHistoryTemp.StrURI, newHistoryTemp);
        }
        this.applyDisplay();
    }
}



export const history = new hisotoryPullodown();

