import { revIndent } from "../file/text_extend"
import { Setting } from "../../setting";

export const sourceExportClipboard = (model) => {
    const text = model.getValue();
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++){
        lines[i] = lines[i].trimEnd();
    }
    const rawText = revIndent(lines);


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

    let prompt = Setting.getPrompt;
    for (let i = 0; i < replaceTextSet.length; i++) {
        prompt = prompt.replace(replaceTextSet[i].placement, replaceTextSet[i].text);
    }
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
        if (value.isFound) {
            tempObj[key] = value.data.text;
        } else {
            tempObj[key] = "N/A";
        }
    });

    return tempObj;
}