// RPGLE のホバー説明(初心者向け)。命令コード・キーワード・組み込み関数・特殊値・固定形式の記号の欄の辞書と、
// カーソル位置からホバー内容を組み立てる処理。内容は IBM i 7.5 ILE RPG 解説書に基づく。
// monaco / DOM には依存しない(テストから使うため)。
import { cut, toColumnLine, jsToIbmColumn, ibmToJsColumn, stripFill } from "../column.js";
import { findDefinitions, wordAt } from "./rpgleParse.js";

// ---------------------------------------------------------------------------
// 固定形式の欄(記号の意味)
// 名前・長さ・位置・キーワードなど見れば分かる欄と、C 仕様書・H 仕様書は説明しない。
// F・D・P・I・O 仕様書の、1-2 文字の記号で書く分かりにくい欄だけを対象にする。
// ---------------------------------------------------------------------------
const DATA_TYPES = {
    A: '文字', B: '2進数(BINDEC)', C: 'UCS-2(Unicode)', D: '日付', F: '浮動小数点', G: '図形(全角・DBCS)',
    I: '整数', N: '標識(*ON / *OFF)', O: 'オブジェクト(Java)', P: 'パック10進数', S: 'ゾーン10進数',
    T: '時刻', U: '符号なし整数', Z: 'タイムスタンプ', '*': 'ポインター',
};

const F_FIELDS = [
    { from: 17, to: 17, name: 'ファイル・タイプ', values: { I: '入力(読むだけ)', O: '出力(書くだけ)', U: '更新(読んで書き換える。UPDATE・DELETE が使える)', C: '結合(入力と出力の両方。主に画面)' } },
    { from: 18, to: 18, name: 'ファイル指定', values: { F: '全手続き(READ・CHAIN などの命令で読み書きする)', P: '1次ファイル(RPG サイクルで自動的に読む)', S: '2次ファイル(RPG サイクルで 1次の後に読む)', R: 'レコード・アドレス・ファイル', T: '配列・テーブル・ファイル' } },
    { from: 19, to: 19, name: 'ファイルの終わり', values: { E: 'このファイルを最後まで読んだらプログラムを終える条件にする' } },
    { from: 20, to: 20, name: 'ファイル追加', values: { A: 'レコードの追加(WRITE)ができる' } },
    { from: 21, to: 21, name: '順序', values: { A: '突き合わせのキーが昇順', D: '突き合わせのキーが降順' } },
    { from: 22, to: 22, name: 'ファイル形式', values: { E: '外部記述(DDS などのレコード様式・フィールドをそのまま使う)', F: 'プログラム記述(レコードの中身を I・O 仕様書で自分で定義する)' } },
    { from: 28, to: 28, name: '限界処理', values: { L: 'レコード・アドレス・ファイルで範囲を指定して読む' } },
    { from: 34, to: 34, name: 'レコード・アドレス・タイプ', values: { K: 'キーを使って読む(CHAIN・SETLL などでキーを指定できる)', A: '文字のキー', P: 'パック10進数のキー', G: '図形のキー', D: '日付のキー', T: '時刻のキー', Z: 'タイムスタンプのキー', F: '浮動小数点のキー' } },
    { from: 35, to: 35, name: 'ファイル編成', values: { I: '索引付きファイル', T: 'レコード・アドレス・ファイル' } },
];

const D_FIELDS = [
    { from: 22, to: 22, name: '外部記述', values: { E: 'ファイルのレコード様式からサブフィールドを作る' } },
    { from: 23, to: 23, name: 'データ構造のタイプ', values: { S: 'プログラム状況データ構造(PSDS。プログラムの状態を受け取る)', U: 'データ域データ構造(*LDA などのデータ域と結びつける)' } },
    { from: 24, to: 25, name: '定義タイプ', values: { S: 'スタンドアロン・フィールド(単独の変数)', C: '名前付き定数', DS: 'データ構造', PR: 'プロトタイプ(呼び出す相手の引数の形)', PI: '手続きインターフェース(このプログラム・プロシージャーが受け取る引数)' } },
    { from: 40, to: 40, name: 'データ・タイプ', values: DATA_TYPES },
];

const P_FIELDS = [
    { from: 24, to: 24, name: '開始・終了', values: { B: 'プロシージャーの開始', E: 'プロシージャーの終了' } },
];

const I_RECORD_FIELDS = [
    { from: 17, to: 18, name: '順序', desc: 'レコード・タイプの順序' },
    { from: 19, to: 19, name: '数', values: { 1: 'このレコード・タイプは1件だけ', N: '件数に制限なし' } },
    { from: 20, to: 20, name: 'オプション', values: { O: 'このレコード・タイプは任意' } },
    { from: 21, to: 22, name: 'レコード識別標識', desc: 'このレコードを読んだときにオンになる標識' },
    { from: 23, to: 46, name: 'レコード識別コード', desc: 'レコードの種類を見分けるための位置と文字' },
];
const I_FIELD_INDICATORS = [
    { from: 63, to: 64, name: '制御レベル', desc: 'この値が変わったら制御レベル標識(L1-L9)をオンにする' },
    { from: 65, to: 66, name: '突き合わせフィールド', desc: '複数ファイルの突き合わせに使う(M1-M9)' },
    { from: 67, to: 68, name: 'フィールド・レコード関係', desc: 'この標識がオンのときだけフィールドを読む' },
    { from: 69, to: 74, name: 'フィールド標識', desc: '値が 正(69-70)・負(71-72)・ゼロか空白(73-74)のときにオンにする標識' },
];
const I_PROGRAM_FIELDS = [
    { from: 31, to: 34, name: 'データ属性', desc: '日付・時刻の形式や可変長などの属性' },
    { from: 36, to: 36, name: 'データ形式', values: { P: 'パック10進数', B: '2進数', I: '整数', U: '符号なし整数', F: '浮動小数点', S: 'ゾーン10進数', A: '文字', G: '図形', C: 'UCS-2', D: '日付', T: '時刻', Z: 'タイムスタンプ', N: '標識', '*': 'ポインター' } },
].concat(I_FIELD_INDICATORS);

const O_RECORD_FIELDS = [
    { from: 17, to: 17, name: 'タイプ', values: { H: '見出しレコード', D: '明細レコード', T: '合計レコード', E: '例外レコード(EXCEPT 命令で出力する)' } },
    { from: 18, to: 20, name: '追加・削除 / フェッチ', values: { ADD: 'レコードを追加する', DEL: 'レコードを削除する', F: 'オーバーフロー時に見出しなどを先に出力する(フェッチ)', R: '装置を解放する' } },
    { from: 21, to: 29, name: '出力標識', desc: 'このレコードを出力する条件の標識' },
    { from: 40, to: 42, name: '前スペース', desc: '印刷前に空ける行数' },
    { from: 43, to: 45, name: '後スペース', desc: '印刷後に空ける行数' },
    { from: 46, to: 48, name: '前スキップ', desc: '印刷前に移動する行' },
    { from: 49, to: 51, name: '後スキップ', desc: '印刷後に移動する行' },
];
const O_FIELD_FIELDS = [
    { from: 21, to: 29, name: '出力標識', desc: 'このフィールドを出力する条件の標識' },
    { from: 44, to: 44, name: '編集コード', desc: '数値の編集方法(1-4・A-D はカンマ付き、J-Q は符号付き、X・Y・Z など)' },
    { from: 45, to: 45, name: 'ブランク・アフター', values: { B: '出力後にフィールドを空白・ゼロにする' } },
    { from: 52, to: 52, name: 'データ形式', values: { P: 'パック10進数', B: '2進数', I: '整数', U: '符号なし整数', F: '浮動小数点', L: '符号を左に付ける', R: '符号を右に付ける', S: 'ゾーン10進数', A: '文字', G: '図形', C: 'UCS-2', N: '標識', D: '日付', T: '時刻', Z: 'タイムスタンプ' } },
];

