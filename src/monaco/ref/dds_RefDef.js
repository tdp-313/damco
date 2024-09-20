import * as monaco from 'monaco-editor';

export const dds_DefinitionList = async (model, map, refName, handle, use, reflist) => {
    const createDescription = async (start_row, i, model, max, loopCheck = 0) => {
        let sp_op_full = start_row.substring(44, 80).trim();
        let text_p = sp_op_full.indexOf("TEXT('");
        let colhdg_p = sp_op_full.indexOf("COLHDG('");
        if (text_p !== -1 || colhdg_p !== -1) {
            if (sp_op_full.indexOf("')") !== -1) {
                //1行完結
                if (text_p !== -1) {
                    return sp_op_full.substring(text_p + 6, sp_op_full.indexOf("')"));
                } else if (colhdg_p !== -1) {
                    return sp_op_full.substring(colhdg_p + 8, sp_op_full.indexOf("')"));
                }
            } else {
                let start_row_desc = "";
                if (text_p !== -1) {
                    if (sp_op_full.lastIndexOf("+") !== -1) {
                        start_row_desc = sp_op_full.substring(text_p + 6, sp_op_full.lastIndexOf("+"));
                    } else if (sp_op_full.lastIndexOf("-") !== -1) {
                        start_row_desc = sp_op_full.substring(text_p + 6, sp_op_full.lastIndexOf("-"));
                    }
                } else if (colhdg_p !== -1) {
                    if (sp_op_full.lastIndexOf("+") !== -1) {
                        start_row_desc = sp_op_full.substring(colhdg_p + 8, sp_op_full.lastIndexOf("+"));
                    } else if (sp_op_full.lastIndexOf("-") !== -1) {
                        start_row_desc = sp_op_full.substring(colhdg_p + 8, sp_op_full.lastIndexOf("-"));
                    }
                }
                if (max === i) {
                    console.log('MAX');
                    return start_row_desc;
                }
                let next_row = await model.getLineContent(i + 1);
                let value = next_row.substring(18, 24).trim();
                if (next_row.substring(6, 7) === "*") {
                    console.log('COMMENT');
                    return start_row_desc;
                } else if (value.length === 0) {
                    let sp_op_full_next = next_row.substring(44, 80).trim();
                    let nextRow_desc = sp_op_full_next.substring(0, sp_op_full_next.lastIndexOf("'"));

                    return start_row_desc + nextRow_desc;
                }
            }
        } else {
            if (loopCheck >= 3 || max === i) {
                return 'undefined';
            } else {
                for (let p = i + 1; p <= max; p++) {
                    let nextText = await model.getLineContent(p);
                    if (nextText.substring(5, 6) === 'A' && nextText.substring(6, 7) !== '*') {
                        return createDescription(nextText, p, model, max, loopCheck + 1);
                    }
                }


            }
        }
    }
    let lineCount = model.getLineCount();
    let readStart = true;
    let rangeContinue = -1;
    let rangeContinue_value = '';
    let description = "";
    let R_file = [];
    let R_name = [];
    for (let i = 1; i <= lineCount; i++) {
        let row = model.getLineContent(i);
        let value = row.substring(18, 24).trim();
        let valType = row.substring(16, 17).trim();
        let sp_op = row.substring(44, 49).trim();

        if (valType === 'R') {
            readStart = true;
            R_name.push(value);
        }
        if (sp_op === 'PFILE') {
            readStart = false;
            R_file.push(row.substring(50, row.indexOf(')')));
        }
        if (readStart === true && row.substring(5, 6) === 'A' && row.substring(6, 7) !== '*') {
            if (rangeContinue > 0) {
                if (value.length > 0) {//continue End
                    let start = rangeContinue;
                    for (let p = 1; p < rangeContinue; p++) {
                        let back_row = model.getLineContent(rangeContinue - p);
                        if (back_row.substring(6, 7) === '*') {
                            start = rangeContinue - p;
                        } else {
                            break;
                        }
                    }
                    let end = i - 1;
                    for (let p = 1; p < end; p++) {
                        let back_row = model.getLineContent(end);
                        if (back_row.substring(6, 7) === '*') {
                            end = end - 1;
                        } else {
                            break;
                        }
                    }
                    map.set(rangeContinue_value, { location: { range: new monaco.Range(start, 5, end, Number.MAX_VALUE), uri: model.uri }, description: refName + ' : ' + description, s_description: description, sourceType: "definition", handle: handle });
                    rangeContinue = i;
                    rangeContinue_value = value;
                    description = await createDescription(row, i, model, lineCount);
                } else if (sp_op.length === 0) {//Other Line
                    let start = rangeContinue;
                    for (let p = 1; p < rangeContinue; p++) {
                        let back_row = model.getLineContent(rangeContinue - p);
                        if (back_row.substring(6, 7) === '*') {
                            start = rangeContinue - p;
                        } else {
                            break;
                        }
                    }
                    let end = i - 1;
                    for (let p = 1; p < end; p++) {
                        let back_row = model.getLineContent(end);
                        if (back_row.substring(6, 7) === '*') {
                            end = end - 1;
                        } else {
                            break;
                        }
                    }
                    map.set(rangeContinue_value, { location: { range: new monaco.Range(start, 5, end, Number.MAX_VALUE), uri: model.uri }, description: refName + ' : ' + description, s_description: description, sourceType: "definition", handle: handle });
                    rangeContinue = -1;
                }
            } else {
                //多分最初
                if (value.length > 0) {
                    rangeContinue = i;
                    rangeContinue_value = value;
                    description = await createDescription(row, i, model, lineCount);
                }
            }
        }
        if (rangeContinue > 0 && lineCount === i) {
            map.set(rangeContinue_value, { location: { range: new monaco.Range(rangeContinue, 5, i, Number.MAX_VALUE), uri: model.uri }, description: refName + ' : ' + description, s_description: description, sourceType: "definition", handle: handle });
        }
    }
    let fileDescription = "FIleObject";
    if (R_name.length > 0) {
        for (let i = 1; i <= lineCount; i++) {
            let row = model.getLineContent(i);
            let value = row.substring(18, 24).trim();

            if (row.substring(5, 6) === 'A' && row.substring(6, 7) !== '*' && value === R_name[0]) {
                fileDescription = await createDescription(row, i, model, lineCount)
            }
        }
    }
    let clone = structuredClone(use);
    if (map.has(refName)) {
        let before = map.get(refName);
        clone.io = new Set([...clone.io, ...before.use.io]);
    }
    map.set(refName, { location: { range: new monaco.Range(1, 5, lineCount, Number.MAX_VALUE), uri: model.uri }, description: refName + ' : ' + fileDescription, s_description: fileDescription, sourceType: "file", handle: handle, use: clone });
    if (R_file.length > 0) {
        for (let i = 0; i < R_file.length; i++) {
            if (await reflist.has(R_file[i])) {
                let before = reflist.get(R_file[i]);
                use.io = new Set([...use.io, ...before.use.io]);
                use.original = false;
            }
            await reflist.set(R_file[i], { name: R_file[i], use: use });
        }
    }
    return map;
}
