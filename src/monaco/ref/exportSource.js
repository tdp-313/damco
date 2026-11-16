import { exportSourceText, fillPrompt } from "./promptText.js";
import { Setting } from "../../setting";

export const sourceExportClipboard = (model) => {
    const rawText = exportSourceText(model.getValue(), model.getLanguageId());


    let files = model.otherData.refListFile;

    let replaceTextSet = [
        { placement: "%{name}", text: model.otherData.uri_parse.member },
        { placement: "%{main}", text: rawText },
    ];
    let ddsText = FileListExport(files.dds);
    let dspText = FileListExport(files.dsp);
    let pgmText = FileListExport(files.pgm);

    replaceTextSet.push({ placement: "%{disk}", text: JSON.stringify(ddsText) });
    replaceTextSet.push({ placement: "%{wstn}", text: JSON.stringify(dspText) });
    replaceTextSet.push({ placement: "%{pgm}", text: JSON.stringify(pgmText) });

    const prompt = fillPrompt(Setting.getPrompt, replaceTextSet);
    if (Setting.getSourceOutput) {
        const name = model.otherData.uri_parse.member;
        const date = new Date();
        const dateString = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}${date.getSeconds().toString().padStart(2, '0')}`;
        const filename = `${name}_${dateString}.txt`;

        const blob = new Blob([prompt], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } else {
        navigator.clipboard.writeText(prompt);
    }
}

const FileListExport = (map) => {
    let tempObj = {};
    map.forEach((value, key) => {
        // 部分一致(設定の RegExp)で見つかったものも中身を出す
        if (value.isFound || value.isRegExpFound) {
            tempObj[key] = value.data.text;
        } else {
            tempObj[key] = "N/A";
        }
    });

    return tempObj;
}