const fieldsFor = (info) => {
    const col = info.col;
    switch (info.spec) {
        case 'F':
            return F_FIELDS;
        case 'D':
            return D_FIELDS;
        case 'P':
            return P_FIELDS;
        case 'I':
            if (cut(col, 7, 16).trim() !== '') {
                return I_RECORD_FIELDS;
            }
            return cut(col, 21, 30).trim() !== '' ? I_FIELD_INDICATORS : I_PROGRAM_FIELDS;
        case 'O':
            return cut(col, 7, 20).trim() !== '' ? O_RECORD_FIELDS : O_FIELD_FIELDS;
        default:
            // C 仕様書・H 仕様書は説明しない
            return [];
    }
};

// 固定形式の行の、指定した桁(1始まり)にある記号の欄の説明。値が空、または説明がない値なら null
export const fixedFieldAt = (info, column) => {
    if (info.kind !== 'fixed') {
        return null;
    }
    const field = fieldsFor(info).find((f) => column >= f.from && column <= f.to);
    if (!field) {
        return null;
    }
    const value = stripFill(cut(info.col, field.from, field.to)).trim();
    if (value === '') {
        return null;
    }
    const text = field.values ? field.values[value.toUpperCase()] : field.desc;
    if (!text) {
        return null;
    }
    return { from: field.from, to: field.to, name: field.name, value: value, text: text };
};

// ---------------------------------------------------------------------------
// 命令コード
// ---------------------------------------------------------------------------
const cond = { EQ: '等しい', NE: '等しくない', LT: 'より小さい', GT: 'より大きい', LE: '以下', GE: '以上' };

