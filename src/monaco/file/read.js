import { sourceTypeOfFile } from "./fileType.js";

// ソースファイル名から言語。名前の判定は参照先の検索と同じ規則(fileType.js)
export const fileTypeGet = (fileName, Indent = true) => {
    switch (sourceTypeOfFile(fileName)) {
        case "rpg":
            if (Indent) {
                return 'rpg-indent';
            } else {
                return 'rpg';
            }
        case "rpgle":
            return 'rpgle';
        case "cl":
            return 'cl';
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