import { normalEditor, diffEditor } from "./monaco_root.js";
import * as monaco from 'monaco-editor';
import { newRefDefStart } from "./ref/new_init.js";
import { fileTypeGet2 } from "./file/fileType.js";

class originalData_Layout {
    constructor(uri, text, lang) {
        let uri_split = uri.path.split('/').filter(str => str !== '');
        this.uri_parse = {
            root: uri.authority,
            lib: uri_split[0],
            file: uri_split[1],
            member: uri_split[2],
        }
        this.normalRefDef = new Map();
        this.sourceRefDef = new Map();
        this.otherFileFlagReference = new Map();
        this.refListFile = { dds: new Map(), dsp: new Map(), pgm: new Map() };
        this.searchLibName = [];
        this.isComplete = false;
        this.refDefRootHandle = [];
        this.textLine = text.split('\n');
        this.lang = lang;
        this.langType = fileTypeGet2(this.uri_parse.file);
    }
}

export const createURI = async (rootHandleName, libName, fileName, memberName, time, lang = "dds") => {
    let path = "file://" + encodeURIComponent(rootHandleName);
    path = path + '/' + encodeURIComponent(libName);
    path = path + '/' + encodeURIComponent(fileName);
    path = path + '/' + encodeURIComponent(memberName);
    path = path + '?timestamp=' + encodeURIComponent(time);
    path = path + '&language=' + encodeURIComponent(lang);
    return (monaco.Uri.parse(path));
}

const rpgEditorOption = () => {
    return ({
        columnSelection: true,
        emptySelectionClipboard: true,
        automaticLayout: true,
        bracketMatching: "always",
        //foldingStrategy: "indentation",
        folding: true,
    });
}

export const modelChange = async (text, lang, uri) => {
    let model = monaco.editor.getModel(uri);

    if (model) {
        if (text !== 'N/A') {
            model.setValue(text);
        }
        monaco.editor.setModelLanguage(model, lang);
    } else {
        model = monaco.editor.createModel(text, lang, uri);
        model.otherData = new originalData_Layout(uri, text, lang);
    }
    return model;
}

export const textModelEditorApply = async (model1 = null, model2 = null) => {
    //diffEditor
    if (model1 !== null && model2 !== null) {
        diffEditor.setModel({
            original: model1,
            modified: model2,
        });
    } else {
        if (model1 !== null) {
            let prevModel = await diffEditor.getModifiedEditor().getModel();
            diffEditor.setModel({
                original: model1,
                modified: prevModel !== null ? prevModel : model1
            });
        }
        if (model2 !== null) {
            let prevModel = await diffEditor.getOriginalEditor().getModel();
            diffEditor.setModel({
                original: prevModel !== null ? prevModel : model2,
                modified: model2
            });
        }
    }

    diffEditor.updateOptions(rpgEditorOption());
}

export const getNormalEditor_Model = async () => {
    return normalEditor.getModel();
}

export const getNormalEditor_View = async () => {
    return normalEditor.saveViewState();
}

export const setNormalEditor_View = async (view) => {
    normalEditor.restoreViewState(view);
    return null;
}

export const getNormalEditor_Model_URI = async (uri_parm) => {
    return monaco.editor.getModel(uri_parm);
}

export const setNormalEditor_Model = async (model) => {
    normalEditor.setModel(model);
    normalEditor.updateOptions(rpgEditorOption());
    newRefDefStart(model);
}