export const OPCODES = {
    ACQ: { desc: '装置(画面など)を獲得する。', syntax: 'ACQ 装置名 ファイル名' },
    ADD: { desc: '足し算(固定形式)。演算項目1 + 演算項目2 を結果フィールドへ。', fixed: true },
    ALLOC: { desc: 'メモリーを確保してポインターを返す(フリー形式では %ALLOC)。' },
    BEGSR: { desc: 'サブルーチンの始まり。ENDSR までがサブルーチンで、EXSR で呼び出す。', syntax: 'BEGSR サブルーチン名;' },
    BITOFF: { desc: 'ビットをオフにする(固定形式)。', fixed: true },
    BITON: { desc: 'ビットをオンにする(固定形式)。', fixed: true },
    CALL: { desc: 'プログラムを動的に呼び出す(固定形式のみ)。引数は続く PARM 行で渡す。フリー形式では EXTPGM のプロトタイプと CALLP を使う。', syntax: "CALL 'プログラム名'", fixed: true },
    CALLB: { desc: 'バインドされたプロシージャーを呼び出す(固定形式のみ)。フリー形式では CALLP を使う。', fixed: true },
    CALLP: { desc: 'プロトタイプ(DCL-PR)を使ってプログラム・プロシージャーを呼び出す。フリー形式では CALLP を省略して 名前(引数) と書ける。', syntax: 'CALLP 名前(引数1 : 引数2);' },
    CAT: { desc: '文字列の連結(固定形式)。フリー形式では + 演算子を使う。', fixed: true },
    CHAIN: { desc: 'キーを指定してレコードを1件読む。見つかれば %FOUND がオン。更新ファイルならロックがかかる(ロックしないなら CHAIN(N))。', syntax: 'CHAIN キー ファイル名またはレコード様式名 {データ構造};' },
    CHECK: { desc: '文字列に、指定した文字以外が最初に現れる位置を調べる(フリー形式では %CHECK)。' },
    CHECKR: { desc: 'CHECK を右から調べる(フリー形式では %CHECKR)。' },
    CLEAR: { desc: '変数・データ構造・レコード様式を空白・ゼロなどの既定値にする。', syntax: 'CLEAR 名前;' },
    CLOSE: { desc: 'ファイルを閉じる。', syntax: 'CLOSE ファイル名;' },
    COMMIT: { desc: 'コミットメント制御の変更を確定する。' },
    COMP: { desc: '比較して結果標識(高・低・等しい)を設定する(固定形式)。', fixed: true },
    DEALLOC: { desc: 'ALLOC・%ALLOC で確保したメモリーを解放する。' },
    DEFINE: { desc: '*LIKE DEFINE で他のフィールドと同じ属性のフィールドを定義する(固定形式)。', fixed: true },
    DELETE: { desc: 'レコードを削除する。キーを指定しなければ最後に読んだレコードを削除。', syntax: 'DELETE {キー} ファイル名またはレコード様式名;' },
    DIV: { desc: '割り算(固定形式)。フリー形式では / 演算子や %DIV を使う。', fixed: true },
    DO: { desc: '指定回数繰り返す(固定形式)。END・ENDDO で終わる。', fixed: true },
    DOU: { desc: '条件が真になるまで繰り返す(最低1回は実行)。ENDDO で終わる。', syntax: 'DOU 条件; ... ENDDO;' },
    DOW: { desc: '条件が真の間、繰り返す。ENDDO で終わる。', syntax: 'DOW 条件; ... ENDDO;' },
    DSPLY: { desc: 'メッセージを表示する(簡単な確認・デバッグ用)。', syntax: 'DSPLY 表示する値;' },
    DUMP: { desc: 'プログラムの変数などをダンプ出力する(デバッグ用)。' },
    ELSE: { desc: 'IF の条件が偽のときに実行する部分の始まり。' },
    ELSEIF: { desc: '前の IF・ELSEIF が偽のときに、別の条件を調べる。', syntax: 'ELSEIF 条件;' },
    END: { desc: 'DO・IF・SELECT などのブロックの終わり(固定形式)。', fixed: true },
    ENDCS: { desc: 'CASxx のグループの終わり(固定形式)。', fixed: true },
    ENDDO: { desc: 'DO・DOU・DOW の終わり。' },
    ENDFOR: { desc: 'FOR・FOR-EACH の終わり。' },
    ENDIF: { desc: 'IF の終わり。' },
    ENDMON: { desc: 'MONITOR の終わり。' },
    ENDSL: { desc: 'SELECT の終わり。' },
    ENDSR: { desc: 'サブルーチンの終わり。' },
    EVAL: { desc: '式の結果を代入する。フリー形式では EVAL を省略できる。EVAL(H) で四捨五入。', syntax: 'EVAL 変数 = 式;' },
    'EVAL-CORR': { desc: '同じ名前のサブフィールドどうしを、まとめて代入する。', syntax: 'EVAL-CORR データ構造1 = データ構造2;' },
    EVALR: { desc: '右寄せで代入する(文字列)。', syntax: 'EVALR 変数 = 式;' },
    EXCEPT: { desc: '出力仕様書の例外レコード(タイプ E)を出力する。', syntax: 'EXCEPT {EXCEPT 名};' },
    EXFMT: { desc: '画面のレコード様式を表示して、入力を待つ(WRITE と READ をまとめたもの)。', syntax: 'EXFMT レコード様式名;' },
    EXSR: { desc: 'サブルーチンを呼び出す。', syntax: 'EXSR サブルーチン名;' },
    FEOD: { desc: 'ファイルの終わりを強制する(書き出しバッファを反映する)。' },
    FOR: { desc: '回数を数えながら繰り返す。ENDFOR で終わる。', syntax: 'FOR i = 1 TO 10 {BY 1}; ... ENDFOR;' },
    'FOR-EACH': { desc: '配列などの要素を1つずつ取り出して繰り返す。ENDFOR で終わる。', syntax: 'FOR-EACH 要素 IN 配列; ... ENDFOR;' },
    FORCE: { desc: 'RPG サイクルで次に読むファイルを指定する(固定形式)。', fixed: true },
    GOTO: { desc: 'TAG で付けた位置へ移動する(固定形式)。', fixed: true },
    IF: { desc: '条件が真のときに実行する。ELSE・ELSEIF・ENDIF と組み合わせる。', syntax: 'IF 条件; ... ENDIF;' },
    IN: { desc: 'データ域の内容を読み込む。', syntax: 'IN {*LOCK} データ域名;' },
    ITER: { desc: 'ループの残りを飛ばして、次の繰り返しへ進む。' },
    KFLD: { desc: 'キー・リスト(KLIST)を構成するフィールド(固定形式)。', fixed: true },
    KLIST: { desc: '複数のフィールドからなるキーを定義する(固定形式)。フリー形式では %KDS やキー値を並べて書く。', fixed: true },
    LEAVE: { desc: 'ループを途中で抜ける。' },
    LEAVESR: { desc: 'サブルーチンを途中で抜ける。' },
    LOOKUP: { desc: '配列・テーブルの中を探す(固定形式)。フリー形式では %LOOKUP。', fixed: true },
    MONITOR: { desc: 'エラーを監視するブロックの始まり。エラーが起きると ON-ERROR へ進む。ENDMON で終わる。' },
    MOVE: { desc: '値を右寄せで移す(固定形式)。フリー形式では代入・%CHAR・%DEC などを使う。', fixed: true },
    MOVEA: { desc: '配列と文字列の間で値を移す(固定形式)。', fixed: true },
    MOVEL: { desc: '値を左寄せで移す(固定形式)。フリー形式では代入や %SUBST を使う。', fixed: true },
    MULT: { desc: '掛け算(固定形式)。フリー形式では * 演算子。', fixed: true },
    MVR: { desc: '直前の DIV の余りを取り出す(固定形式)。フリー形式では %REM。', fixed: true },
    NEXT: { desc: '次に入力を読む装置を指定する(WORKSTN)。' },
    'ON-ERROR': { desc: 'MONITOR の中でエラーが起きたときに実行する部分。状況コードで絞り込める。', syntax: 'ON-ERROR {状況コード};' },
    'ON-EXIT': { desc: 'プロシージャーを抜けるときに必ず実行する部分。' },
    OPEN: { desc: 'ファイルを開く(USROPN を指定したファイル用)。', syntax: 'OPEN ファイル名;' },
    OTHER: { desc: 'SELECT のどの WHEN にも当たらなかったときに実行する部分。' },
    OUT: { desc: 'データ域へ書き出す。', syntax: 'OUT {*LOCK} データ域名;' },
    PARM: { desc: 'CALL・PLIST のパラメーター(固定形式)。', fixed: true },
    PLIST: { desc: 'パラメーター・リストの定義(固定形式)。*ENTRY PLIST はこのプログラムが受け取る引数。フリー形式では DCL-PI を使う。', fixed: true },
    POST: { desc: 'ファイル情報データ構造(INFDS)を最新にする。' },
    READ: { desc: '次のレコードを読む。ファイルの終わりで %EOF がオン。', syntax: 'READ ファイル名またはレコード様式名 {データ構造};' },
    READC: { desc: 'サブファイルの中で、画面で変更されたレコードを次に読む。', syntax: 'READC サブファイル様式名;' },
    READE: { desc: '同じキーを持つ次のレコードを読む。なくなると %EOF がオン。', syntax: 'READE キー ファイル名;' },
    READP: { desc: '前のレコードを読む。先頭を過ぎると %EOF がオン。', syntax: 'READP ファイル名;' },
    READPE: { desc: '同じキーを持つ前のレコードを読む。', syntax: 'READPE キー ファイル名;' },
    REL: { desc: '装置を解放する。' },
    RESET: { desc: '変数などを初期値(INZ で指定した値)に戻す。', syntax: 'RESET 名前;' },
    RETURN: { desc: 'プロシージャー・プログラムから呼び出し元に戻る。値を返すこともできる。', syntax: 'RETURN {値};' },
    ROLBK: { desc: 'コミットメント制御の変更を取り消す。' },
    SCAN: { desc: '文字列を検索する(固定形式)。フリー形式では %SCAN。', fixed: true },
    SELECT: { desc: '複数の条件から1つを選んで実行する。WHEN・OTHER・ENDSL と組み合わせる。' },
    SETGT: { desc: 'キーより大きい最初のレコードの位置に合わせる(読まない)。', syntax: 'SETGT キー ファイル名;' },
    SETLL: { desc: 'キー以上の最初のレコードの位置に合わせる(読まない)。キーが一致するかは %EQUAL、あるかは %FOUND で分かる。', syntax: 'SETLL キー ファイル名;' },
    SETOFF: { desc: '標識をオフにする(固定形式)。フリー形式では *INxx = *OFF。', fixed: true },
    SETON: { desc: '標識をオンにする(固定形式)。フリー形式では *INxx = *ON。', fixed: true },
    'SND-MSG': { desc: 'メッセージを送る(ジョブ・ログなど)。', syntax: "SND-MSG 'メッセージ';" },
    SORTA: { desc: '配列を並べ替える。', syntax: 'SORTA 配列;' },
    SQRT: { desc: '平方根(固定形式)。フリー形式では %SQRT。', fixed: true },
    SUB: { desc: '引き算(固定形式)。フリー形式では - 演算子。', fixed: true },
    SUBST: { desc: '文字列の一部を取り出す(固定形式)。フリー形式では %SUBST。', fixed: true },
    TAG: { desc: 'GOTO・CABxx の移動先の目印(固定形式)。', fixed: true },
    TEST: { desc: '日付・時刻・タイムスタンプが正しいか調べる。エラーなら %ERROR がオン(TEST(E))。', syntax: 'TEST(E) {形式} 値;' },
    TIME: { desc: '現在の日付・時刻を取り出す(固定形式)。フリー形式では %DATE()・%TIME()・%TIMESTAMP()。', fixed: true },
    UNLOCK: { desc: 'レコードのロックやデータ域のロックを解除する。', syntax: 'UNLOCK ファイル名;' },
    UPDATE: { desc: '最後に読んだレコードを書き換える。%FIELDS で更新するフィールドを限定できる。', syntax: 'UPDATE レコード様式名 {データ構造};' },
    WHEN: { desc: 'SELECT の中で、条件が真のときに実行する部分。', syntax: 'WHEN 条件;' },
    WRITE: { desc: 'レコードを追加する。画面のレコード様式なら画面に書き出す(入力は待たない)。', syntax: 'WRITE レコード様式名 {データ構造};' },
    XFOOT: { desc: '配列の合計(固定形式)。フリー形式では %XFOOT。', fixed: true },
    XLATE: { desc: '文字を置き換える(固定形式)。フリー形式では %XLATE。', fixed: true },
    'XML-INTO': { desc: 'XML 文書を変数(データ構造)に取り込む。' },
    'XML-SAX': { desc: 'XML 文書を SAX 形式で解析する。' },
    'DATA-INTO': { desc: 'JSON などの文書を、パーサー・プログラムを使って変数に取り込む。' },
    'DATA-GEN': { desc: '変数の内容から JSON などの文書を作る。' },
    'Z-ADD': { desc: 'ゼロにしてから足す = 値を代入する(固定形式)。', fixed: true },
    'Z-SUB': { desc: 'ゼロから引く = 符号を反転して代入する(固定形式)。', fixed: true },
    EXEC: { desc: '埋め込み SQL の始まり(EXEC SQL)。SQLRPGLE で使う。' },
    ADDDUR: { desc: '日付・時刻に期間を足す(固定形式)。フリー形式では 日付 + %DAYS(n) など。', fixed: true },
    SUBDUR: { desc: '日付・時刻から期間を引く、または2つの差を求める(固定形式)。フリー形式では %DIFF など。', fixed: true },
    EXTRCT: { desc: '日付・時刻の一部(年・月など)を取り出す(固定形式)。フリー形式では %SUBDT。', fixed: true },
    OCCUR: { desc: '複数オカレンスのデータ構造のオカレンスを設定・取得する(フリー形式では %OCCUR)。' },
    TESTB: { desc: '文字フィールドのビットを調べる(固定形式)。', fixed: true },
    TESTN: { desc: '文字フィールドが数字かどうか調べる(固定形式)。', fixed: true },
    TESTZ: { desc: '先頭の文字のゾーンを調べる(固定形式)。', fixed: true },
    SHTDN: { desc: 'システムの終了処理中かどうか調べる(フリー形式では %SHTDN)。' },
    MHHZO: { desc: 'ゾーンの移動(上位→上位、固定形式)。', fixed: true },
    MHLZO: { desc: 'ゾーンの移動(上位→下位、固定形式)。', fixed: true },
    MLHZO: { desc: 'ゾーンの移動(下位→上位、固定形式)。', fixed: true },
    MLLZO: { desc: 'ゾーンの移動(下位→下位、固定形式)。', fixed: true },
    'ON-EXCP': { desc: 'MONITOR の中で、指定したメッセージ ID の例外が起きたときに実行する部分。' },
};
for (const [c, text] of Object.entries(cond)) {
    OPCODES['IF' + c] = { desc: `演算項目1 が演算項目2 ${text}ときに実行する(固定形式)。END・ENDIF で終わる。`, fixed: true };
    OPCODES['DOW' + c] = { desc: `演算項目1 が演算項目2 ${text}間、繰り返す(固定形式)。`, fixed: true };
    OPCODES['DOU' + c] = { desc: `演算項目1 が演算項目2 ${text}ようになるまで繰り返す(固定形式)。`, fixed: true };
    OPCODES['WHEN' + c] = { desc: `SELECT の中で、演算項目1 が演算項目2 ${text}ときに実行する(固定形式)。`, fixed: true };
    OPCODES['AND' + c] = { desc: `前の行の条件に「演算項目1 が演算項目2 ${text}」を AND で追加する(固定形式)。`, fixed: true };
    OPCODES['OR' + c] = { desc: `前の行の条件に「演算項目1 が演算項目2 ${text}」を OR で追加する(固定形式)。`, fixed: true };
    OPCODES['CAB' + c] = { desc: `演算項目1 が演算項目2 ${text}とき、結果フィールドの TAG へ移動する(固定形式)。`, fixed: true };
    OPCODES['CAS' + c] = { desc: `演算項目1 が演算項目2 ${text}とき、結果フィールドのサブルーチンを呼ぶ(固定形式)。`, fixed: true };
}
OPCODES.CAS = { desc: '条件なしでサブルーチンを呼ぶ(CASxx のグループの最後、固定形式)。', fixed: true };
OPCODES.CAB = { desc: '無条件で TAG へ移動する(固定形式)。', fixed: true };

