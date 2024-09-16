export const getRow_Text = (row, columns) => {
    if (columns <= 0) {
        return { text: "", startColumn: 0, endColumn: 0 };
    }
    if (row.substring(6, 7) === "*") {
        return { text: "", startColumn: 0, endColumn: 0 };
    }
    if (columns == 6) {
        return { text: row.substring(5, 6), startColumn: 6, endColumn: 7, type: 'format' };
    }

    if (row.substring(5, 6) === "C") {
        if (columns <= 2) {
            return { text: row.substring(0, 2), startColumn: 1, endColumn: 3, type: 'page' };
        }
        else if (columns <= 5) {
            return { text: row.substring(2, 5), startColumn: 3, endColumn: 6, type: 'rowID' };
        }
        else if (columns <= 8) {
            return { text: row.substring(6, 8), startColumn: 7, endColumn: 9, type: 'controlLevel' };
        }
        else if (columns == 9) {
            return { text: row.substring(8, 9), startColumn: 9, endColumn: 10, type: 'flag_not' };
        }
        else if (columns <= 11) {
            return { text: row.substring(9, 11), startColumn: 10, endColumn: 12, type: 'flag' };
        }
        else if (columns == 12) {
            return { text: row.substring(11, 12), startColumn: 12, endColumn: 13, type: 'flag_not' };
        }
        else if (columns <= 14) {
            return { text: row.substring(12, 14), startColumn: 13, endColumn: 15, type: 'flag' };
        }
        else if (columns == 15) {
            return { text: row.substring(14, 15), startColumn: 15, endColumn: 16, type: 'flag_not' };
        }
        else if (columns <= 17) {
            return { text: row.substring(15, 17), startColumn: 16, endColumn: 18, type: 'flag' };
        }
        else if (columns <= 27) {
            return { text: row.substring(17, 27), startColumn: 18, endColumn: 28, type: 'operation1' };
        }
        else if (columns <= 45) {
            return { text: row.substring(27, 45), startColumn: 28, endColumn: 46, type: 'bracket2' };
        }
        else if (columns <= 50) {
            return { text: row.substring(45, 50), startColumn: 46, endColumn: 51, type: 'operation' };
        }
        else if (columns <= 60) {
            return { text: row.substring(50, 60), startColumn: 51, endColumn: 61, type: 'operation2' };
        }
        else if (columns <= 66) {
            return { text: row.substring(60, 66), startColumn: 61, endColumn: 67, type: 'result' };
        }
        else if (columns <= 69) {
            return { text: row.substring(66, 69), startColumn: 67, endColumn: 70, type: 'fieldLen' };
        }
        else if (columns == 70) {
            return { text: row.substring(69, 70), startColumn: 70, endColumn: 71, type: 'fieldDec' };
        }
        else if (columns == 71) {
            return { text: row.substring(70, 71), startColumn: 71, endColumn: 72, type: 'additionaOperation' };
        }
        else if (columns <= 73) {
            return { text: row.substring(71, 73), startColumn: 72, endColumn: 74, type: 'flag1' };
        }
        else if (columns <= 75) {
            return { text: row.substring(73, 75), startColumn: 74, endColumn: 76, type: 'flag2' };
        }
        else if (columns <= 77) {
            return { text: row.substring(75, 77), startColumn: 76, endColumn: 78, type: 'flag3' };
        }
        else if (columns <= 92) {
            return { text: row.substring(77, 92), startColumn: 78, endColumn: 92, type: 'comment' };
        }
        return { text: "", startColumn: 0, endColumn: 0 };
    }

    if (row.substring(5, 6) === "I") {
        if (columns <= 44) {
            return { text: "", startColumn: columns, endColumn: columns, type: 'none' };
        }
        else if (columns <= 47) {
            return { text: row.substring(43, 47), startColumn: 44, endColumn: 48, type: 'ds_start' };
        }
        else if (columns <= 51) {
            return { text: row.substring(47, 51), startColumn: 48, endColumn: 52, type: 'ds_end' };
        }
        else if (columns === 52) {
            return { text: row.substring(51, 52), startColumn: 52, endColumn: 53, type: 'fieldDec' };
        }
        else if (columns <= 58) {
            return { text: row.substring(52, 58), startColumn: 53, endColumn: 59, type: 'fieldName' };
        }
    }

    if (row.substring(5, 6) === "F") {
        if (row.substring(52, 53) !== "K") {
            if (columns <= 5) {
                return { text: "", startColumn: columns, endColumn: columns, type: 'none' };
            }
            else if (columns <= 14) {
                return { text: row.substring(6, 14), startColumn: 7, endColumn: 15, type: 'memberName' };
            }
            else if (columns === 15) {
                return { text: row.substring(14, 15), startColumn: 44, endColumn: 48, type: 'fileIO' };
            }
        } else {
            if (columns <= 18) {
                return { text: "", startColumn: columns, endColumn: columns, type: 'none' };
            }
            else if (columns <= 28) {
                return { text: row.substring(18, 28), startColumn: 19, endColumn: 29, type: 'recordID' };
            }
            else if (columns <= 46) {
                return { text: row.substring(28, 46), startColumn: 29, endColumn: 47, type: 'none' };
            }
            else if (columns <= 52) {
                return { text: row.substring(46, 52), startColumn: 47, endColumn: 53, type: 'sfileID' };
            }
            else if (columns === 53) {
                return { text: row.substring(52, 53), startColumn: 53, endColumn: 54, type: 'file_K' };
            }
            else if (columns <= 59) {
                return { text: row.substring(53, 59), startColumn: 54, endColumn: 60, type: 'file_S' };
            }
            else if (columns <= 67) {
                return { text: row.substring(59, 67), startColumn: 60, endColumn: 68, type: 'file_R' };
            }
        }
    }
    if (row.substring(5, 6) === "O") {
        if (columns <= 32) {
            return { text: "", startColumn: columns, endColumn: columns, type: 'none' };
        }
        else if (columns <= 37) {
            return { text: row.substring(31, 37), startColumn:31, endColumn: 37, type: 'outputFileld' };
        }
    }
    console.log("nomatch");
    return { text: "", startColumn: columns, endColumn: columns };
}
export const tip_rpg = {
    tip_sfileID : {
        type: 'fixed',
        description: "SFILEの相対レコードフィールド名",
        detail: {}
    },
    tip_file_K : {
        type: 'fixed',
        description: "継続記入行「K」",
        detail: {}
    },
    tip_file_R : {
        type: 'auto-fixed',
        description: "継続記入行オプションに対する記入項目",
        detail: {}
    },
    tip_file_S : {
        type: 'simpleDetail',
        description: "継続記入行オプション",
        name: "仕様書タイプ",
        detail: {
            COMIT: {
                name: "",
                description: "コミットメント制御を受けるように指定"
            },
            ID: {
                name: "",
                description: "ファイル内で処理されているレコードを提供したプログラム装置の名前"
            },
            IND: {
                name: "",
                description: "配列に関する記述を行います。"
            },
            IGNORE: {
                name: "",
                description: "レコード様式を無視する。レコード様式が無いような状態で動作する。"
            },
            IND: {
                name: "",
                description: "NUMと同時指定、01から指定した番号までの標識を保管復元する。"
            },
            INFDS: {
                name: "",
                description: "ファイルに対して例外/エラー情報を入れるデータ構造を定義する。"
            },
            INFSR: {
                name: "",
                description: "指定したファイルに対して入力したSRへエラー後に移動することができる。"
            },
            NUM: {
                name: "",
                description: "デフォルト値1、ID,IND、SAVDSと同時に使用。"
            },
            PASS: {
                name: "",
                description: "*NOIND"
            },
            PLIST: {
                name: "",
                description: "装置がSPECIALのみ、渡すパラメータリストを入力。"
            },
            PRTCTL: {
                name: "",
                description: "印刷装置の動的制御オプション"
            },
            RECNO: {
                name: "",
                description: "相対レコード番号を使用する際に使用。"
            },
            RENAME: {
                name: "",
                description: "外部記述ファイルのレコード様式名の名前変更を行う。"
            },
            SFILE: {
                name: "",
                description: "サブファイルの相対レコード番号。レコード様式名を右に記入する。"
            },
            SLN: {
                name: "",
                description: "開始行番号を書き出す。"
            }
        }
    },
    tip_page : {
        type: 'fixed',
        description: "各仕様書に割り当てるページ番号を記入します。",
        detail: {}
    },
    tip_rowID : {
        type: 'fixed',
        description: "仕様書につける番号を記入します。",
        detail: {}
    },
    tip_format : {
        type: 'simpleDetail',
        description: "H/F/E/L/I/C/O",
        name: "仕様書タイプ",
        detail: {
            H: {
                name: "制御仕様書",
                description: "日付・2バイト文字仕様の記述を指定します。"
            },
            F: {
                name: "ファイル仕様書",
                description: "ファイルに関しての記述を行います。"
            },
            E: {
                name: "補足仕様書",
                description: "配列に関する記述を行います。"
            },
            L: {
                name: "制御仕様書",
                description: "印刷出力ファイルに関する記述を行います。"
            },
            I: {
                name: "入力仕様書",
                description: "データ構造に関する記述を行います。"
            },
            C: {
                name: "演算仕様書",
                description: "演算に関する記述を行います。"
            },
            O: {
                name: "出力仕様書",
                description: "出力の様式に関する記述を行います。"
            }
        }
    },
    tip_controlLevel : {
        type: 'Detail_2',
        description: "",
        name: "制御レベル",
        detail: {
            L0: {
                description: "各プログラム・サイクルの合計演算時に演算命令が実行されます。"
            },
            L1: {
                description: "標識がオンになっている場合に各プログラム・サイクルの合計演算時に行われます。"
            },
            L2: {
                description: "標識がオンになっている場合に各プログラム・サイクルの合計演算時に行われます。"
            },
            L3: {
                description: "標識がオンになっている場合に各プログラム・サイクルの合計演算時に行われます。"
            },
            L4: {
                description: "標識がオンになっている場合に各プログラム・サイクルの合計演算時に行われます。"
            },
            L5: {
                description: "標識がオンになっている場合に各プログラム・サイクルの合計演算時に行われます。"
            },
            L6: {
                description: "標識がオンになっている場合に各プログラム・サイクルの合計演算時に行われます。"
            },
            L7: {
                description: "標識がオンになっている場合に各プログラム・サイクルの合計演算時に行われます。"
            },
            L8: {
                description: "標識がオンになっている場合に各プログラム・サイクルの合計演算時に行われます。"
            },
            L9: {
                description: "標識がオンになっている場合に各プログラム・サイクルの合計演算時に行われます。"
            },
            LR: {
                description: "最後のレコードが処理された後、もしくは標識がオンになった後で演算命令が実行されます。"
            },
            SR: {
                description: "サブルーチンの一部であることを明示します。任意指定。"
            },
            AN: {
                description: "複数行にわたって標識を条件付けをします。"
            },
            OR: {
                description: "複数行にわたって標識を条件付けをします。"
            }
        }
    },
    tip_flag_not : {
        type: 'fixed',
        description: "右の標識をnot指定します。",
        detail: {}
    },
    tip_flag : {
        type: 'substr',
        len: 1,
        name: "条件付け標識",
        detail: {
            0: {
                description: "一般的な標識です。だいたい36番以降を使います。"
            },
            1: {
                description: "一般的な標識です。だいたい36番以降を使います。"
            },
            2: {
                description: "一般的な標識です。だいたい36番以降を使います。"
            },
            3: {
                description: "一般的な標識です。だいたい36番以降を使います。"
            },
            4: {
                description: "一般的な標識です。だいたい36番以降を使います。"
            },
            5: {
                description: "一般的な標識です。だいたい36番以降を使います。"
            },
            6: {
                description: "一般的な標識です。だいたい36番以降を使います。"
            },
            7: {
                description: "一般的な標識です。だいたい36番以降を使います。"
            },
            8: {
                description: "一般的な標識です。だいたい36番以降を使います。"
            },
            9: {
                description: "一般的な標識です。だいたい36番以降を使います。"
            },
            K: {
                description: "機能キー標識です。"
            },
            L: {
                description: "制御レベル標識です。L0-L9/LR(最終レコード標識)"
            },
            M: {
                description: "突き合わせレコード標識です。"
            },
            H: {
                description: "停止標識です。"
            },
            R: {
                description: "戻り標識です。"
            },
            U: {
                description: "外部標識です。"
            },
            O: {
                description: "オーバーフロー標識です。"
            },
        }
    },
    tip_operation1 : {
        type: 'auto-fixed',
        description: "命令コードに対する演算命令1です。",
        detail: {}
    },
    tip_operation2 : {
        type: 'auto-fixed',
        description: "命令コードに対する演算命令2です。",
        detail: {}
    },
    tip_operation : {
        type: 'simpleDetail',
        description: "未設定",
        name: "命令コード",
        detail: {
            ACQ: {
                name: "ファイル命令",
                description: "獲得"
            },
            CHAIN: {
                name: "ファイル命令",
                description: "ファイルのランダム検索。見つからないとオン。",
                description2: "|*検索引数|*ファイル名|データ構造|【 *NR ER _ 】"
            },
            DELET: {
                name: "ファイル命令",
                description: "レコードの削除",
                description2: "|検索引数|*ファイル名|X|【 N RER _ 】"
            },
            EXFMT: {
                name: "ファイル命令",
                description: "様式の書き出し/および読み取り",
                description2: "|X|*レコード様式名|X|【 _ ER _ 】"
            },
            READ: {
                name: "ファイル命令",
                description: "レコードの読み取り。最終レコードでEOFがON",
                description2: "|X|*ファイル名・レコード名|データ構造|【 _ ER *EOF 】"
            },
            READC: {
                name: "ファイル命令",
                description: "次の変更レコードの読み取り。最終レコードでEOFがON",
                description2: "|X|*レコード名|X|【 _ ER *EOF 】"
            },
            READE: {
                name: "ファイル命令",
                description: "等しいレコードの読み取り。最終レコードでEOFがON",
                description2: "|検索引数|*ファイル名・レコード名|データ構造|【 _ ER *EOF 】"
            },
            READP: {
                name: "ファイル命令",
                description: "前のレコードの読み取り。最終レコードでEOFがON",
                description2: "|X|*ファイル名・レコード名|データ構造|【 _ ER *EOF 】"
            },
            REDPE: {
                name: "ファイル命令",
                description: "前の等しいレコードの読み取り。最終レコードでEOFがON",
                description2: "|検索引数|*ファイル名・レコード名|データ構造|【 _ ER *EOF 】"
            },
            SETLL: {
                name: "ファイル命令",
                description: "下限のセット・見つからないとEQがOFF",
                description2: "|*検索引数|*ファイル名|X|【 NR ER EQ 】"
            },
            SETGT: {
                name: "ファイル命令",
                description: "上限のセット・見つからないとOFF",
                description2: "|*検索引数|*ファイル名|X|【 NR ER EQ 】"
            },
            WRITE: {
                name: "ファイル命令",
                description: "新しいレコードの作成",
                description2: "|X|*ファイル名|*データ構造|【 _ER EOF 】"
            },
            UPDAT: {
                name: "ファイル命令",
                description: "既存レコードの変更",
                description2: "|X|*ファイル名|*データ構造|【 _ER EOF 】"
            },
            IFEQ: {
                name: "条件分岐命令",
                description: "Operator1 = Operator2",
            },
            IFNE: {
                name: "条件分岐命令",
                description: "Operator1 <> Operator2",
            },
            IFLT: {
                name: "条件分岐命令",
                description: "Operator1 < Operator2",
            },
            IFGT: {
                name: "条件分岐命令",
                description: "Operator1 > Operator2",
            },
            IFLE: {
                name: "条件分岐命令",
                description: "Operator1 <= Operator2",
            },
            IFGE: {
                name: "条件分岐命令",
                description: "Operator1 >= Operator2",
            },
            WHEQ: {
                name: "条件分岐命令",
                description: "Operator1 = Operator2",
            },
            WHNE: {
                name: "条件分岐命令",
                description: "Operator1 <> Operator2",
            },
            WHLT: {
                name: "条件分岐命令",
                description: "Operator1 < Operator2",
            },
            WHGT: {
                name: "条件分岐命令",
                description: "Operator1 > Operator2",
            },
            WHLE: {
                name: "条件分岐命令",
                description: "Operator1 <= Operator2",
            },
            WHGE: {
                name: "条件分岐命令",
                description: "Operator1 >= Operator2",
            },
            CABEQ: {
                name: "条件分岐命令",
                description: "Operator1 = Operator2",
            },
            CABNE: {
                name: "条件分岐命令",
                description: "Operator1 <> Operator2",
            },
            CABLT: {
                name: "条件分岐命令",
                description: "Operator1 < Operator2",
            },
            CABGT: {
                name: "条件分岐命令",
                description: "Operator1 > Operator2",
            },
            CABLE: {
                name: "条件分岐命令",
                description: "Operator1 <= Operator2",
            },
            CABGE: {
                name: "条件分岐命令",
                description: "Operator1 >= Operator2",
            },
            OREQ: {
                name: "条件分岐命令",
                description: "Operator1 = Operator2",
            },
            ORNE: {
                name: "条件分岐命令",
                description: "Operator1 <> Operator2",
            },
            ORLT: {
                name: "条件分岐命令",
                description: "Operator1 < Operator2",
            },
            ORGT: {
                name: "条件分岐命令",
                description: "Operator1 > Operator2",
            },
            ORLE: {
                name: "条件分岐命令",
                description: "Operator1 <= Operator2",
            },
            ORGE: {
                name: "条件分岐命令",
                description: "Operator1 >= Operator2",
            },
            ANDEQ: {
                name: "条件分岐命令",
                description: "Operator1 = Operator2",
            },
            ANDNE: {
                name: "条件分岐命令",
                description: "Operator1 <> Operator2",
            },
            ANDLT: {
                name: "条件分岐命令",
                description: "Operator1 < Operator2",
            },
            ANDGT: {
                name: "条件分岐命令",
                description: "Operator1 > Operator2",
            },
            ANDLE: {
                name: "条件分岐命令",
                description: "Operator1 <= Operator2",
            },
            ANDGE: {
                name: "条件分岐命令",
                description: "Operator1 >= Operator2",
            },
            CASEQ: {
                name: "条件分岐命令",
                description: "Operator1 = Operator2",
            },
            CASNE: {
                name: "条件分岐命令",
                description: "Operator1 <> Operator2",
            },
            CASLT: {
                name: "条件分岐命令",
                description: "Operator1 < Operator2",
            },
            CASGT: {
                name: "条件分岐命令",
                description: "Operator1 > Operator2",
            },
            CASLE: {
                name: "条件分岐命令",
                description: "Operator1 <= Operator2",
            },
            CASGE: {
                name: "条件分岐命令",
                description: "Operator1 >= Operator2",
            },
            COMP: {
                name: "比較命令",
                description: "Operation1がOperation2よりも～",
                description2: "【 HI LO EQ 】"
            }
        }
    },
    tip_result : {
        type: 'auto-fixed',
        description: "命令コードに対する演算結果です。",
        detail: {}
    },
    tip_fieldLen : {
        type: 'fixed',
        description: "フィールドの長さ (数字1-30 文字1-256)",
        detail: {}
    },
    tip_fieldDec : {
        type: 'fixed',
        description: "小数部分の桁数 (0-9)",
        detail: {}
    },
    tip_additionaOperation : {
        type: 'Detail_2',
        description: "ブランク/H/N/P",
        name: "命令の拡張",
        detail: {
            H: {
                description: "四捨五入を行います。"
            },
            N: {
                description: "レコードを読み取りますが、ロックしません。"
            },
            P: {
                description: "結果フィールドにブランクを埋め込みます。"
            }
        }
    },
    tip_fileIO : {
        type: 'Detail_2',
        description: "I/O/U",
        name: "ファイルの読み込み",
        detail: {
            I: {
                description: "読み取り専用"
            },
            O: {
                description: "書き出し専用"
            },
            U: {
                description: "読み取りと書き出し"
            }
        }
    },
    tip_flag1 : {
        type: 'substr',
        len: 1,
        name: "【 左 】結果の標識",
        detail: {
            0: {
                description: "一般的な標識です。だいたい36番以降を使います。"
            },
            1: {
                description: "一般的な標識です。だいたい36番以降を使います。"
            },
            2: {
                description: "一般的な標識です。だいたい36番以降を使います。"
            },
            3: {
                description: "一般的な標識です。だいたい36番以降を使います。"
            },
            4: {
                description: "一般的な標識です。だいたい36番以降を使います。"
            },
            5: {
                description: "一般的な標識です。だいたい36番以降を使います。"
            },
            6: {
                description: "一般的な標識です。だいたい36番以降を使います。"
            },
            7: {
                description: "一般的な標識です。だいたい36番以降を使います。"
            },
            8: {
                description: "一般的な標識です。だいたい36番以降を使います。"
            },
            9: {
                description: "一般的な標識です。だいたい36番以降を使います。"
            },
            K: {
                description: "機能キー標識です。"
            },
            L: {
                description: "制御レベル標識です。L0-L9/LR(最終レコード標識)"
            },
            M: {
                description: "突き合わせレコード標識です。"
            },
            H: {
                description: "停止標識です。"
            },
            R: {
                description: "戻り標識です。"
            },
            U: {
                description: "外部標識です。"
            },
            O: {
                description: "オーバーフロー標識です。"
            },
        }
    },
    tip_flag2 : {
        type: 'substr',
        len: 1,
        name: "【 中 】結果の標識",
        detail: {
            0: {
                description: "一般的な標識です。だいたい36番以降を使います。"
            },
            1: {
                description: "一般的な標識です。だいたい36番以降を使います。"
            },
            2: {
                description: "一般的な標識です。だいたい36番以降を使います。"
            },
            3: {
                description: "一般的な標識です。だいたい36番以降を使います。"
            },
            4: {
                description: "一般的な標識です。だいたい36番以降を使います。"
            },
            5: {
                description: "一般的な標識です。だいたい36番以降を使います。"
            },
            6: {
                description: "一般的な標識です。だいたい36番以降を使います。"
            },
            7: {
                description: "一般的な標識です。だいたい36番以降を使います。"
            },
            8: {
                description: "一般的な標識です。だいたい36番以降を使います。"
            },
            9: {
                description: "一般的な標識です。だいたい36番以降を使います。"
            },
            K: {
                description: "機能キー標識です。"
            },
            L: {
                description: "制御レベル標識です。L0-L9/LR(最終レコード標識)"
            },
            M: {
                description: "突き合わせレコード標識です。"
            },
            H: {
                description: "停止標識です。"
            },
            R: {
                description: "戻り標識です。"
            },
            U: {
                description: "外部標識です。"
            },
            O: {
                description: "オーバーフロー標識です。"
            },
        }
    },
    tip_flag3 : {
        type: 'substr',
        len: 1,
        name: "【 右 】結果の標識",
        detail: {
            0: {
                description: "一般的な標識です。だいたい36番以降を使います。"
            },
            1: {
                description: "一般的な標識です。だいたい36番以降を使います。"
            },
            2: {
                description: "一般的な標識です。だいたい36番以降を使います。"
            },
            3: {
                description: "一般的な標識です。だいたい36番以降を使います。"
            },
            4: {
                description: "一般的な標識です。だいたい36番以降を使います。"
            },
            5: {
                description: "一般的な標識です。だいたい36番以降を使います。"
            },
            6: {
                description: "一般的な標識です。だいたい36番以降を使います。"
            },
            7: {
                description: "一般的な標識です。だいたい36番以降を使います。"
            },
            8: {
                description: "一般的な標識です。だいたい36番以降を使います。"
            },
            9: {
                description: "一般的な標識です。だいたい36番以降を使います。"
            },
            K: {
                description: "機能キー標識です。"
            },
            L: {
                description: "制御レベル標識です。L0-L9/LR(最終レコード標識)"
            },
            M: {
                description: "突き合わせレコード標識です。"
            },
            H: {
                description: "停止標識です。"
            },
            R: {
                description: "戻り標識です。"
            },
            U: {
                description: "外部標識です。"
            },
            O: {
                description: "オーバーフロー標識です。"
            },
        }
    },
    tip_comment : {
        type: 'fixed',
        description: "コメント",
        detail: {}
    },
    tip_ds_start : {
        type: 'fixed',
        description: "フィールドの開始位置",
        detail: {}
    },
    tip_ds_end : {
        type: 'fixed',
        description: "フィールドの終了位置",
        detail: {}
    },
    tip_fieldName : {
        type: 'auto-fixed',
        description: "定義するサブフィールド名",
        detail: {}
    },
    tip_memberName : {
        type: 'auto-fixed',
        description: "ファイルオブジェクト名",
        detail: {}
    },
    tip_recordID : {
        type: 'auto-fixed',
        description: "レコード様式の外部名",
        detail: {}
    },tip_outputFileld : {
        type: 'auto-fixed',
        description: "出力されるフィールド名",
        detail: {}
    }
}