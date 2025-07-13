import { UseIO_Layout } from "./other.js";
import { dds_fileName, dsp_fileName, cl_fileName, rpg_fileName, rpgle_fileName } from "../file/fileType.js";
import { fileOpen } from "../webworker/fileOpen.js";

self.onmessage = async (event) => {
    let otherData = event.data;
    let divRegExp = otherData.regExp.div;
    let searchRegExp = otherData.regExp.search;
    otherData.refListFile.dds.clear();
    otherData.refListFile.dsp.clear();
    otherData.refListFile.pgm.clear();
    if (otherData.lang === 'rpg-indent') {
        otherData.refListFile = await createRefList(otherData.textLine, otherData.refListFile);
    } else if (otherData.lang === 'dds') {
        if (otherData.langType === "dsp") {
            otherData.refListFile.dsp.set(otherData.uri_parse.member, { name: otherData.uri_parse.member, use: new UseIO_Layout(false), isFound: false, data: {}, uri_path: {}, isRegExpFound: false });
        } else if (otherData.langType === "dds") {
            otherData.refListFile.dds.set(otherData.uri_parse.member, { name: otherData.uri_parse.member, use: new UseIO_Layout(false), isFound: false, data: {}, uri_path: {}, isRegExpFound: false });
        } else {
            self.postMessage(otherData);
            return null;
        }
    } else {
        self.postMessage(otherData);
        return null;
    }

    //Root-Lib
    let libraryHandle = [];
    for (let r = 0; r < otherData.refDefRootHandle.length; r++) {
        if (otherData.refDefRootHandle[r].handle === null) {
            console.warn("handle is Null");
            return null;
        }
        for await (const handle of otherData.refDefRootHandle[r].handle.values()) {
            for (let i = 0; i < otherData.searchLibName.length; i++) {
                if (handle.name.indexOf(otherData.searchLibName[i]) !== -1) {
                    libraryHandle.push({ handle, root: otherData.refDefRootHandle[r].name, lib: handle.name });
                }
            }
        }
    }

    //Lib-File
    let libFileHandle = [];
    let dds_FileHandle = [];
    for (let r = 0; r < libraryHandle.length; r++) {
        for await (const handle of libraryHandle[r].handle.values()) {
            if (otherData.refListFile.dds.size > 0) {
                if (handle.name.indexOf(dds_fileName) !== -1) {
                    libFileHandle.push({ handle, root: libraryHandle[r].root, lib: libraryHandle[r].lib, file: handle.name, type: "dds" });
                    dds_FileHandle.push({ handle, root: libraryHandle[r].root, lib: libraryHandle[r].lib, file: handle.name, type: "dds" });
                }
            }
            if (otherData.refListFile.dsp.size > 0) {
                if (handle.name.indexOf(dsp_fileName) !== -1) {
                    libFileHandle.push({ handle, root: libraryHandle[r].root, lib: libraryHandle[r].lib, file: handle.name, type: "dsp" });
                }
            }
            if (otherData.refListFile.pgm.size > 0) {
                if (handle.name.indexOf(cl_fileName) !== -1 || handle.name.indexOf(rpg_fileName) !== -1 || handle.name.indexOf(rpgle_fileName) !== -1) {
                    libFileHandle.push({ handle, root: libraryHandle[r].root, lib: libraryHandle[r].lib, file: handle.name, type: "pgm" });
                }
            }
        }
    }

    //File-Member
    let FileMember = new Map();

    for (let r = 0; r < libFileHandle.length; r++) {
        for await (const handle of libFileHandle[r].handle.values()) {
            const fileNameWithoutExtension = handle.name.replace(/\.[^/.]+$/, "");
            if (otherData.refListFile[libFileHandle[r].type].has(fileNameWithoutExtension)) {
                let value = otherData.refListFile[libFileHandle[r].type].get(fileNameWithoutExtension);
                if (!value.isFound) {//完全一致
                    let text = await fileOpen(handle);
                    value.data = text;
                    value.uri_path = { root: libFileHandle[r].root, lib: libFileHandle[r].lib, file: libFileHandle[r].file, member: fileNameWithoutExtension };
                    value.isFound = true;
                    otherData.refListFile[libFileHandle[r].type].set(fileNameWithoutExtension, value);
                    FileMember.set(value.uri_path.root + value.uri_path.lib + value.uri_path.member, { handle, root: libFileHandle[r].root, lib: libFileHandle[r].lib, file: libFileHandle[r].file, type: libFileHandle[r].type, member: fileNameWithoutExtension, searchKey: fileNameWithoutExtension, use: value.use });
                }
            } else if (divRegExp !== "" && searchRegExp !== "") {
                //部分一致があればそれを採用
                otherData.refListFile[libFileHandle[r].type].forEach(async (value, key) => {
                    if (!value.isFound && !value.isRegExpFound) {
                        let strA = splitString(key, divRegExp);
                        let regexString = searchRegExp;
                        if (typeof (strA) === 'object') {
                            for (let i = 0; i < strA.length; i++){
                                regexString = regexString.replace("${strA[" + i + "]}", strA[i]);
                            }
                        }
                        const regex = new RegExp(regexString);
                        if (regex.test(fileNameWithoutExtension)) {
                            //部分一致で見つかった
                            let text = await fileOpen(handle);
                            value.data = text;
                            value.uri_path = { root: libFileHandle[r].root, lib: libFileHandle[r].lib, file: libFileHandle[r].file, member: fileNameWithoutExtension };
                            value.isRegExpFound = true;
                            otherData.refListFile[libFileHandle[r].type].set(key, value);
                            FileMember.set(value.uri_path.root + value.uri_path.lib + value.uri_path.member, { handle, root: libFileHandle[r].root, lib: libFileHandle[r].lib, file: libFileHandle[r].file, type: libFileHandle[r].type, member: fileNameWithoutExtension, searchKey: key, use: value.use });
                        }
                    }
                })
            }
        }
    }

    //RefDef
    let R_name = new Map();
    FileMember.forEach((value) => {
        if (value.type === "dds") {
            let text = otherData.refListFile[value.type].get(value.searchKey).data;
            for (let r = 0; r < text.textArray.length; r++) {
                let row = text.textArray[r];
                if (row.substring(5, 6) === 'A' && row.substring(6, 7) !== '*') {
                    let sp_op = row.substring(44, 49).trim();
                    if (sp_op === 'PFILE') {
                        let key = row.substring(50, row.indexOf(')'));
                        let newFileMember = structuredClone(value);
                        if (R_name.has(key)) {
                            let existingSet = R_name.get(key);
                            newFileMember.use.io = new Set([...existingSet.use.io, ...newFileMember.use.io]);
                        }
                        newFileMember.use.original = false;
                        R_name.set(key, newFileMember);
                    }
                }
            }
        }
    })

    R_name.forEach((value, key) => {
        let R_use = value.use;
        if (otherData.refListFile.dds.has(key)) {
            let existData = otherData.refListFile.dds.get(key);
            R_use.io = new Set([...existData.use.io, ...R_use.io]);
        }
        otherData.refListFile.dds.set(key, { name: key, use: R_use, isFound: false, data: {} });
    });

    //PFILE
    for (let r = 0; r < dds_FileHandle.length; r++) {
        for await (const handle of dds_FileHandle[r].handle.values()) {
            const fileNameWithoutExtension = handle.name.replace(/\.[^/.]+$/, "");
            if (otherData.refListFile[dds_FileHandle[r].type].has(fileNameWithoutExtension)) {
                let value = otherData.refListFile[dds_FileHandle[r].type].get(fileNameWithoutExtension);
                if (!value.isFound) {
                    let text = await fileOpen(handle);
                    value.data = text;
                    value.uri_path = { root: dds_FileHandle[r].root, lib: dds_FileHandle[r].lib, file: dds_FileHandle[r].file, member: fileNameWithoutExtension };
                    value.isFound = true;
                    otherData.refListFile[dds_FileHandle[r].type].set(fileNameWithoutExtension, value);
                    //FileMember.set(value.uri_path.root + value.uri_path.lib + value.uri_path.member, { handle, root: dds_FileHandle[r].root, lib: dds_FileHandle[r].lib, file: dds_FileHandle[r].file, type: dds_FileHandle[r].type, member: fileNameWithoutExtension, use: value.use });
                }
            }
        }
    }

    otherData.isComplete = true;

    self.postMessage(otherData);
};