// 命令コードの拡張
export const EXTENDERS = {
    E: 'エラーが起きてもプログラムを止めず、%ERROR をオンにする',
    N: 'レコードをロックしないで読む',
    H: '結果を四捨五入する',
    P: '結果フィールドの残りを空白・ゼロで埋める',
    D: '操作記述子を渡す',
    M: '既定の精度規則で計算する',
    R: '結果の小数部桁数に合わせた精度規則で計算する',
    A: 'DUMP をいつでも実行する',
};

// ---------------------------------------------------------------------------
// キーワード・データ型(宣言・ファイル・定義・制御)
// ---------------------------------------------------------------------------
export const KEYWORDS = {
    // 宣言
    'CTL-OPT': 'プログラム全体のオプションを指定する(固定形式の H 仕様書と同じ)。',
    'DCL-F': 'ファイルを宣言する。装置(DISK・WORKSTN・PRINTER)を省略すると DISK。',
    'DCL-S': 'スタンドアロン・フィールド(単独の変数)を宣言する。',
    'DCL-C': '名前付き定数を宣言する。',
    'DCL-DS': 'データ構造(複数のサブフィールドをまとめたもの)を宣言する。END-DS で終わる。',
    'DCL-SUBF': 'データ構造のサブフィールドを宣言する(名前が命令コードと同じ場合に必要。通常は省略)。',
    'DCL-PR': 'プロトタイプを宣言する(呼び出すプログラム・プロシージャーの引数の形)。END-PR で終わる。',
    'DCL-PI': '手続きインターフェースを宣言する(このプログラム・プロシージャーが受け取る引数)。END-PI で終わる。',
    'DCL-PARM': 'パラメーターを宣言する(名前が命令コードと同じ場合に必要。通常は省略)。',
    'DCL-PROC': 'プロシージャー(サブプロシージャー)の始まり。END-PROC で終わる。',
    'DCL-ENUM': '列挙(関連する定数のまとまり)を宣言する。END-ENUM で終わる。',
    'END-DS': 'データ構造の宣言の終わり。',
    'END-PR': 'プロトタイプの宣言の終わり。',
    'END-PI': '手続きインターフェースの宣言の終わり。',
    'END-PROC': 'プロシージャーの終わり。',
    'END-ENUM': '列挙の終わり。',
    // ファイル
    DISK: 'データベース・ファイル(物理・論理ファイル、表)。',
    WORKSTN: '画面(表示装置ファイル)。USAGE の既定値は *INPUT : *OUTPUT。',
    PRINTER: '印刷ファイル。USAGE の既定値は *OUTPUT。',
    SEQ: '順次ファイル(テープなど)。',
    SPECIAL: '特殊ファイル(自作の入出力プログラムを使う)。',
    USAGE: 'ファイルの使い方。*INPUT(読む)・*OUTPUT(書く)・*UPDATE(更新)・*DELETE(削除)。省略時は DISK=*INPUT、PRINTER=*OUTPUT、WORKSTN=*INPUT:*OUTPUT。',
    KEYED: 'キーを使ってファイルを読む(CHAIN・SETLL・READE でキーを指定できる)。',
    EXTDESC: 'コンパイル時にレコード様式を取り出すファイルを指定する。',
    EXTFILE: '実行時に開くファイルを指定する。*EXTDESC なら EXTDESC と同じファイル。',
    EXTMBR: '開くメンバーを指定する。',
    RENAME: 'レコード様式の名前を変える(外部の名前 : プログラム内の名前)。ファイル名とレコード様式名が同じときによく使う。',
    PREFIX: 'フィールド名の先頭に文字を付ける(同じ名前のフィールドが複数のファイルにあるときなど)。',
    SFILE: 'サブファイルのレコード様式と、相対レコード番号を入れるフィールドを指定する。',
    INDDS: '画面・印刷の標識を、*INxx ではなくデータ構造で受け渡す。',
    INFDS: 'ファイル情報(状況コードなど)を受け取るデータ構造を指定する。',
    INFSR: 'ファイルのエラー時に呼ばれるサブルーチンを指定する。',
    USROPN: 'プログラム開始時に自動で開かない(OPEN 命令で自分で開く)。',
    BLOCK: '複数レコードをまとめて読み書きするか(*YES / *NO)。',
    COMMIT: 'コミットメント制御の下でファイルを使う。',
    OFLIND: '印刷のオーバーフロー(ページ末)を知らせる標識を指定する。',
    LIKEFILE: '別のファイルと同じ定義でファイルを宣言する。',
    TEMPLATE: '実体を作らず、LIKEDS・LIKEFILE などのひな形としてだけ使う。',
    QUALIFIED: 'サブフィールド・レコード様式を「名前.サブフィールド」の形で指定する。',
    IGNORE: '指定したレコード様式を使わない。',
    INCLUDE: '指定したレコード様式だけを使う。',
    RECNO: '相対レコード番号を入れるフィールドを指定する。',
    STATIC: 'プロシージャーを抜けても値を保持する。',
    HANDLER: 'Open Access のハンドラーを指定する。',
    MAXDEV: '1つの画面ファイルで使う装置の数(*ONLY / *FILE)。',
    DEVID: '装置名を入れるフィールドを指定する。',
    SAVEDS: '装置ごとに保存するデータ構造を指定する。',
    SAVEIND: '装置ごとに保存する標識の数を指定する。',
    // データ型
    CHAR: '固定長の文字。CHAR(長さ)。',
    VARCHAR: '可変長の文字。VARCHAR(最大長)。',
    GRAPH: '固定長の図形(全角・DBCS)。',
    VARGRAPH: '可変長の図形(全角・DBCS)。',
    UCS2: '固定長の UCS-2(Unicode)。',
    VARUCS2: '可変長の UCS-2(Unicode)。',
    IND: '標識(*ON / *OFF の1桁)。',
    PACKED: 'パック10進数。PACKED(全体の桁数 : 小数部の桁数)。',
    ZONED: 'ゾーン10進数。ZONED(全体の桁数 : 小数部の桁数)。',
    BINDEC: '2進10進数。BINDEC(桁数 : 小数部の桁数)。',
    INT: '整数。INT(3・5・10・20)。',
    UNS: '符号なし整数。UNS(3・5・10・20)。',
    FLOAT: '浮動小数点。FLOAT(4・8)。',
    DATE: '日付型。DATE(*ISO) のように形式を指定できる。%DATE() で今日の日付。',
    TIME: '時刻型。%TIME() で現在の時刻。',
    TIMESTAMP: 'タイムスタンプ型(日付と時刻)。%TIMESTAMP() で現在の日時。',
    POINTER: 'ポインター(メモリーのアドレス)。',
    OBJECT: 'Java オブジェクト。',
    // 定義
    LIKE: '指定した変数と同じ型・長さで定義する。',
    LIKEDS: '指定したデータ構造と同じ形のデータ構造・パラメーターを定義する。',
    LIKEREC: 'ファイルのレコード様式と同じ形のデータ構造を定義する。',
    INZ: '初期値を指定する。INZ だけなら型の既定値(空白・ゼロ)。',
    DIM: '配列にする。DIM(要素数)。',
    CTDATA: '配列の値をソースの末尾(** 以降)のコンパイル時データから読み込む。',
    PERRCD: 'コンパイル時データの1行あたりの要素数。',
    ASCEND: '配列が昇順に並んでいることを示す。',
    DESCEND: '配列が降順に並んでいることを示す。',
    BASED: 'ポインターが指す場所のデータとして定義する(自分では領域を持たない)。',
    CONST: 'パラメーターを読み取り専用で受け取る(式や定数も渡せる)。定数の値を指定するときにも使う。',
    VALUE: 'パラメーターを値渡しにする(呼び出し先で変えても呼び出し元に影響しない)。',
    OPTIONS: 'パラメーターのオプション。*NOPASS(省略可)・*OMIT(*OMIT を渡せる)・*VARSIZE(長さ可変)など。',
    EXTPGM: 'このプロトタイプがプログラム(*PGM)を呼ぶことを示す。引数を省略するとプロトタイプ名を大文字にした名前。',
    EXTPROC: 'このプロトタイプがプロシージャーを呼ぶことを示し、外部の名前を指定する。',
    EXPORT: '他のモジュールから使えるように公開する。',
    IMPORT: '他のモジュールで公開された変数を使う。',
    EXTNAME: 'ファイルのレコード様式からサブフィールドを作る(外部記述データ構造)。',
    EXTFLD: '外部記述データ構造のサブフィールドを別名にする。',
    OVERLAY: '他のサブフィールドと同じ場所に重ねて定義する。',
    POS: 'サブフィールドの開始位置(バイト)を指定する。',
    PSDS: 'プログラム状況データ構造(プログラム名・ユーザー・エラー情報などを受け取る)。',
    DTAARA: 'データ域と結びつける(IN・OUT 命令で読み書きする)。',
    NOOPT: '最適化しない(常にメモリー上の値を使う)。',
    VARYING: '可変長にする(固定形式の定義仕様書で使う)。',
    LEN: '長さを指定する。',
    ALIAS: '外部の長い別名(ALIAS 名)をフィールド名に使う。',
    OCCURS: '複数オカレンスのデータ構造にする。',
    SAMEPOS: '指定したサブフィールドと同じ位置に定義する。',
    RTNPARM: '戻り値をパラメーターとして渡す(大きな戻り値の性能改善)。',
    OPDESC: '操作記述子を渡す。',
    // 制御
    DFTACTGRP: '既定の活動化グループで動かすか。*NO にすると ILE の機能(プロシージャー呼び出しなど)が使える。',
    ACTGRP: '活動化グループを指定する(*NEW・*CALLER・名前)。',
    OPTION: 'コンパイルのオプション。*SRCSTMT(ソースの行番号でデバッグ)・*NODEBUGIO(入出力でデバッグを止めない)など。',
    MAIN: 'メイン・プロシージャーを指定する(RPG サイクルを使わない)。',
    NOMAIN: 'メイン・プロシージャーがないモジュール(サービス・プログラム用)。',
    BNDDIR: '結合に使うバインディング・ディレクトリーを指定する。',
    DATFMT: '日付の既定の形式(*ISO・*YMD など)。',
    TIMFMT: '時刻の既定の形式。',
    DECEDIT: '小数点の文字や区切りの既定値。',
    COPYRIGHT: '著作権の文字列をプログラムに埋め込む。',
    DEBUG: 'デバッグ用の命令(DUMP など)を有効にする。',
    ALWNULL: 'ヌル値を持てるフィールドの扱いを指定する。',
    CCSID: '文字のコード化文字セット ID を指定する。',
    EXPROPTS: '式の計算方法のオプション。',
    TRUNCNBR: '数値のあふれを切り捨てるかエラーにするか。',
    // 演算子
    AND: '両方の条件が真なら真。',
    OR: 'どちらかの条件が真なら真。',
    NOT: '条件を反対にする。',
    TO: 'FOR の終わりの値(増やしながら繰り返す)。',
    DOWNTO: 'FOR の終わりの値(減らしながら繰り返す)。',
    BY: 'FOR で1回に増やす(減らす)量。',
};

