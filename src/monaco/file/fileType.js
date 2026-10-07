import { resolveSourceType } from '../../../shared/sourceFiles.js';

export const dds_fileName = 'QDDSSRC';
export const dsp_fileName = 'QDSPSRC';
export const rpg_fileName = 'QRPGSRC';
export const cl_fileName = 'QCLSRC';
export const rpgle_fileName = 'QRPGLESRC';

// ソースファイル名と種類。名前を含めば当てはまる(QDDSSRC2 なども DDS)。
// 参照先の検索(refDefSearch.js)と言語の判定(fileTypeGet / fileTypeGet2)で同じ規則を使う
export const WEB_SOURCE_FILES = {
    rpg: ['%' + rpg_fileName + '%'],
    rpgle: ['%' + rpgle_fileName + '%'],
    dds: ['%' + dds_fileName + '%'],
    dsp: ['%' + dsp_fileName + '%'],
    cl: ['%' + cl_fileName + '%'],
};

// ソースファイル名から種類(rpg / rpgle / dds / dsp / cl)。当てはまらなければ null
export const sourceTypeOfFile = (fileName) => resolveSourceType(fileName || '', WEB_SOURCE_FILES);

export const fileTypeGet2 = (fileName, isLangGet = false) => {
    const type = sourceTypeOfFile(fileName);
    if (isLangGet) {
        switch (type) {
            case 'rpg':
                return 'rpg-indent';
            case 'rpgle':
                return 'rpgle';
            case 'cl':
                return 'cl';
            default:
                return 'dds';
        }
    }
    return type === null ? 'dds' : type;
}
