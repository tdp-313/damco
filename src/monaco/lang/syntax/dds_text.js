export const getRow_DDSText = (row, columns) => {
    if (columns <= 0) {
        return { text: "", startColumn: 0, endColumn: 0 };
    }
    if (row.substring(6, 7) === "*") {
        return { text: "", startColumn: 0, endColumn: 0 };
    }
    if (columns == 6) {
        return { text: row.substring(5, 6), startColumn: 6, endColumn: 7, type: 'dds_format' };
    }
    if (row.substring(5, 6) === "A") {
        if (columns <= 5) {
            return { text: row.substring(0, 5), startColumn: 1, endColumn: 6, type: 'page' };
        }
        else if (columns === 7) {
            return { text: row.substring(6, 7), startColumn: 7, endColumn: 8, type: 'controlLevel' };
        }
        else if (columns === 8) {
            return { text: row.substring(7, 8), startColumn: 8, endColumn: 9, type: 'flag_not' };
        }
        else if (columns <= 10) {
            return { text: row.substring(8, 10), startColumn: 9, endColumn: 11, type: 'flag' };
        }
        else if (columns === 11) {
            return { text: row.substring(10, 11), startColumn: 11, endColumn: 12, type: 'flag_not' };
        }
        else if (columns <= 13) {
            return { text: row.substring(11, 13), startColumn: 12, endColumn: 14, type: 'flag' };
        }
        else if (columns === 14) {
            return { text: row.substring(13, 14), startColumn: 14, endColumn: 15, type: 'flag_not' };
        }
        else if (columns <= 16) {
            return { text: row.substring(14, 16), startColumn: 15, endColumn: 17, type: 'flag' };
        }
        else if (columns === 17) {
            return { text: row.substring(16, 17), startColumn: 17, endColumn: 18, type: 'dds_valType' };
        }
        else if (columns === 18) {
            return { text: row.substring(17, 18), startColumn: 18, endColumn: 19, type: 'other' };
        }
        else if (columns <= 28) {
            return { text: row.substring(18, 28), startColumn: 19, endColumn: 28, type: 'dds_val' };
        }
        else if (columns == 29) {
            return { text: row.substring(29, 30), startColumn: 28, endColumn: 29, type: 'other' };
        }
        else if (columns <= 34) {
            return { text: row.substring(30, 34), startColumn: 29, endColumn: 35, type: 'fieldLen' };
        }
        else if (columns === 35) {
            return { text: row.substring(34, 35), startColumn: 35, endColumn: 36, type: 'fieldType' };
        }
        else if (columns === 36) {
            return { text: row.substring(35, 36), startColumn: 36, endColumn: 37, type: 'other' };
        }
        else if (columns === 37) {
            return { text: row.substring(36, 37), startColumn: 37, endColumn: 38, type: 'fieldDec' };
        }
        else if (columns === 38) {
            return { text: row.substring(37, 38), startColumn: 38, endColumn: 39, type: 'IO_Option' };
        }
        else if (columns <= 41) {
            return { text: row.substring(38, 41), startColumn: 39, endColumn: 42, type: 'dds_row' };
        }
        else if (columns <= 44) {
            return { text: row.substring(41, 44), startColumn: 42, endColumn: 45, type: 'dds_column' };
        }
        else if (columns <= 80) {
            return { text: row.substring(44, 80), startColumn: 45, endColumn: 81, type: 'dds_operation' };
        }
        return { text: "", startColumn: 0, endColumn: 0 };
    }
    console.log("dds_nomatch");
    return { text: "", startColumn: columns, endColumn: columns };
}
export const tip_dds = {
    tip_dds_format: {
        type: 'fixed',
        description: "DDSのA仕様書です。",
        detail: {}
    },
    tip_other: {
        type: 'fixed',
        description: "",
        detail: {}
    },
    tip_fieldType: {
        type: 'simpleDetail',
        description: "未定義",
        name: "未定義",
        detail: {
            A: {
                name: "文字型",
                description: "普通の文字列型"
            },
            O: {
                name: "2バイト文字",
                description: "日本語はこれ"
            },
            S: {
                name: "数値型",
                description: "通常の数値はこれ"
            },
        }
    },
    tip_dds_valType: {
        type: 'simpleDetail',
        description: "未定義",
        name: "未定義",
        detail: {
            K: {
                name: "キー名",
                description: "キー名として設定"
            },
            R: {
                name: "レコード名",
                description: "レコード名として設定"
            }
        }
    },
    tip_IO_Option: {
        type: 'Detail_2',
        description: "",
        name: "フィールド定義",
        detail: {
            I: {
                description: "入力のみ"
            },
            O: {
                description: "出力のみ"
            },
            B: {
                description: "入力/出力"
            }
        }
    },
    tip_dds_val : {
        type: 'auto-fixed',
        description: "フィールド名",
        detail: {}
    },
    tip_dds_row: {
        type: 'fixed',
        description: "上からの行位置 (y)",
        detail: {}
    },
    tip_dds_column: {
        type: 'fixed',
        description: "左からの列位置 (x)",
        detail: {}
    },
    tip_dds_operation: {
        type: 'fixed',
        description: "",
        detail: {}
    }

};