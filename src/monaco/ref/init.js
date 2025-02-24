/*
import { linkStatus } from "../file/directory.js";
import { monaco_handleName, monaco_handleName_RefMaster } from "../../root.js";
import { createUseFileList } from "../sidebar/sidebar.js";
import { createRefList } from "./createRefDef.js";
//import { normalRefDef, otherFileFlagReference } from "./other.js";
import { Setting } from "../../setting.js";
import { refDefCreate } from "./createRefDef.js";
import { Directory_Handle_RegisterV2 } from "../file/directory.js";
import { loadingPopUpClose } from "../monaco_root.js";
import { UseIO_Layout } from "./other.js";
import { fileTypeChange } from "../file/read.js";
import { fileTypeGet2 } from "../file/fileType.js";
import { newRefDefStart } from "./new_init.js";
export let refListFile = {};
let firstEditorLoading = false;


window.normalRefDef = normalRefDef;

export const refDefStart = async (model) => {
    newRefDefStart(model);
    normalRefDef.clear();
    otherFileFlagReference.clear();
    const libFileName = model.uri.path.split('/').filter(str => str !== '');
    if (libFileName.length !== 3) {
        return null;
    }

    let mainRootHandle = linkStatus[monaco_handleName].handle;
    let refRootHandle = linkStatus[monaco_handleName_RefMaster].handle;
    let rootLibName = libFileName[0];
    if (model.getLanguageId() === 'rpg-indent') {
        refListFile = await createRefList(model);
    } else if (model.getLanguageId() === 'dds') {
        refListFile = { dds: new Map(), dsp: new Map(), pgm: new Map() };
        if (fileTypeGet2(libFileName[1]) === "dds") {
            refListFile.dds.set(libFileName[2], { name: libFileName[2], use: new UseIO_Layout(false) });
        } else if (fileTypeGet2(libFileName[1]) === "dsp") {
            refListFile.dsp.set(libFileName[2], { name: libFileName[2], use: new UseIO_Layout(false) });
        } else {
            return null;
        }
    } else {
        refListFile = { dds: new Map(), dsp: new Map(), pgm: new Map() };
        await createUseFileList(normalRefDef);
        return null;
    }

    let searchHandleCheck = { normal: false, ref: false }
    if (mainRootHandle !== null) {
        if (model.uri.authority === mainRootHandle.name) {
            searchHandleCheck.normal = true;
        }
    }
    if (refRootHandle !== null) {
        searchHandleCheck.ref = true;
    }

    let searchLibName = [rootLibName.substring(0, 3)];

    if (Array.isArray(Setting.libraryList[searchLibName])) {
        searchLibName = Setting.libraryList[searchLibName];
    }
    //Normal FileSystemHandler Check
    let folderHandle_normal = [];
    if (searchHandleCheck.normal) {
        for await (const handle of mainRootHandle.values()) {
            for (let i = 0; i < searchLibName.length; i++) {
                if (handle.name.indexOf(searchLibName[i]) !== -1) {
                    folderHandle_normal.push(handle);
                } else if (handle.name === rootLibName) {
                    folderHandle_normal.push(handle);
                }
            }
        }
        for (let i = 0; i < folderHandle_normal.length; i++) {
            await refDefCreate([fileTypeChange('dds')], folderHandle_normal[i], normalRefDef, refListFile.dds, mainRootHandle.name);
            await refDefCreate([fileTypeChange('dsp')], folderHandle_normal[i], normalRefDef, refListFile.dsp, mainRootHandle.name);
            //PFILE
            await refDefCreate([fileTypeChange('dds')], folderHandle_normal[i], normalRefDef, refListFile.dds, mainRootHandle.name);
            await refDefCreate([fileTypeChange('rpg'), fileTypeChange('rpgle'), fileTypeChange('cl')], folderHandle_normal[i], normalRefDef, refListFile.pgm, mainRootHandle.name);
        }
    }
    //RefDef FileSystemHandler Check
    if (searchHandleCheck.ref) {
        await Directory_Handle_RegisterV2(monaco_handleName_RefMaster, false, 'read');

        let folderHandle = [];
        for await (const handle of refRootHandle.values()) {
            for (let i = 0; i < searchLibName.length; i++) {
                if (handle.name.indexOf(searchLibName[i]) !== -1) {
                    folderHandle.push(handle);
                }
            }
        }
        if (folderHandle.length === 0) {
            return null; //end
        }

        //With Normal FileSystemHandler
        if (searchHandleCheck.normal) {
            for (let i = 0; i < folderHandle.length; i++) {
                await refDefCreate([fileTypeChange('dds')], folderHandle[i], normalRefDef, refListFile.dds, refRootHandle.name);
                await refDefCreate([fileTypeChange('dsp')], folderHandle[i], normalRefDef, refListFile.dsp, refRootHandle.name);
                //PFILE
                for (let p = 0; p < folderHandle_normal.length; p++) {
                    await refDefCreate([fileTypeChange('dds')], folderHandle_normal[p], normalRefDef, refListFile.dds, mainRootHandle.name);
                }
                await refDefCreate([fileTypeChange('dds')], folderHandle[i], normalRefDef, refListFile.dds, refRootHandle.name);

                await refDefCreate([fileTypeChange('rpg'), fileTypeChange('rpgle'), fileTypeChange('cl')], folderHandle[i], normalRefDef, refListFile.pgm, refRootHandle.name);
            }
        } else {
            for (let i = 0; i < folderHandle.length; i++) {
                await refDefCreate([fileTypeChange('dds')], folderHandle[i], normalRefDef, refListFile.dds, mainRootHandle.name);
                await refDefCreate([fileTypeChange('dsp')], folderHandle[i], normalRefDef, refListFile.dsp, mainRootHandle.name);
                //PFILE
                await refDefCreate([fileTypeChange('dds')], folderHandle[i], normalRefDef, refListFile.dds, mainRootHandle.name);
                await refDefCreate([fileTypeChange('rpg'), fileTypeChange('rpgle'), fileTypeChange('cl')], folderHandle[i], normalRefDef, refListFile.pgm, mainRootHandle.name);
            }
        }
    }
    if (!firstEditorLoading) {
        loadingPopUpClose();
        firstEditorLoading = true;
    }
    //sidebar
    await createUseFileList(normalRefDef);
}
*/