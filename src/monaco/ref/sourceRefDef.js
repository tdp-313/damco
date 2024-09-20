export const sourceRefDefStart = async (refModel, refDef) => {
    refDef.clear();
    var lineCount = await refModel.getLineCount();
    let mode = "";
    for (let i = 1; i <= lineCount; i++) {
        // 行のテキストを取得
        let row = refModel.getLineContent(i);
        if (row.substring(5, 6) === "C" && row.substring(6, 7) !== "*") {
            let op_1 = row.substring(17, 27).trim();
            let op_m = row.substring(45, 50).trim();
            let op_2 = row.substring(50, 60).trim();
            let fieldLen = row.substring(67, 70).trim();
            let result = row.substring(60, 66).trim();

            if (op_1 === "*ENTRY" && op_m === "PLIST") {
                mode = "ENTRY";
            } else if (op_m === "PARM") {
                if (result !== "") {
                    refDef.set(result, { location: { range: new monaco.Range(i, 5, i, 77), uri: refModel.uri }, s_description: mode + " PARAMETER", sourceType: "definition", description: result + " : " + mode + " PARAMETER" })
                }
            } else {
                mode = ""
            }
            if (op_m === 'BEGSR') {
                refDef.set(op_2, { location: { range: new monaco.Range(i, 5, i, 77), uri: refModel.uri }, s_description: "SUB ROUTINE", sourceType: "definition", description: op_2 + " : " + "SUB ROUTINE" })
            }
        }
    }
    return refDef;
}