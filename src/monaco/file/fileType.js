export const dds_fileName = 'QDDSSRC';
export const dsp_fileName = 'QDSPSRC';
export const rpg_fileName = 'QRPGSRC';
export const cl_fileName = 'QCLSRC';
export const rpgle_fileName = 'QRPGLESRC';

export const fileTypeGet2 = (fileName, isLangGet = false) => {
    if (isLangGet) {
        switch (fileName) {
            case rpg_fileName:
                return 'rpg-indent';
            case dds_fileName:
                return 'dds';
            case cl_fileName:
                return 'cl';
            case dsp_fileName:
                return 'dds';
            default:
                return 'dds';
        }
    } else {
        switch (fileName) {
            case rpg_fileName:
                return 'rpg';
            case dsp_fileName:
                return 'dsp';
            case cl_fileName:
                return 'cl';
            case dds_fileName:
                return 'dds';
            case rpgle_fileName:
                return 'rpg';
            default:
                return 'dds';
        }
    }

}