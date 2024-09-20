import { normalEditor, diffEditor } from "./monaco_root.js";
import * as monaco from 'monaco-editor';
import { refleshTextModel } from "./reflesh.js";

export const createURI = async (rootHandleName, libName, fileName, memberName, time) => {
    let path = "file://" + encodeURIComponent(rootHandleName);
    path = path + '/' + encodeURIComponent(libName);
    path = path + '/' + encodeURIComponent(fileName);
    path = path + '/' + encodeURIComponent(memberName);
    path = path + '?timestamp=' + encodeURIComponent(time);
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
    }
    return model;
}

export const textModelEditorApply = async (model, model1, model2) => {
    refleshTextModel();
    document.title = model.uri.path;
    //normalEditor 
    normalEditor.setModel(model);
    //diffEditor
    diffEditor.setModel({
        original: model1,
        modified: model2,
    });

    normalEditor.updateOptions(rpgEditorOption());
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

export const setNormalEditor_Model = (model) => {
    normalEditor.setModel(model);
}