function splitString(inputString,divRegExp) {
    let result = [];
    const pattern1 = new RegExp(divRegExp)
    const match = inputString.match(pattern1);

    if (match) {
        for (let i = 0; i < match.length; i++) {
            if (match[i] !== "") {
                result.push(match[i]);
            } else {
                result.push("");
            }
        }
    } else {
        result = [];
    }
    return result;
}

const createRefList = async (textLine) => {
    let dds = new Map();
    let dsp = new Map();
    let pgm = new Map();

    for (let i = 0; i < textLine.length; i++) {
        let lineText = textLine[i];
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
                dsp.set(file, { name: file, use: using, isFound: false, data: {}, uri_path: {}, isRegExpFound: false });
            } else if (type === "DISK") {
                if (dds.has(file)) {
                    using.io = new Set([...using.io, ...dds.get(file).use.io]);
                }
                dds.set(file, { name: file, use: using, isFound: false, data: {}, uri_path: {}, isRegExpFound: false });
            } else if (type === "PRINTER") {
                if (dds.has(file)) {
                    using.io = new Set([...using.io, ...dds.get(file).use.io]);
                }
                dds.set(file, { name: file, use: using, isFound: false, data: {}, uri_path: {}, isRegExpFound: false });
            }
        } else if (lineText.substring(5, 6) === "C" && lineText.substring(6, 7) !== "*") {
            let op_m = lineText.substring(45, 50).trim();
            let op_2 = lineText.substring(50, 60).trim();
            let op_2_ex = op_2.replace(/'/g, "");
            if (op_m === "CALL") {
                let using = new UseIO_Layout(true);
                using.device = "PGM";
                using.io = new Set(["-", "-"]);
                pgm.set(op_2_ex, { name: op_2_ex, use: using, isFound: false, data: {}, uri_path: {}, isRegExpFound: false });
            }
        }
    }

    return { dds: dds, dsp: dsp, pgm: pgm };
}