// ---------------------------------------------------------------------------
// 組み込み関数
// ---------------------------------------------------------------------------
export const BIFS = {
    '%ABS': '絶対値。',
    '%ADDR': '変数のアドレス(ポインター)。',
    '%ALLOC': 'メモリーを確保してポインターを返す。',
    '%BITAND': 'ビットごとの AND。',
    '%BITNOT': 'ビットごとの NOT。',
    '%BITOR': 'ビットごとの OR。',
    '%BITXOR': 'ビットごとの XOR。',
    '%CHAR': '文字列に変換する。日付なら %CHAR(日付 : *ISO) のように形式を指定できる。',
    '%CHECK': '指定した文字以外が最初に現れる位置(なければ 0)。',
    '%CHECKR': '%CHECK を右から調べる。',
    '%DATE': '日付に変換する。引数なしなら今日の日付。',
    '%DAYS': '日数(日付の計算用。日付 + %DAYS(1) で翌日)。',
    '%DEC': 'パック10進数に変換する。%DEC(値 : 桁数 : 小数部の桁数)。',
    '%DECH': '四捨五入してパック10進数に変換する。',
    '%DIFF': '2つの日付・時刻の差。%DIFF(日付1 : 日付2 : *DAYS)。',
    '%DIV': '割り算の商(整数)。',
    '%EDITC': '編集コードで数値を文字列にする(カンマ・符号など)。',
    '%EDITW': '編集語で数値を文字列にする。',
    '%ELEM': '配列の要素数。',
    '%EOF': '直前の READ などでファイルの終わりに達したら *ON。',
    '%EQUAL': '直前の SETLL でキーが一致するレコードがあれば *ON。',
    '%ERROR': '(E) を付けた命令でエラーが起きたら *ON。',
    '%FIELDS': 'UPDATE で更新するフィールドを限定する。',
    '%FOUND': '直前の CHAIN・SETLL・DELETE などでレコードが見つかれば *ON。',
    '%GRAPH': '図形(DBCS)に変換する。',
    '%HOURS': '時間(時刻の計算用)。',
    '%INT': '整数に変換する(小数部は切り捨て)。',
    '%INTH': '四捨五入して整数に変換する。',
    '%KDS': 'データ構造をキーとして使う(CHAIN %KDS(ds))。',
    '%LEN': '長さ(可変長なら現在の長さ)。',
    '%LIST': '値を並べて配列を作る。',
    '%LOOKUP': '配列の中を探して、見つかった要素の番号を返す(なければ 0)。',
    '%LOWER': '小文字に変換する。',
    '%MAX': '最大値。',
    '%MIN': '最小値。',
    '%MINUTES': '分(時刻の計算用)。',
    '%MONTHS': '月数(日付の計算用)。',
    '%MSECONDS': 'マイクロ秒(時刻の計算用)。',
    '%NULLIND': 'ヌル標識を調べる・設定する。',
    '%OCCUR': 'データ構造のオカレンスを設定・取得する。',
    '%OPEN': 'ファイルが開いていれば *ON。',
    '%PADDR': 'プロシージャーのアドレス。',
    '%PARMNUM': 'パラメーターの番号。',
    '%PARMS': '渡されたパラメーターの数。',
    '%PASSED': 'パラメーターが渡されたかどうか。',
    '%PROC': '現在のプロシージャーの名前。',
    '%RANGE': '範囲を表す(IF x IN %RANGE(1:10))。',
    '%REALLOC': '確保したメモリーの大きさを変える。',
    '%REM': '割り算の余り。',
    '%REPLACE': '文字列の一部を置き換える。',
    '%SCAN': '文字列を検索して位置を返す(なければ 0)。',
    '%SCANR': '%SCAN を右から探す。',
    '%SCANRPL': '文字列の中の全部の一致を置き換える。',
    '%SECONDS': '秒(時刻の計算用)。',
    '%SHTDN': 'システムの終了処理中なら *ON。',
    '%SIZE': 'バイト数。',
    '%SPLIT': '区切り文字で文字列を分けて配列にする。',
    '%SQRT': '平方根。',
    '%STATUS': 'ファイル・プログラムの状況コード。',
    '%STR': 'ヌル終了文字列(C 言語形式)との変換。',
    '%SUBARR': '配列の一部。',
    '%SUBDT': '日付・時刻の一部(年・月・日など)を取り出す。',
    '%SUBST': '文字列の一部を取り出す。%SUBST(文字列 : 開始位置 : 長さ)。',
    '%TIME': '時刻に変換する。引数なしなら現在の時刻。',
    '%TIMESTAMP': 'タイムスタンプに変換する。引数なしなら現在の日時。',
    '%TLOOKUP': 'テーブルの中を探す。',
    '%TRIM': '前後の空白を取り除く。',
    '%TRIML': '先頭の空白を取り除く。',
    '%TRIMR': '末尾の空白を取り除く。',
    '%UCS2': 'UCS-2(Unicode)に変換する。',
    '%UNS': '符号なし整数に変換する。',
    '%UNSH': '四捨五入して符号なし整数に変換する。',
    '%UPPER': '大文字に変換する。',
    '%XFOOT': '配列の合計。',
    '%XLATE': '文字を置き換える。%XLATE(変換前 : 変換後 : 文字列)。',
    '%YEARS': '年数(日付の計算用)。',
    '%CHARCOUNT': '文字数(バイト数ではなく文字の数)。',
    '%CONCAT': '区切り文字をはさんで文字列を連結する。%CONCAT(区切り : 文字列1 : 文字列2 ...)。',
    '%CONCATARR': '配列の要素を、区切り文字をはさんで連結する。',
    '%DATA': 'DATA-INTO で取り込む文書とオプションを指定する。',
    '%DECPOS': '数値の小数部の桁数。',
    '%EDITFLT': '浮動小数点を文字列にする。',
    '%FLOAT': '浮動小数点に変換する。',
    '%GEN': 'DATA-GEN で使うジェネレーターとオプションを指定する。',
    '%HANDLER': 'XML-SAX・DATA-INTO で使う処理プロシージャーを指定する。',
    '%HIVAL': 'その変数の型で一番大きい値。',
    '%LOVAL': 'その変数の型で一番小さい値。',
    '%LEFT': '文字列の左から指定した文字数を取り出す。%LEFT(文字列 : 文字数)。',
    '%RIGHT': '文字列の右から指定した文字数を取り出す。%RIGHT(文字列 : 文字数)。',
    '%LOOKUPLT': '配列の中で、指定した値より小さい一番近い要素の番号。',
    '%LOOKUPLE': '配列の中で、指定した値以下の一番近い要素の番号。',
    '%LOOKUPGT': '配列の中で、指定した値より大きい一番近い要素の番号。',
    '%LOOKUPGE': '配列の中で、指定した値以上の一番近い要素の番号。',
    '%TLOOKUPLT': 'テーブルの中で、指定した値より小さい一番近い要素を探す。',
    '%TLOOKUPLE': 'テーブルの中で、指定した値以下の一番近い要素を探す。',
    '%TLOOKUPGT': 'テーブルの中で、指定した値より大きい一番近い要素を探す。',
    '%TLOOKUPGE': 'テーブルの中で、指定した値以上の一番近い要素を探す。',
    '%MAXARR': '配列の中で最大の要素の番号。',
    '%MINARR': '配列の中で最小の要素の番号。',
    '%MSG': 'メッセージ ID とメッセージ・ファイルを指定する(SND-MSG で使う)。',
    '%OMITTED': 'パラメーターに *OMIT が渡されたかどうか。',
    '%PARSER': 'DATA-INTO で使うパーサーとオプションを指定する。',
    '%TARGET': 'SND-MSG の送り先(プログラム・プロシージャー)を指定する。',
    '%THIS': 'Java のネイティブ・メソッドで、クラスのインスタンスを返す。',
    '%XML': 'XML-INTO・XML-SAX で使う XML 文書とオプションを指定する。',
};

