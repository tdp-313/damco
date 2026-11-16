// CL のホバー説明(初心者向け)。よく使うコマンド・演算子・組み込み関数・変数の型の辞書。
// monaco / DOM には依存しない(テストから使うため)。

// コマンド。desc: 説明、syntax: 書き方(あれば)
export const CL_COMMANDS = {
    // プログラムの枠・宣言
    PGM: { desc: 'プログラムの始まり。PARM に、呼び出し元から受け取る変数を書く。', syntax: 'PGM PARM(&変数 …)' },
    ENDPGM: { desc: 'プログラムの終わり。' },
    DCL: { desc: '変数を宣言する。変数名は & で始める。', syntax: 'DCL VAR(&変数) TYPE(*CHAR) LEN(長さ) VALUE(初期値)' },
    DCLF: { desc: 'ファイル(表示装置ファイル・データベースファイル)を宣言する。ファイルのフィールドが &フィールド名 の変数として使えるようになる。', syntax: 'DCLF FILE(ファイル) OPNID(識別名)' },
    DCLPRCOPT: { desc: 'このプログラムのコンパイルの指定(既定の活動化グループなど)を書く。' },
    COPYRIGHT: { desc: 'プログラムに著作権の表示を入れる。' },
    INCLUDE: { desc: 'ほかのソースメンバーを、コンパイルのときにここに取り込む。', syntax: 'INCLUDE SRCMBR(メンバー) SRCFILE(ソースファイル)' },
    // 制御
    CHGVAR: { desc: '変数に値を入れる。VALUE には式(計算・連結・組み込み関数)を書ける。', syntax: 'CHGVAR VAR(&変数) VALUE(値)' },
    IF: { desc: '条件が成り立つとき、THEN のコマンドを実行する。複数のコマンドは DO 〜 ENDDO で囲む。', syntax: 'IF COND(条件) THEN(コマンド)' },
    ELSE: { desc: '直前の IF の条件が成り立たないとき、コマンドを実行する。', syntax: 'ELSE CMD(コマンド)' },
    DO: { desc: 'ENDDO までのコマンドをひとまとまりにする(IF・ELSE・MONMSG の中で使う)。' },
    ENDDO: { desc: 'DO・DOWHILE・DOUNTIL・DOFOR のまとまりの終わり。' },
    DOWHILE: { desc: '条件が成り立つ間、ENDDO までを繰り返す(条件は先に調べる)。', syntax: 'DOWHILE COND(条件)' },
    DOUNTIL: { desc: '条件が成り立つまで、ENDDO までを繰り返す(条件は後で調べるので、1 回は実行する)。', syntax: 'DOUNTIL COND(条件)' },
    DOFOR: { desc: '変数を FROM から TO まで変えながら、ENDDO までを繰り返す。', syntax: 'DOFOR VAR(&変数) FROM(初めの値) TO(終わりの値) BY(増分)' },
    LEAVE: { desc: '繰り返し(DOWHILE・DOUNTIL・DOFOR)を抜ける。' },
    ITERATE: { desc: '繰り返しの残りを飛ばして、次の回に進む。' },
    SELECT: { desc: 'WHEN の条件を上から調べ、最初に成り立ったものだけを実行する。ENDSELECT まで。' },
    WHEN: { desc: 'SELECT の中の条件。成り立てば THEN のコマンドを実行し、ENDSELECT の次へ進む。', syntax: 'WHEN COND(条件) THEN(コマンド)' },
    OTHERWISE: { desc: 'SELECT の中で、どの WHEN も成り立たなかったときに実行する。', syntax: 'OTHERWISE CMD(コマンド)' },
    ENDSELECT: { desc: 'SELECT の終わり。' },
    GOTO: { desc: 'ラベル(名前:)の行へ移る。', syntax: 'GOTO CMDLBL(ラベル)' },
    SUBR: { desc: 'サブルーチンの始まり。ENDSUBR まで。プログラムの最後(ENDPGM の前)にまとめて書く。', syntax: 'SUBR SUBR(名前)' },
    ENDSUBR: { desc: 'サブルーチンの終わり。RTNVAL で、呼び出し元に返す値を指定できる。' },
    CALLSUBR: { desc: 'サブルーチンを呼び出す。', syntax: 'CALLSUBR SUBR(名前) RTNVAL(&変数)' },
    RTNSUBR: { desc: 'サブルーチンを途中で終えて、呼び出し元に戻る。' },
    RETURN: { desc: 'プログラムを終えて、呼び出し元に戻る。' },
    MONMSG: { desc: '直前のコマンド(プログラムの先頭に書いた場合は全部のコマンド)のエラーメッセージを受け止める。EXEC に、そのとき実行するコマンドを書く。EXEC がなければエラーを無視して続ける。', syntax: 'MONMSG MSGID(CPF0000) EXEC(コマンド)' },
    // 呼び出し・ジョブ
    CALL: { desc: 'プログラムを呼び出す。PARM に、渡す変数や値を書く。', syntax: 'CALL PGM(ライブラリ/プログラム) PARM(&変数 …)' },
    CALLPRC: { desc: '同じプログラムに結合されているプロシージャーを呼び出す(ILE)。', syntax: 'CALLPRC PRC(プロシージャー) PARM(…) RTNVAL(&変数)' },
    TFRCTL: { desc: 'ほかのプログラムに制御を移す。このプログラムには戻らない。', syntax: 'TFRCTL PGM(プログラム) PARM(…)' },
    SBMJOB: { desc: 'コマンドをバッチジョブとして投入する。投入したジョブの終わりは待たない。', syntax: 'SBMJOB CMD(コマンド) JOB(ジョブ名) JOBQ(ジョブ待ち行列)' },
    DLYJOB: { desc: '指定した秒数、または時刻までジョブを止める。', syntax: 'DLYJOB DLY(秒)' },
    RTVJOBA: { desc: 'ジョブの情報(ジョブ名・ユーザー・日付・バッチか対話かなど)を変数に取り出す。', syntax: 'RTVJOBA JOB(&変数) USER(&変数) TYPE(&変数)' },
    CHGJOB: { desc: 'ジョブの属性(日付・出力待ち行列・優先順位など)を変える。' },
    RTVSYSVAL: { desc: 'システム値(QDATE・QTIME など)を変数に取り出す。', syntax: 'RTVSYSVAL SYSVAL(QDATE) RTNVAR(&変数)' },
    RTVUSRPRF: { desc: 'ユーザー・プロファイルの情報を変数に取り出す。' },
    SIGNOFF: { desc: 'サインオフする(対話ジョブを終える)。' },
    // ライブラリリスト・オブジェクト
    ADDLIBLE: { desc: 'ライブラリリストにライブラリを足す。', syntax: 'ADDLIBLE LIB(ライブラリ) POSITION(*FIRST)' },
    RMVLIBLE: { desc: 'ライブラリリストからライブラリを外す。', syntax: 'RMVLIBLE LIB(ライブラリ)' },
    CHGLIBL: { desc: 'ライブラリリストのユーザー部分を、指定したライブラリに入れ替える。' },
    CHGCURLIB: { desc: '現行ライブラリを変える。' },
    CHKOBJ: { desc: 'オブジェクトがあるか・権限があるかを調べる。なければエラーメッセージ(CPF9801 など)が出るので、MONMSG で受け止める。', syntax: 'CHKOBJ OBJ(ライブラリ/名前) OBJTYPE(*FILE)' },
    CRTDUPOBJ: { desc: 'オブジェクトの複製を作る。', syntax: 'CRTDUPOBJ OBJ(名前) FROMLIB(元) OBJTYPE(*FILE) TOLIB(先)' },
    DLTOBJ: { desc: 'オブジェクトを消す。' },
    DLTF: { desc: 'ファイルを消す。', syntax: 'DLTF FILE(ライブラリ/ファイル)' },
    ALCOBJ: { desc: 'オブジェクトをロックする(ほかのジョブに使わせない)。', syntax: 'ALCOBJ OBJ((名前 *FILE *EXCL)) WAIT(秒)' },
    DLCOBJ: { desc: 'ALCOBJ でかけたロックを外す。' },
    RTVOBJD: { desc: 'オブジェクトの情報(実際のライブラリ・説明・作成日など)を変数に取り出す。' },
    RTVMBRD: { desc: 'ファイルのメンバーの情報(レコード数・更新日など)を変数に取り出す。', syntax: 'RTVMBRD FILE(ファイル) NBRCURRCD(&変数)' },
    // ファイル
    OVRDBF: { desc: 'プログラムが開くデータベースファイルを、別のファイル・メンバーに置き換える。DLTOVR するか、この呼び出しレベルが終わるまで有効。', syntax: 'OVRDBF FILE(プログラムでの名前) TOFILE(ライブラリ/実際のファイル) MBR(メンバー)' },
    OVRPRTF: { desc: '印刷装置ファイルの指定(出力待ち行列・部数・用紙など)を置き換える。', syntax: 'OVRPRTF FILE(ファイル) OUTQ(出力待ち行列) COPIES(部数)' },
    OVRDSPF: { desc: '表示装置ファイルを置き換える。' },
    DLTOVR: { desc: 'OVRDBF などの置き換えを取り消す。', syntax: 'DLTOVR FILE(ファイル)' },
    OPNQRYF: { desc: 'データベースファイルを、条件(QRYSLT)と並び順(KEYFLD)を指定して開く。後のプログラムが、その結果を順に読む(OVRDBF の SHARE(*YES) と組で使う)。', syntax: 'OPNQRYF FILE((ファイル)) QRYSLT(\'条件\') KEYFLD((フィールド))' },
    OPNDBF: { desc: 'データベースファイルを開く。' },
    CLOF: { desc: 'OPNQRYF・OPNDBF で開いたファイルを閉じる。', syntax: 'CLOF OPNID(ファイル)' },
    POSDBF: { desc: '開いているデータベースファイルの読む位置を、先頭または末尾にする。' },
    CLRPFM: { desc: '物理ファイルのメンバーのレコードを全部消す。', syntax: 'CLRPFM FILE(ライブラリ/ファイル)' },
    RGZPFM: { desc: '物理ファイルのメンバーを再編成する(削除済みレコードを詰める)。' },
    CPYF: { desc: 'ファイルのレコードを別のファイルに複写する。', syntax: 'CPYF FROMFILE(元) TOFILE(先) MBROPT(*REPLACE) CRTFILE(*YES)' },
    ADDPFM: { desc: '物理ファイルにメンバーを足す。' },
    RMVM: { desc: 'ファイルからメンバーを消す。' },
    RUNQRY: { desc: 'Query/400 の照会を実行する。' },
    RUNSQLSTM: { desc: 'ソースメンバーに書いた SQL 文を実行する。' },
    RUNSQL: { desc: 'SQL 文を 1 つ実行する。', syntax: 'RUNSQL SQL(\'SQL 文\') COMMIT(*NONE)' },
    STRCMTCTL: { desc: 'コミットメント制御を始める(COMMIT・ROLLBACK が使えるようになる)。' },
    ENDCMTCTL: { desc: 'コミットメント制御を終える。' },
    COMMIT: { desc: 'ここまでのデータベースの変更を確定する。' },
    ROLLBACK: { desc: '確定していないデータベースの変更を取り消す。' },
    // DCLF のファイルの読み書き
    RCVF: { desc: 'DCLF のファイルからレコードを 1 件読む(表示装置ファイルなら、入力を待つ)。読んだ値は &フィールド名 の変数に入る。データベースファイルの終わりではメッセージ CPF0864 が出る。', syntax: 'RCVF RCDFMT(レコード様式)' },
    SNDF: { desc: 'DCLF の表示装置ファイルに、レコード様式を表示する(入力は待たない)。', syntax: 'SNDF RCDFMT(レコード様式)' },
    SNDRCVF: { desc: 'DCLF の表示装置ファイルに画面を表示し、入力を待つ。', syntax: 'SNDRCVF RCDFMT(レコード様式)' },
    ENDRCV: { desc: '待っている入力の要求を取り消す。' },
    CLOSE: { desc: 'DCLF のデータベースファイルを閉じる。次の RCVF で、先頭から読み直す。' },
    // メッセージ
    SNDPGMMSG: { desc: 'プログラムのメッセージ待ち行列にメッセージを送る(呼び出し元への完了・エラーの通知、画面の下の行への表示など)。', syntax: 'SNDPGMMSG MSGID(CPF9898) MSGF(QCPFMSG) MSGDTA(\'文\') MSGTYPE(*ESCAPE)' },
    RCVMSG: { desc: 'メッセージ待ち行列からメッセージを受け取り、内容を変数に取り出す。', syntax: 'RCVMSG MSGTYPE(*LAST) MSG(&変数) MSGID(&変数)' },
    RMVMSG: { desc: 'メッセージ待ち行列からメッセージを消す。' },
    SNDMSG: { desc: 'ユーザー・ワークステーションにメッセージを送る。' },
    SNDUSRMSG: { desc: 'メッセージを送り、返事を変数に受け取る。', syntax: 'SNDUSRMSG MSG(\'文\') VALUES(Y N) MSGRPY(&変数)' },
    SNDBRKMSG: { desc: 'ワークステーションに、割り込みメッセージを送る。' },
    RTVMSG: { desc: 'メッセージファイルからメッセージの文を変数に取り出す。' },
    // データ域・データ待ち行列
    RTVDTAARA: { desc: 'データ域の値を変数に取り出す。', syntax: 'RTVDTAARA DTAARA(データ域 (開始位置 長さ)) RTNVAR(&変数)' },
    CHGDTAARA: { desc: 'データ域の値を変える。', syntax: 'CHGDTAARA DTAARA(データ域 (開始位置 長さ)) VALUE(値)' },
    CRTDTAARA: { desc: 'データ域を作る。' },
    DLTDTAARA: { desc: 'データ域を消す。' },
    // その他
    CVTDAT: { desc: '日付の形式を変える(*YMD → *YYMD など)。', syntax: 'CVTDAT DATE(&元) TOVAR(&先) FROMFMT(*JOB) TOFMT(*YYMD) TOSEP(*NONE)' },
    DMPCLPGM: { desc: 'この CL プログラムの変数とメッセージをスプールに出す(調査用)。' },
    STRSEU: { desc: 'ソースを編集する SEU を起動する。' },
    WRKSPLF: { desc: 'スプールファイルの一覧を表示する。' },
    DSPJOBLOG: { desc: 'ジョブログを表示・印刷する。' },
    CPYSPLF: { desc: 'スプールファイルの内容を物理ファイルに複写する。' },
    DLTSPLF: { desc: 'スプールファイルを消す。' },
    STRPCCMD: { desc: 'パソコンのコマンドを実行する(エミュレーターで接続しているとき)。' },
    SAVOBJ: { desc: 'オブジェクトを保管する。' },
    RSTOBJ: { desc: '保管したオブジェクトを復元する。' },
    CRTPF: { desc: '物理ファイルを作る。' },
    CRTLF: { desc: '論理ファイルを作る。' },
};

