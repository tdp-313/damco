import { UseIO_Layout } from "./other.js";
import { dds_fileName, dsp_fileName, cl_fileName, rpg_fileName, rpgle_fileName } from "../file/fileType.js";
import { fileOpen } from "../webworker/fileOpen.js";
import { createRefList, createRefList_rpgle } from "./refList.js";

const SETTING_IDB = "monaco-setting";
import { get } from 'idb-keyval';

let IsForceSJIS = false;
let isFirstload = true;

function matchSearchName(targetName, searchName) {
    if (searchName.startsWith('%') && searchName.endsWith('%') && searchName.length > 2) {
        // 部分一致: %文字%
        const pattern = searchName.slice(1, -1);
        return targetName.includes(pattern);
    } else if (searchName.startsWith('%')) {
        // 後方一致: %文字
        const pattern = searchName.slice(1);
        return targetName.endsWith(pattern);
    } else if (searchName.endsWith('%')) {
        // 前方一致: 文字%
        const pattern = searchName.slice(0, -1);
        return targetName.startsWith(pattern);
    } else {
        // 完全一致
        return targetName === searchName;
    }
}

self.onmessage = async (event) => {
    if (isFirstload) {
        isFirstload = false;
        IsForceSJIS = await get(SETTING_IDB).then((data) => {
            if (data && data.isForceSJIS) {
                return data.isForceSJIS;
            } else {
                return false;
            }
        });
    }
    let otherData = event.data;
    let divRegExp = otherData.regExp.div;
    let searchRegExp = otherData.regExp.search;
    otherData.refListFile.dds.clear();
    otherData.refListFile.dsp.clear();
    otherData.refListFile.pgm.clear();
    if (otherData.lang === 'rpg-indent') {
        otherData.refListFile = createRefList(otherData.textLine);
    } else if (otherData.lang === 'rpgle') {
        otherData.refListFile = createRefList_rpgle(otherData.textLine);
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
                if (matchSearchName(handle.name, otherData.searchLibName[i])) {
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
                    let text = await fileOpen(handle, IsForceSJIS);
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
                            for (let i = 0; i < strA.length; i++) {
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
                    let text = await fileOpen(handle, IsForceSJIS);
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


function splitString(inputString, divRegExp) {
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