// ---------------------------------------------------------------------------
// 特殊値
// ---------------------------------------------------------------------------
export const SPECIALS = {
    '*ON': 'オン(\'1\')。標識や IND 型に使う。',
    '*OFF': 'オフ(\'0\')。',
    '*BLANK': '空白。', '*BLANKS': '空白。',
    '*ZERO': 'ゼロ。', '*ZEROS': 'ゼロ。',
    '*HIVAL': 'その型で一番大きい値。',
    '*LOVAL': 'その型で一番小さい値。',
    '*NULL': 'ヌル(ポインターが何も指していない)。',
    '*ALL': "*ALL'x' で、全体を x で埋める。",
    '*OMIT': 'パラメーターを省略して渡す(OPTIONS(*OMIT) のとき)。',
    '*N': '名前を付けない(DCL-PI *N・パラメーター名の省略)。',
    '*ENTRY': '*ENTRY PLIST で、このプログラムが受け取るパラメーターを定義する。',
    '*INLR': '最終レコード標識。*ON にしてプログラムを終えると、ファイルを閉じて終了する。',
    '*INRT': '戻り標識。*ON にすると、状態を残したまま呼び出し元に戻る。',
    '*IN': '標識の配列(*IN(01) で 01 番の標識)。',
    '*INOF': 'オーバーフロー標識 OF(印刷のページ末)。',
    '*PSSR': 'プログラムのエラー時に呼ばれるサブルーチンの名前。',
    '*INZSR': 'プログラム開始時に自動で呼ばれる初期化サブルーチンの名前。',
    '*START': 'ファイルの先頭(SETLL *START)。',
    '*END': 'ファイルの最後(SETGT *END)。',
    '*INPUT': 'USAGE: 読み込みに使う。',
    '*OUTPUT': 'USAGE: 書き出し(追加)に使う。',
    '*UPDATE': 'USAGE: 更新に使う(読み込みも含む)。',
    '*DELETE': 'USAGE: 削除に使う(読み込み・更新も含む)。',
    '*YES': 'はい。', '*NO': 'いいえ。',
    '*NEW': '新しい活動化グループで動かす(ACTGRP)。',
    '*CALLER': '呼び出し元と同じ活動化グループで動かす(ACTGRP)。',
    '*SRCSTMT': 'デバッグ時にソースの行番号を使う(OPTION)。',
    '*NODEBUGIO': '入出力命令ごとにデバッグで止まらない(OPTION)。',
    '*NOPASS': 'このパラメーター以降を省略できる(OPTIONS)。',
    '*VARSIZE': '宣言より短い長さの値も渡せる(OPTIONS)。',
    '*STRING': 'ヌル終了文字列へのポインターとして渡せる(OPTIONS)。',
    '*TRIM': '渡すときに前後の空白を取り除く(OPTIONS)。',
    '*NULLIND': 'ヌル標識もいっしょに渡す(OPTIONS)。',
    '*EXACT': '型と長さが完全に一致するものだけ渡せる(OPTIONS)。',
    '*EXT': '外部記述を使う(DISK(*EXT) など)。',
    '*EXTDESC': 'EXTFILE(*EXTDESC): EXTDESC と同じファイルを開く。',
    '*LIBL': 'ライブラリー・リスト。',
    '*CURLIB': '現行ライブラリー。',
    '*PROC': 'PSDS: プロシージャー名。',
    '*STATUS': 'PSDS・INFDS: 状況コード。',
    '*PARMS': 'PSDS: 渡されたパラメーターの数。',
    '*ROUTINE': 'PSDS・INFDS: エラーが起きたルーチン名。',
    '*FILE': 'INFDS: ファイル名。',
    '*RECORD': 'INFDS: レコード様式名。',
    '*OPCODE': 'INFDS: 最後の命令コード。',
    '*SIZE': 'INFDS: 画面のサイズ。',
    '*INP': 'INFDS: 入力の言語。',
    '*OUT': 'INFDS: 出力の言語。',
    '*MODE': 'INFDS: モード。',
    '*DCLCASE': 'EXTPROC(*DCLCASE): 宣言どおりの大文字小文字でプロシージャー名を使う。',
    '*DTAARA': 'データ域。',
    '*LDA': 'ローカル・データ域。',
    '*PDA': 'プログラム初期化パラメーター・データ域。',
    '*LOCK': 'IN・OUT でデータ域をロックする。',
    '*CTDATA': 'コンパイル時データ(DIM(*CTDATA))。',
    '*VAR': '可変の要素数の配列(DIM(*VAR : 最大))。',
    '*AUTO': '自動的に要素数が増える配列(DIM(*AUTO : 最大))。',
    '*NATURAL': '文字数を文字単位で数える(%LEN(x : *NATURAL) など)。',
    '*STDCHARSIZE': '文字数をバイト基準で数える。',
    '*DATE': 'プログラム開始時の日付(8桁)。',
    '*YEAR': 'プログラム開始時の年(4桁)。',
    '*MONTH': 'プログラム開始時の月。',
    '*DAY': 'プログラム開始時の日。',
    '*SYS': 'システムの日付・時刻。',
    '*JOB': 'ジョブの日付。',
    '*JOBRUN': 'ジョブの日付形式。',
    '*ISO': '日付形式 yyyy-mm-dd(時刻は hh.mm.ss)。',
    '*USA': '日付形式 mm/dd/yyyy。',
    '*EUR': '日付形式 dd.mm.yyyy。',
    '*JIS': '日付形式 yyyy-mm-dd(時刻は hh:mm:ss)。',
    '*MDY': '日付形式 mm/dd/yy。',
    '*DMY': '日付形式 dd/mm/yy。',
    '*YMD': '日付形式 yy/mm/dd。',
    '*JUL': '日付形式 yy/ddd(年と通算日)。',
    '*CYMD': '日付形式 cyy/mm/dd(c は世紀)。',
    '*HMS': '時刻形式 hh:mm:ss。',
    '*DAYS': '差や加算の単位: 日。',
    '*MONTHS': '差や加算の単位: 月。',
    '*YEARS': '差や加算の単位: 年。',
    '*HOURS': '差や加算の単位: 時。',
    '*MINUTES': '差や加算の単位: 分。',
    '*SECONDS': '差や加算の単位: 秒。',
    '*MSECONDS': '差や加算の単位: マイクロ秒。',
    '*PLACE': '出力仕様書: 直前のフィールドをもう一度出力する。',
    '*KEY': 'キー・フィールドだけを対象にする。',
    '*NONE': 'なし。',
    '*REQUIRED': '必須。',
    '*CHAR': '文字として扱う(KEYED(*CHAR : 長さ) など)。',
    '*CL': 'CL の呼び出し規約(EXTPROC(*CL : 名前))。',
    '*CWIDEN': 'C の呼び出し規約(EXTPROC(*CWIDEN : 名前))。',
    '*CNOWIDEN': 'C の呼び出し規約(EXTPROC(*CNOWIDEN : 名前))。',
    '*JAVA': 'Java のメソッド・クラス。',
    '*THIS': 'Java の this。',
    '*NOIND': 'PASS(*NOIND): 標識を自分で受け渡す。',
    '*ESCAPE': 'エスケープ・メッセージ(呼び出し元をエラーで終わらせる)。',
    '*INFO': '通知メッセージ。',
    '*DIAG': '診断メッセージ。',
    '*COMP': '完了メッセージ。',
    '*ALLX': "*ALLX'16進' で、全体をその16進値で埋める。",
    '*NEXT': 'OVERLAY(名前 : *NEXT): 前のサブフィールドの次の位置に重ねる。',
    '*FULL': 'ALIGN(*FULL): データ構造の長さも境界に合わせる。',
    '*LIKEDS': 'INZ(*LIKEDS): LIKEDS 元のデータ構造と同じ初期値にする。',
    '*DATA': '%ADDR(可変長フィールド : *DATA): 長さ部分を除いたデータの先頭のアドレス。',
    '*SERIALIZE': 'THREAD(*SERIALIZE): 複数スレッドから同時に実行されないようにする。',
    '*CONCURRENT': 'THREAD(*CONCURRENT): 複数スレッドから同時に実行できる。',
    '*ENDMOD': 'SQL の CLOSQLCSR: モジュールの終了時にカーソルを閉じる。',
    '*ENDACTGRP': 'SQL の CLOSQLCSR: 活動化グループの終了時にカーソルを閉じる。',
    '*XREF': 'OPTION: コンパイル・リストに相互参照を出す。', '*NOXREF': 'OPTION: コンパイル・リストに相互参照を出さない。',
    '*SECLVL': 'OPTION: 第2レベルのメッセージを出す。', '*NOSECLVL': 'OPTION: 第2レベルのメッセージを出さない。',
    '*SHOWCPY': 'OPTION: /COPY の内容をリストに出す。', '*NOSHOWCPY': 'OPTION: /COPY の内容をリストに出さない。',
    '*EXPDDS': 'OPTION: 外部記述の内容をリストに出す。', '*NOEXPDDS': 'OPTION: 外部記述の内容をリストに出さない。',
    '*NOEXT': 'OPTION: 外部記述の内容をリストに出さない。',
    '*SHOWSKP': 'OPTION: 条件コンパイルで飛ばした行もリストに出す。', '*NOSHOWSKP': 'OPTION: 条件コンパイルで飛ばした行をリストに出さない。',
    '*DEBUGIO': 'OPTION: 入出力命令ごとにデバッグで止まる。',
    '*NOSRCSTMT': 'OPTION: デバッグでソースの行番号ではなく文番号を使う。',
    '*UNREF': 'OPTION: 使っていない定義もプログラムに含める。', '*NOUNREF': 'OPTION: 使っていない定義をプログラムに含めない。',
    '*LONGJUL': '日付形式 yyyy/ddd(4桁の年と通算日)。',
    '*CMDY': '日付形式 cmm/dd/yy(c は世紀)。',
    '*CDMY': '日付形式 cdd/mm/yy(c は世紀)。',
};
// 日付・時刻形式の区切りなし版(*ISO0 など): 末尾の 0 は区切り文字なし
for (const fmt of ['*ISO', '*USA', '*EUR', '*JIS', '*MDY', '*DMY', '*YMD', '*JUL', '*CYMD', '*CMDY', '*CDMY', '*LONGJUL', '*HMS']) {
    SPECIALS[fmt + '0'] = SPECIALS[fmt].replace(/。$/, '') + '(区切り文字なし)。';
}

