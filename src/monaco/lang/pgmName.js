import * as monaco from 'monaco-editor';

export const pgm_nameGet = async (model, map, refName, handle, use) => {
    let lineCount = model.getLineCount();
    let fileDescription = "CALL PGM";
    for (let i = 1; i <= lineCount; i++) {
        if (i > 10) {//大体ここまでになかったら無い
            break;
        }
        let row = model.getLineContent(i);
        let isPGM = row.indexOf("PROGRAM") !== -1 ? true : false;
        if (!isPGM) {
            isPGM = row.indexOf("PGM") !== -1 ? true : false;
        }
        let isName = row.indexOf("NAME") !== -1 ? true : false;
        if (isPGM && isName) {
            let pgm_name = row;
            pgm_name = pgm_name.substring(7);
            pgm_name = pgm_name.replace("PROGRAM", "");
            pgm_name = pgm_name.replace("PGM", "");
            pgm_name = pgm_name.replace("NAME", "");
            pgm_name = pgm_name.replace(":", " ");
            pgm_name = pgm_name.replaceAll("*", " ");
            pgm_name = pgm_name.trim();
            fileDescription = pgm_name;
            break;
        }
    }
    map.set("'" + refName + "'", [{ location: { range: new monaco.Range(1, 5, lineCount, Number.MAX_VALUE), uri: model.uri }, description: refName + ' : ' + fileDescription, s_description: fileDescription, sourceType: "PGM", handle: handle, use: use }]);
    return map;
}