// 式の中の演算子
export const CL_OPERATORS = {
    '*EQ': '等しい(=)。', '*NE': '等しくない(¬=)。', '*GT': 'より大きい(>)。', '*LT': 'より小さい(<)。',
    '*GE': '以上(>=)。', '*LE': '以下(<=)。', '*NG': 'より大きくない(以下)。', '*NL': 'より小さくない(以上)。',
    '*AND': '両方が成り立つ(&)。', '*OR': 'どちらかが成り立つ(|)。', '*NOT': '成り立たない(¬)。',
    '*CAT': '文字列をそのままつなぐ(||)。', '*BCAT': '前の文字列の後ろの空白を除き、空白 1 つをはさんでつなぐ(|>)。',
    '*TCAT': '前の文字列の後ろの空白を除いてつなぐ(|<)。',
};

// 変数の型(DCL の TYPE)
export const CL_TYPES = {
    '*CHAR': '文字。', '*DEC': 'パック10進数。LEN は(桁数 小数の桁数)。', '*LGL': '論理値(\'1\' か \'0\')。',
    '*INT': '符号付き整数(LEN は 2・4・8 バイト)。', '*UINT': '符号なし整数(LEN は 2・4・8 バイト)。', '*PTR': 'ポインター。',
};

// 組み込み関数
export const CL_FUNCTIONS = {
    '%SST': { desc: '文字列の一部(開始位置から長さ分)。CHGVAR の VAR にも書ける。', syntax: '%SST(&変数 開始位置 長さ)' },
    '%SUBSTRING': { desc: '文字列の一部(開始位置から長さ分)。%SST と同じ。', syntax: '%SUBSTRING(&変数 開始位置 長さ)' },
    '%BIN': { desc: '文字変数の中身を 2 進数の整数として扱う(2 バイトか 4 バイト)。', syntax: '%BIN(&変数 開始位置 長さ)' },
    '%BINARY': { desc: '文字変数の中身を 2 進数の整数として扱う。%BIN と同じ。', syntax: '%BINARY(&変数 開始位置 長さ)' },
    '%SWITCH': { desc: 'ジョブ・スイッチ(8 個)の状態を調べる。1 = オン、0 = オフ、X = 調べない。', syntax: '%SWITCH(1XXXXXXX)' },
    '%TRIM': { desc: '前と後ろの空白(または指定した文字)を除く。', syntax: '%TRIM(&変数)' },
    '%TRIML': { desc: '前の空白(または指定した文字)を除く。', syntax: '%TRIML(&変数)' },
    '%TRIMR': { desc: '後ろの空白(または指定した文字)を除く。', syntax: '%TRIMR(&変数)' },
    '%LEN': { desc: '変数の長さ。', syntax: '%LEN(&変数)' },
    '%SIZE': { desc: '変数が占めるバイト数。', syntax: '%SIZE(&変数)' },
    '%CHECK': { desc: '文字列の中で、比べる文字に含まれない最初の文字の位置(なければ 0)。', syntax: '%CHECK(比べる文字 &変数)' },
    '%CHECKR': { desc: '%CHECK を後ろから調べる。', syntax: '%CHECKR(比べる文字 &変数)' },
    '%SCAN': { desc: '文字列の中で、探す文字列が最初に出てくる位置(なければ 0)。', syntax: '%SCAN(探す文字列 &変数)' },
    '%UPPER': { desc: '大文字に変える。', syntax: '%UPPER(&変数)' },
    '%LOWER': { desc: '小文字に変える。', syntax: '%LOWER(&変数)' },
    '%CHAR': { desc: '数値・論理値を文字に変える。', syntax: '%CHAR(&変数)' },
    '%DEC': { desc: '文字・整数をパック10進数に変える。', syntax: '%DEC(&変数 桁数 小数の桁数)' },
    '%INT': { desc: '文字・10進数を整数に変える(小数は切り捨て)。', syntax: '%INT(&変数)' },
    '%UINT': { desc: '文字・10進数を符号なし整数に変える。', syntax: '%UINT(&変数)' },
    '%ADDR': { desc: '変数のアドレス(ポインター)。', syntax: '%ADDR(&変数)' },
    '%ADDRESS': { desc: '変数のアドレス(ポインター)。%ADDR と同じ。', syntax: '%ADDRESS(&変数)' },
    '%OFS': { desc: 'ポインターのオフセットを取り出す・変える。', syntax: '%OFS(&ポインター)' },
    '%OFFSET': { desc: 'ポインターのオフセットを取り出す・変える。%OFS と同じ。', syntax: '%OFFSET(&ポインター)' },
    '%PARMS': { desc: 'このプログラムに渡されたパラメーターの数。', syntax: '%PARMS()' },
};

const format = (title, kind, text, syntax) => '**' + title + '** : ' + kind + '\n\n' + text + (syntax ? '\n\n`' + syntax + '`' : '');

// コマンド・演算子・型・組み込み関数の説明(Markdown)。なければ null
//   role: clParse.js のトークンの役割('command' など)
export const clHelpFor = (upper, role) => {
    if (upper.startsWith('%')) {
        const help = CL_FUNCTIONS[upper];
        return help ? format(upper, '組み込み関数', help.desc, help.syntax) : null;
    }
    if (upper.startsWith('*')) {
        if (CL_OPERATORS[upper]) {
            return format(upper, '演算子', CL_OPERATORS[upper]);
        }
        return CL_TYPES[upper] ? format(upper, '変数の型', CL_TYPES[upper]) : null;
    }
    if (role === 'command' && CL_COMMANDS[upper]) {
        const help = CL_COMMANDS[upper];
        return format(upper, 'コマンド', help.desc, help.syntax);
    }
    return null;
};
