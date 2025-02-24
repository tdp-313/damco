import { Directory_Handle_RegisterV2 } from "./directory.js";
import { monaco_handleName, monaco_handleName_RefMaster, monaco_handleName_his, monaco_handleName_RefMaster_his } from "../../root.js";
import { fileHandleChange } from "./fileHandle.js";
import { pullDownCreate, monaco_file, fileListHandleSet } from "./pulldown.js";
import { file_read_text } from "./IO.js";
import { addIndent, addSpaces } from "./text_extend.js";
import { modelChange, textModelEditorApply, createURI } from "../textmodel.js";
import { rulerChange } from "../lang/ruler.js";
import { Setting } from "../../setting.js";
import { history, historyItemLayout } from "./history.js";
import { diffEditor, normalEditor } from "../monaco_root.js";

export const fileReadStart = async (isNew = false, init = "reSync") => {

    await Directory_Handle_RegisterV2(monaco_handleName, isNew);
    await Directory_Handle_RegisterV2(monaco_handleName_his, false, 'read');

    await Directory_Handle_RegisterV2(monaco_handleName_RefMaster, false, 'read');
    await Directory_Handle_RegisterV2(monaco_handleName_RefMaster_his, false, 'read');

    fileHandleChange(init);

    await pullDownCreate();
    await fileReadBoth();
}

export const fileReadBothModel = async (diff1, diff2) => {
    if (diff1 === null) {
        diff1 = await diffEditor.getModel().original;
    }
    if (diff2 === null) {
        diff2 = await diffEditor.getModel().modified;
    }
    if (diff1 === null || diff2 === null) {
        return null;
    }

    await textModelEditorApply( diff1, diff2);
    rulerChange(document.getElementById('control-extraRuler').checked);
}

export const fileReadBoth = async () => {
    const FileLeft = document.getElementById('control-File-Left');
    const FileRight = document.getElementById('control-File-Right');
    const FolderLeft = document.getElementById('control-Folder-Left');
    const FolderRight = document.getElementById('control-Folder-Right');

    let Left = fileListHandleSet.Left.File[FileLeft.value];
    let Right = fileListHandleSet.Right.File[FileRight.value];
    const control_LibLeft = document.getElementById('control-Library-Left');
    const control_LibRight = document.getElementById('control-Library-Right');

    let LeftFile = await file_read_text(Left.fullname, Left.handle, false, "text", false);
    let RightFile = await file_read_text(Right.fullname, Right.handle, false, "text", false);

    let LeftFileName = FileLeft.value.indexOf('.') !== -1 ? FileLeft.value.substring(0, FileLeft.value.indexOf('.')) : FileLeft.value;
    let RightFileName = FileRight.value.indexOf('.') !== -1 ? FileRight.value.substring(0, FileRight.value.indexOf('.')) : FileRight.value;
    let modelLang = [fileTypeGet(FolderLeft.value), fileTypeGet(FolderLeft.value, Setting.diffIndent), fileTypeGet(FolderRight.value, Setting.diffIndent)];
    let lang = [
        {//Normal Editor
            lang: modelLang[0],
            formattedText: LeftFile.text,
            uri: "",//await createURI(fileListHandleSet.Left.root.handle.name, control_LibLeft.value, FolderLeft.value, LeftFileName, LeftFile.time, modelLang[0]),
            model: null
        },
        {//Diff Editor (Left)
            lang: modelLang[1],
            formattedText: LeftFile.text,
            uri: await createURI(fileListHandleSet.Left.root.handle.name, control_LibLeft.value, FolderLeft.value, LeftFileName, LeftFile.time, modelLang[1]),
            model: null
        },
        {//Diff Editor (Right)
            lang: modelLang[2],
            formattedText: RightFile.text,
            uri: await createURI(fileListHandleSet.Right.root.handle.name, control_LibRight.value, FolderRight.value, RightFileName, RightFile.time, modelLang[2]),
            model: null
        }
    ];

    for (let i = 1; i < lang.length; i++) {
        if (lang[i].lang.indexOf("indent") !== -1) {
            lang[i].formattedText = await addIndent(lang[i].formattedText);
        } else {
            lang[i].formattedText = await addSpaces(lang[i].formattedText);
        }
        lang[i].model = await modelChange(lang[i].formattedText, lang[i].lang, lang[i].uri);
    }

    history.register('left', new historyItemLayout(lang[1].model));
    history.register('right', new historyItemLayout(lang[2].model));
    await textModelEditorApply(lang[1].model, lang[2].model);
    //rulerChange(document.getElementById('control-extraRuler').checked);
}

export const createFolderExistList = async (libHandle, folder) => {
    let rtn = [];
    for await (const handle of libHandle.values()) {
        if (handle.kind === 'directory' && handle.name === folder) {
            for await (const fileHandle of handle.values()) {
                if (fileHandle.kind === 'file') {
                    rtn.push(new monaco_file(fileHandle, libHandle.name, folder));
                }
            }
            break;
        }
    }
    return rtn;
}

export const fileTypeGet = (fileName, Indent = true) => {
    switch (fileName) {
        case "QRPGSRC":
            if (Indent) {
                return 'rpg-indent';
            } else {
                return 'rpg';
            }
        case "QDDSSRC":
            return 'dds';
        case "QCLSRC":
            return 'cl';
        case "QDSPSRC":
            return 'dds';
        default:
            return 'dds';
    }
}

export const fileTypeChange = (type) => {
    switch (type) {
        case "rpg":
            return 'QRPGSRC';
        case "dds":
            return 'QDDSSRC';
        case "cl":
            return 'QCLSRC';
        case "dsp":
            return 'QDSPSRC';
        case "rpgle":
            return 'QRPGLESRC';
        default:
            return 'QRPGSRC';
    }
} 