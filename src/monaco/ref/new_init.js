import { monaco_handleName, monaco_handleName_RefMaster } from "../../root";
import { linkStatus } from "../file/directory";
import { Setting } from "../../setting.js";
import { createURI } from "../textmodel.js";
import { pgm_nameGet } from "../lang/pgmName.js";
import { modelChange } from "../textmodel.js";
import { fileTypeGet2 } from "../file/fileType.js";
import { addIndent, addSpaces } from "../file/text_extend.js";
import { dds_DefinitionList } from "./dds_newRefDef.js";
import { createUseFileList } from "../sidebar/sidebar.js";
import { searchStatusChange } from "../header/header_button.js";

export const newRefDefStart = async (model) => {
    //RootHandleを取得
    searchStatusChange('pending');
    if (model.otherData.createSkip) {
        await createUseFileList(model);
        searchStatusChange('complete');
        return null;
    }
    //Reference Reset
    model.otherData.normalRefDef = new Map();
    model.otherData.sourceRefDef = new Map();
    model.otherData.otherFileFlagReference = new Map();
    model.otherData.refListFile = { dds: new Map(), dsp: new Map(), pgm: new Map() };
    model.otherData.searchLibName = [];

    let SearchRootHandle = [];
    switch (model.otherData.uri_parse.root) {
        case (monaco_handleName):
            if (typeof linkStatus[monaco_handleName_RefMaster] === "undefined") {
                SearchRootHandle = [
                    { name: monaco_handleName, handle: linkStatus[monaco_handleName].handle }
                ];
                console.warn("RefMaster not found");
            } else {
                SearchRootHandle = [
                    { name: monaco_handleName, handle: linkStatus[monaco_handleName].handle },
                    { name: monaco_handleName_RefMaster, handle: linkStatus[monaco_handleName_RefMaster].handle }
                ];
            }
            break;
        case (monaco_handleName_RefMaster):
            SearchRootHandle = [{ name: monaco_handleName_RefMaster, handle: linkStatus[monaco_handleName_RefMaster].handle }];
            break;
        default:
            searchStatusChange('off');
            console.error("error", model.otherData.uri_parse.root);
            return;
    }
    model.otherData.refDefRootHandle = SearchRootHandle;
    let searchLibName = [model.otherData.uri_parse.lib.substring(0, 3)];

    let settingLibList = Setting.getLibraryList(searchLibName[0]);

    if (settingLibList.length !== 0) {
        searchLibName = structuredClone(settingLibList);
    }
    model.otherData.searchLibName = searchLibName;

    const newRefDefWorker = new Worker(new URL('./refDefWorker.js', import.meta.url), {
        type: 'module',
    });

    newRefDefWorker.postMessage(model.otherData);

    newRefDefWorker.onmessage = async (e) => {
        model.otherData = e.data;
        let refListFile = model.otherData.refListFile;
        let refDef = model.otherData.normalRefDef;
        let flagRef = model.otherData.otherFileFlagReference;

        //pgm
        for (const [key, value] of refListFile.pgm.entries()) {
            if (value.isFound) {
                let uri = await createURI(value.uri_path.root, value.uri_path.lib, value.uri_path.file, value.uri_path.member, value.data.timestamp, value.uri_path.lang);
                let lang = fileTypeGet2(value.uri_path.file, true);
                let model = null
                if (lang.includes("indent")) {
                    model = await modelChange(await addIndent(value.data.text), lang, uri);
                } else {
                    model = await modelChange(addSpaces(value.data.text), lang, uri);
                }
                refDef = await pgm_nameGet(model, refDef, key, value.data.handle, value.use);
            }
        }
        //dsp-dds
        let ddsList = ['dds', 'dsp'];
        for (let i = 0; i < ddsList.length; i++) {
            for (const [key, value] of refListFile[ddsList[i]].entries()) {
                if (value.isFound||value.isRegExpFound) {
                    let uri = await createURI(value.uri_path.root, value.uri_path.lib, value.uri_path.file, value.uri_path.member, value.data.timestamp, value.uri_path.lang);
                    let lang = fileTypeGet2(value.uri_path.file, true);
                    let model = await modelChange(addSpaces(value.data.text), lang, uri);
                    let defList = await dds_DefinitionList(model, refDef, key, value.data.handle, value.use, flagRef);
                    refDef = defList[0];
                    flagRef = defList[1];
                }
            }
        }
        model.otherData.normalRefDef = refDef;
        model.otherData.createSkip = true;
        await createUseFileList(model);
        newRefDefWorker.terminate();
        searchStatusChange('complete');
    }
    newRefDefWorker.onerror = (e) => {
        searchStatusChange('off');
        console.error(e);
    }
}