import { UseIO_Layout } from "./other.js";
import { P_FILE } from "./other.js";
import { createFolderExistList, fileTypeGet } from "../file/read.js";
import { getFolderExistList_Text } from "./searchDirectory.js";
import { modelChange, createURI } from "../textmodel.js";
import { addSpaces, addIndent } from "../file/text_extend.js";
import { dds_DefinitionList } from "./dds_RefDef.js";
import { pgm_nameGet } from "../lang/pgmName.js";


export const createRefList = async (refModel) => {
    var lineCount = await refModel.getLineCount();
    let dds = new Map();
    let dsp = new Map();
    let pgm = new Map();
    for (let i = 1; i <= lineCount; i++) {
        // 行のテキストを取得
        let lineText = refModel.getLineContent(i);
        if (lineText.substring(5, 6) === "F" && lineText.substring(6, 7) !== "*") {
            let type = lineText.substring(39, 46).trim();
            let file = lineText.substring(6, 14).trim();
            let use = lineText.substring(14, 15).trim();
            let add = lineText.substring(65, 66).trim();
            let using = new UseIO_Layout(true);
            using.device = type;
            if (add === "A") {
                using.io.add('O');
            }
            if (use === "I") {
                using.io.add('I');
            } else if (use === "U") {
                using.io.add('U');
            } else if (use === "O") {
                using.io.add('O');
            }
            if (type === "WORKSTN") {
                if (dsp.has(file)) {
                    using.io = new Set([...using.io, ...dsp.get(file).use.io]);
                }
                dsp.set(file, { name: file, use: using });
            } else if (type === "DISK") {
                if (dds.has(file)) {
                    using.io = new Set([...using.io, ...dds.get(file).use.io]);
                }
                dds.set(file, { name: file, use: using });
            } else if (type === "PRINTER") {
                if (dds.has(file)) {
                    using.io = new Set([...using.io, ...dds.get(file).use.io]);
                }
                dds.set(file, { name: file, use: using });
            }
        } else if (lineText.substring(5, 6) === "C" && lineText.substring(6, 7) !== "*") {
            let op_m = lineText.substring(45, 50).trim();
            let op_2 = lineText.substring(50, 60).trim();
            let op_2_ex = op_2.replace(/'/g, "");
            if (op_m === "CALL") {
                let using = new UseIO_Layout(true);
                using.device = "PGM";
                using.io = new Set(["-", "-"]);
                pgm.set(op_2_ex, { name: op_2_ex, use: using });
            }
        }
    }
    return { dds: dds, dsp: dsp, pgm: pgm }
}

export const refDefCreate = async (FileArray, handle, refDef, reflist, rootHandleName) => {
    let FileName = "";
    let current_SRC = [];
    P_FILE.clear();
    if (FileArray.length === 1) {
        //DDS,DSPF
        FileName = FileArray[0];
    } else {
        //RPG,RPGLE,CL
        FileName = "PGM";
    }
    for (let i = 0; i < FileArray.length; i++) {
        current_SRC = current_SRC.concat(await createFolderExistList(handle, FileArray[i]));
    }


    for (const [key, value] of reflist.entries()) {
        let textData = await getFolderExistList_Text(current_SRC, value.name);
        if (textData !== null) {
            let lang = fileTypeGet(textData.list.file);
            let uri = await createURI(rootHandleName, handle.name, textData.list.file, value.name, textData.time,lang);
            if (FileName === "PGM") {
                let model = null;
                //let lang = fileTypeGet(textData.list.file);
                if (lang.includes("indent")) {
                    model = await modelChange(await addIndent(textData.text), lang, uri);
                } else {
                    model = await modelChange(addSpaces(textData.text), lang, uri);
                }
                refDef = await pgm_nameGet(model, refDef, value.name, textData.list.handle, value.use);
                //refDef.set("'" + reflist[i].name + "'", { location: { range: new monaco.Range(1, 5, await model.getLineCount(), Number.MAX_VALUE), uri: uri }, description: reflist[i].name, s_description: "CALL PGM", sourceType: "PGM", handle: textData.list.handle, use: reflist[i].use });
            } else {
                let model = await modelChange(addSpaces(textData.text), lang, uri);
                refDef = await dds_DefinitionList(model, refDef, value.name, textData.list.handle, value.use, P_FILE);
            }
            //見つかったので削除
            reflist.delete(key);
        }
    };
    for (const [key, value] of P_FILE.entries()) {
        if (await reflist.has(key)) {
            let before = await reflist.get(key);
            value.use.io = new Set([...value.use.io, ...before.use.io]);
        }
        reflist.set(key, { name: key, use: value.use });
    }
    return refDef;
}