const indicatorHelp = (upper) => {
    let m = upper.match(/^\*IN\(?(\d\d)\)?$/);
    if (m) {
        return `標識 ${m[1]}。*ON / *OFF の値を持つ(01-99 は一般標識)。`;
    }
    m = upper.match(/^\*IN(K[A-NP-Y])$/);
    if (m) {
        return `機能キー標識 ${m[1]}(KA=F1 … KY=F24)。`;
    }
    m = upper.match(/^\*IN(L[1-9])$/);
    if (m) {
        return `制御レベル標識 ${m[1]}。`;
    }
    m = upper.match(/^\*IN(H[1-9])$/);
    if (m) {
        return `停止標識 ${m[1]}。オンのままだとプログラムは異常終了する。`;
    }
    m = upper.match(/^\*IN(U[1-8])$/);
    if (m) {
        return `外部標識 ${m[1]}(ジョブのスイッチ)。`;
    }
    m = upper.match(/^\*IN(O[A-G]|OV)$/);
    if (m) {
        return `オーバーフロー標識 ${m[1]}(印刷のページ末)。`;
    }
    return null;
};

// 単語(接頭辞 % / * を含む、ハイフン付きの命令コードも可)の説明
export const helpForToken = (token) => {
    const upper = token.toUpperCase();
    if (upper.startsWith('%')) {
        return BIFS[upper] ? { title: upper, kind: '組み込み関数', text: BIFS[upper] } : null;
    }
    if (upper.startsWith('*')) {
        const text = SPECIALS[upper] || indicatorHelp(upper);
        return text ? { title: upper, kind: '特殊値', text } : null;
    }
    const base = upper.replace(/\(.*$/, '');
    if (OPCODES[base]) {
        const op = OPCODES[base];
        const ext = upper.match(/\(([A-Z]+)\)/);
        let text = op.desc;
        if (ext) {
            const notes = [...ext[1]].map((c) => EXTENDERS[c] ? `${c}: ${EXTENDERS[c]}` : null).filter(Boolean);
            if (notes.length > 0) {
                text += '\n\n拡張 ' + notes.join('、');
            }
        }
        if (KEYWORDS[base]) {
            // TIME・IN など、キーワード・データ型としての意味もある語
            text = KEYWORDS[base] + '\n\n命令コードとしては: ' + text;
        }
        return { title: base, kind: op.fixed ? '命令コード(固定形式)' : '命令コード', text, syntax: op.syntax };
    }
    if (KEYWORDS[base]) {
        return { title: base, kind: 'キーワード', text: KEYWORDS[base] };
    }
    return null;
};

// ---------------------------------------------------------------------------
// ホバーの組み立て
// ---------------------------------------------------------------------------
// カーソル位置の「命令コード・キーワード・特殊値・組み込み関数」になりうる語
// (ハイフン付きの DCL-S・Z-ADD、拡張付きの CHAIN(E)、接頭辞付きの %FOUND・*INLR・*IN(01) を含む)
const TOKEN_RE = /[%*]?[A-Za-z_#@$][A-Za-z0-9_#@$]*(?:-[A-Za-z]+)*(?:\([A-Za-z0-9]{1,2}\))?/g;
export const tokenAt = (colLine, index) => {
    TOKEN_RE.lastIndex = 0;
    let m;
    while ((m = TOKEN_RE.exec(colLine)) !== null) {
        if (index >= m.index && index < m.index + m[0].length) {
            return { text: m[0], start: m.index + 1, end: m.index + m[0].length + 1 };
        }
    }
    return null;
};

const insideLiteral = (colLine, index) => {
    let inQuote = false;
    for (let i = 0; i < index; i++) {
        if (colLine[i] === "'") {
            inQuote = !inQuote;
        }
    }
    return inQuote;
};

// 外部の定義(DDS のフィールド・ファイル、呼び出し先プログラム)を「参照元のファイル名 : TEXT」の1行にする。
// 複数ある場合は TEXT のある最初の1件だけ(ほかは定義ジャンプで候補として出る)。
// entries は normalRefDef の値({ location: { uri }, s_description, file })
const meaningfulText = (e) => {
    const text = (e.s_description || '').trim();
    return text !== '' && text !== 'undefined' && text !== 'FIleObject' && text !== 'CALL PGM' ? text : '';
};

export const formatExternal = (entries) => {
    if (!entries || entries.length === 0) {
        return null;
    }
    const e = entries.find((x) => meaningfulText(x) !== '') || entries[0];
    const parts = (e.location && e.location.uri ? e.location.uri.path : '').split('/').filter(Boolean);
    const id = e.file || (parts.length >= 3 ? parts[2] : '');
    const text = meaningfulText(e);
    return text !== '' ? `${id} : ${text}` : id;
};

// ホバーの内容(Markdown の配列)と範囲(JS の列)を返す。line は 0 始まり
//   externalLookup(word) → 外部の定義の配列(normalRefDef の値)… DDS・呼び出し先など
export const describeAt = (parsed, line, lineText, jsColumn, externalLookup = () => null) => {
    const info = parsed.infos[line];
    if (!info || info.kind === 'comment' || info.kind === 'data' || info.kind === 'blank') {
        return null;
    }
    const mode = parsed.mode;
    const col = toColumnLine(lineText, mode);
    const ibm = jsToIbmColumn(lineText, jsColumn, mode);
    const contents = [];
    let range = null;

    // 1. 外部の定義(上段に名前、下段に「参照元のファイル名 : TEXT」)。
    //    ソース内で定義した名前は定義ジャンプで見られるので、ホバーでは出さない
    const word = wordAt(lineText, jsColumn, mode);
    let isUserName = false;
    if (word && word.prefix !== '%' && word.prefix !== '*') {
        isUserName = !word.literal && findDefinitions(parsed, word.text).length > 0;
        const ext = formatExternal(externalLookup(word) || []);
        if (ext) {
            contents.push('**' + word.text.replace(/'/g, '') + '**', ext);
            range = { start: word.startColumn, end: word.endColumn };
        }
    }

    // 2. 命令コード・キーワード・組み込み関数・特殊値(自分で定義した名前と同じ綴りなら出さない)
    if (contents.length === 0 && !isUserName && !insideLiteral(col, ibm - 1)) {
        const token = tokenAt(col, ibm - 1);
        if (token) {
            let help = helpForToken(stripFill(token.text));
            if (!help && token.text.includes('-') && word) {
                help = helpForToken(word.text);
            }
            if (help) {
                contents.push('**' + help.title + '** : ' + help.kind + '\n\n' + help.text + (help.syntax ? '\n\n`' + help.syntax + '`' : ''));
                range = { start: ibmToJsColumn(lineText, token.start, mode), end: ibmToJsColumn(lineText, token.end, mode) };
            }
        }
    }

    // 3. 固定形式の記号の欄(F・D・P・I・O の分かりにくい欄だけ。1行で出す)
    if (info.kind === 'fixed') {
        const field = fixedFieldAt(info, ibm);
        if (field) {
            contents.push(`**${field.name}** \`${field.value}\` : ${field.text}`);
            range = range || { start: ibmToJsColumn(lineText, field.from, mode), end: ibmToJsColumn(lineText, field.to + 1, mode) };
        }
    }

    if (contents.length === 0) {
        return null;
    }
    return { contents, range };
};
