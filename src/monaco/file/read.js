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