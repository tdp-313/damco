import { file_read_text } from "./IO.js";
import { modelChange, createURI } from "../textmodel.js";
import { tabs_add } from "../../tabs.js";
import { addIndent } from "./text_extend.js";
import { fileTypeGet } from "./read.js";

export const readText_Model = async (lib, file, member, r_handle) => {
    let libHandle = null;
    let fileHandle = null;
    let memberHandle = null;
    if (lib.indexOf('*') !== -1) {
        for await (const handle of r_handle.values()) {
            if (handle.name.indexOf(lib.substring(0, 3)) !== -1) {
                libHandle = handle;
                break;
            }
        }
    } else {
        for await (const handle of r_handle.values()) {
            if (handle.name === lib) {
                libHandle = handle;
                break;
            }
        }
    }

    if (libHandle === null) {
        return null; //end
    }
    for await (const handle of libHandle.values()) {
        if (handle.name === file) {
            fileHandle = handle;
            break;
        }
    }
    if (fileHandle === null) {
        return null; //end
    }
    let filename_c = "";
    for await (const handle of fileHandle.values()) {
        let filename = handle.name.indexOf('.') !== -1 ? handle.name.substring(0, handle.name.indexOf('.')) : handle.name;
        if (filename === member) {
            memberHandle = handle;
            filename_c = filename;
            break;
        }
    }
    if (memberHandle === null) {
        return null; //end
    }
    //Found !!
    let lang = fileTypeGet(file);
    let source_File = await file_read_text(memberHandle.name, memberHandle, false, "text", false);
    let new_uri = await createURI(r_handle.name, libHandle.name, file, filename_c, source_File.time, lang);
    let source_text = source_File.text;

    let normalEditorModel = await modelChange(await addIndent(source_text), lang, new_uri);
    await tabs_add(normalEditorModel, true);
}