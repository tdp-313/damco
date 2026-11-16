// CL の解析。変数(DCL)・ファイル(DCLF)・呼び出し(CALL)・ラベル・サブルーチンと、その場所を取り出す。
// Web Worker(参照先の検索)と VS Code 拡張機能からも使うので monaco / DOM には依存しない。
//
// 位置は元の行のまま(行は 0 始まり、start / end は行の中の位置で end はその文字の次)。
// 注記と継続(行末の + / -)は、取り除かずに読み飛ばすので位置はずれない。

const NAME = "[A-Za-z#@$_¥][A-Za-z0-9#@$_¥.]*";
const TOKEN = new RegExp("&" + NAME + "|[*%]?" + NAME + "|\\d+(?:\\.\\d+)?|[()/:]", 'g');

const isName = (token) => token !== undefined && /^[A-Z#@$_¥]/.test(token.upper);

// 1 行を「注記」「文字列」「それ以外」に分ける。state は行をまたぐ状態(注記の中か・文字列の中か)
//   戻り値: { code, inner, continued }
//     code:  注記と文字列の中身を空白にした行(文字列は ' だけ残す)
//     inner: 文字列の中身だけを残した行(SBMJOB の RQSDTA('CALL PGM(X)') などを読むため)
const splitLine = (line, state) => {
    const code = [];
    const inner = [];
    let lastCode = -1; // 注記の外にある、最後の空白でない文字
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (state.comment) {
            code.push(' ');
            inner.push(' ');
            if (c === '*' && line[i + 1] === '/') {
                code.push(' ');
                inner.push(' ');
                i++;
                state.comment = false;
            }
            continue;
        }
        if (state.string) {
            if (c === "'") {
                if (line[i + 1] === "'") { // '' は文字列の中の '
                    code.push(' ', ' ');
                    inner.push(' ', ' ');
                    i++;
                    lastCode = i;
                    continue;
                }
                state.string = false;
                code.push("'");
                inner.push(' ');
            } else {
                code.push(' ');
                inner.push(c);
            }
            if (c !== ' ' && c !== '\t') {
                lastCode = i;
            }
            continue;
        }
        if (c === '/' && line[i + 1] === '*') {
            // /* は、前か後ろが空白(または行の端)のときだけ注記の始まり。LIB/*ALL は注記ではない
            const before = i === 0 || /\s/.test(line[i - 1]);
            const after = i + 2 >= line.length || /\s/.test(line[i + 2]);
            if (before || after) {
                state.comment = true;
                code.push(' ', ' ');
                inner.push(' ', ' ');
                i++;
                continue;
            }
        }
        if (c === "'") {
            state.string = true;
        }
        code.push(c);
        inner.push(' ');
        if (c !== ' ' && c !== '\t') {
            lastCode = i;
        }
    }
    // 継続: 注記を除いた行の最後が + か -
    const last = lastCode >= 0 ? line[lastCode] : '';
    const continued = last === '+' || last === '-';
    if (continued) {
        code[lastCode] = ' ';
        inner[lastCode] = ' ';
    } else {
        state.string = false; // 閉じていない文字列は行末で終わりにする
    }
    return { code: code.join(''), inner: inner.join(''), continued };
};

const tokenize = (text, line, inString) => {
    const tokens = [];
    TOKEN.lastIndex = 0;
    let m;
    while ((m = TOKEN.exec(text)) !== null) {
        tokens.push({ text: m[0], upper: m[0].toUpperCase(), line, start: m.index, end: m.index + m[0].length, inString, role: null });
    }
    return tokens;
};

// tokens[index] から 1 つのパラメーターの値を読む。値は「( … )」か、LIB/NAME のようにつながった 1 語
//   戻り値: { value: 中のトークン, next: 次の位置 }
const readValue = (tokens, index) => {
    if (index >= tokens.length) {
        return { value: [], next: index };
    }
    if (tokens[index].text === '(') {
        let depth = 0;
        let i = index;
        for (; i < tokens.length; i++) {
            if (tokens[i].text === '(') {
                depth++;
            } else if (tokens[i].text === ')') {
                depth--;
                if (depth === 0) {
                    break;
                }
            }
        }
        return { value: tokens.slice(index + 1, i), next: Math.min(i + 1, tokens.length) };
    }
    let i = index + 1;
    while (i + 1 < tokens.length && tokens[i].text === '/' && tokens[i].start === tokens[i - 1].end && tokens[i + 1].start === tokens[i].end) {
        i += 2;
    }
    return { value: tokens.slice(index, i), next: i };
};

// コマンドのパラメーター。キーワード付き(VAR(&A))と位置指定(&A)のどちらも読む。閉じ括弧か文の終わりまで
//   戻り値: { named: Map(キーワード → 値), positional: [値], next }
const readParams = (tokens, index) => {
    const named = new Map();
    const positional = [];
    let i = index;
    while (i < tokens.length && tokens[i].text !== ')') {
        const token = tokens[i];
        if (isName(token) && tokens[i + 1] !== undefined && tokens[i + 1].text === '(' && tokens[i + 1].start === token.end) {
            const { value, next } = readValue(tokens, i + 1);
            token.role = 'keyword';
            named.set(token.upper, value);
            i = next;
        } else {
            const { value, next } = readValue(tokens, i);
            positional.push(value);
            i = next;
        }
    }
    return { named, positional, next: i };
};

// オブジェクト名(LIB/NAME の NAME)。変数(&PGM)・特殊値(*LIBL)だけのときは null
const objectToken = (value) => {
    if (value.length === 0) {
        return null;
    }
    const token = value[value.length - 1];
    return isName(token) ? token : null;
};

const param = (params, keyword, position) => (params.named.has(keyword) ? params.named.get(keyword) : params.positional[position] || []);

const valueText = (value) => value.map((t) => t.text).join(' ');

// 中にコマンドを書くパラメーター(IF … THEN(CALL …)、MONMSG … EXEC(GOTO …) など)
const COMMAND_KEYWORDS = ['THEN', 'CMD', 'EXEC'];
const push = (map, key, value) => {
    if (map.has(key)) {
        map.get(key).push(value);
    } else {
        map.set(key, [value]);
    }
};

export const parseCl = (lines) => {
    const parsed = {
        tokens: [], // 行ごとのトークン(文字列の中も含む)
        variables: new Map(), // &NAME → { name, type, len, line, endLine }
        variableRefs: new Map(), // &NAME → [トークン]
        files: [], // { name, opnid, token, line, endLine }
        programs: [], // { name, token }(CALL の出てくる順)
        labels: new Map(), // NAME → トークン(定義)
        labelRefs: new Map(), // NAME → [トークン](定義と GOTO)
        subroutines: new Map(), // NAME → { token, line, endLine }
        subroutineRefs: new Map(), // NAME → [トークン](SUBR と CALLSUBR)
    };
    const state = { comment: false, string: false };
    let statement = null; // { code: 文字列の外のトークン, all: 文字列の中も含むトークン, line }

    // CALL PGM(LIB/NAME) / CALL LIB/NAME。keywordOnly: PGM( … ) の形だけを読む
    const callAt = (tokens, index, keywordOnly = false) => {
        let i = index + 1;
        if (tokens[i] !== undefined && tokens[i].upper === 'PGM' && tokens[i + 1] !== undefined && tokens[i + 1].text === '(') {
            tokens[i].role = 'keyword';
            i++;
        } else if (keywordOnly) {
            return;
        }
        const name = objectToken(readValue(tokens, i).value);
        if (name !== null && name.upper !== 'PGM') {
            name.role = 'program';
            parsed.programs.push({ name: name.upper, token: name });
        }
    };

    const finish = (endLine) => {
        const { code, all } = statement;
        const line = statement.line;
        statement = null;
        let start = 0;
        // ラベル(NAME:)
        if (isName(code[0]) && code[1] !== undefined && code[1].text === ':' && code[1].start === code[0].end) {
            code[0].role = 'label';
            if (!parsed.labels.has(code[0].upper)) {
                parsed.labels.set(code[0].upper, code[0]);
            }
            push(parsed.labelRefs, code[0].upper, code[0]);
            start = 2;
        }
        const command = code[start];
        if (isName(command)) {
            command.role = 'command';
            const params = readParams(code, start + 1);
            if (command.upper === 'DCL') {
                const variable = param(params, 'VAR', 0)[0];
                if (variable !== undefined && variable.upper.startsWith('&') && !parsed.variables.has(variable.upper)) {
                    variable.role = 'declaration';
                    parsed.variables.set(variable.upper, {
                        name: variable.upper,
                        type: valueText(param(params, 'TYPE', 1)).toUpperCase(),
                        len: valueText(param(params, 'LEN', 2)),
                        line,
                        endLine,
                    });
                }
            } else if (command.upper === 'DCLF') {
                const name = objectToken(param(params, 'FILE', 0));
                if (name !== null && name.upper !== 'FILE') {
                    name.role = 'file';
                    const opnid = param(params, 'OPNID', 2)[0];
                    parsed.files.push({ name: name.upper, opnid: isName(opnid) ? opnid.upper : '', token: name, line, endLine });
                }
            } else if (command.upper === 'SUBR') {
                const name = param(params, 'SUBR', 0)[0];
                if (isName(name)) {
                    name.role = 'subroutine';
                    if (!parsed.subroutines.has(name.upper)) {
                        parsed.subroutines.set(name.upper, { token: name, line, endLine });
                    }
                    push(parsed.subroutineRefs, name.upper, name);
                }
            }
        }
        // 入れ子のコマンド。文の先頭、THEN( CMD( EXEC( の中、ELSE の次、位置指定の条件「( … )」の次
        for (let i = start; i < code.length; i++) {
            const token = code[i];
            if (!isName(token) || token.role === 'keyword') {
                continue;
            }
            const before = code[i - 1];
            const opener = before !== undefined && before.text === '(' && code[i - 2] !== undefined && COMMAND_KEYWORDS.includes(code[i - 2].upper);
            // 「( … )」や ELSE の次の語は、キーワード(名前のすぐ後ろが括弧)でなければコマンド
            const next = code[i + 1];
            const isKeyword = next !== undefined && next.text === '(' && next.start === token.end;
            const follows = before !== undefined && (before.text === ')' || ['ELSE', 'OTHERWISE'].includes(before.upper)) && !isKeyword;
            if (i !== start && !opener && !follows) {
                continue;
            }
            if (token.role === null) {
                token.role = 'command';
            }
            if (token.upper === 'CALL') {
                callAt(code, i);
            } else if (token.upper === 'GOTO' || token.upper === 'CALLSUBR') {
                const keyword = token.upper === 'GOTO' ? 'CMDLBL' : 'SUBR';
                const name = param(readParams(code, i + 1), keyword, 0)[0];
                if (isName(name)) {
                    name.role = token.upper === 'GOTO' ? 'label' : 'subroutine';
                    push(token.upper === 'GOTO' ? parsed.labelRefs : parsed.subroutineRefs, name.upper, name);
                }
            }
        }
        // 文字列の中の CALL(SBMJOB の RQSDTA('CALL PGM(X)')、QCMDEXC に渡すコマンドなど)。
        // メッセージの文('CALL FAILED' など)を拾わないよう、PGM( … ) の形だけを読む
        for (let i = 0; i < all.length; i++) {
            if (all[i].inString && all[i].upper === 'CALL') {
                const inside = [];
                for (let p = i; p < all.length && all[p].inString && all[p].line === all[i].line; p++) {
                    inside.push(all[p]);
                }
                callAt(inside, 0, true);
            }
        }
        // 変数
        for (const token of code) {
            if (token.upper.startsWith('&')) {
                push(parsed.variableRefs, token.upper, token);
            }
        }
    };

    for (let i = 0; i < lines.length; i++) {
        // Web 版は \n だけで行に分けるので、CRLF のソースは行末に \r が残る。継続(+ / -)の判定の前に外す
        const { code, inner, continued } = splitLine(lines[i].replace(/\r$/, ''), state);
        const codeTokens = tokenize(code, i, false);
        const lineTokens = [...codeTokens, ...tokenize(inner, i, true)].sort((a, b) => a.start - b.start);
        parsed.tokens.push(lineTokens);
        if (statement === null) {
            if (lineTokens.length === 0 && !continued) {
                continue;
            }
            statement = { code: [], all: [], line: i };
        }
        statement.code.push(...codeTokens);
        statement.all.push(...lineTokens);
        if (!continued) {
            finish(i);
        }
    }
    if (statement !== null) {
        finish(lines.length - 1);
    }
    return parsed;
};

// カーソルの位置のトークン(column は 1 始まり。語の直後も含める)
export const tokenAt = (parsed, line, column) => {
    const tokens = parsed.tokens[line] || [];
    const index = column - 1;
    return tokens.find((t) => !/^[()/:]$/.test(t.text) && index >= t.start && index <= t.end) || null;
};

// DCLF のファイルのフィールドを表す変数か。&FIELD、OPNID があれば &OPNID_FIELD。
// 戻り値: 外部の定義(DDS)を引く名前の候補
export const fileFieldNames = (parsed, variable) => {
    const name = variable.replace(/^&/, '');
    const names = [];
    for (const file of parsed.files) {
        if (file.opnid === '') {
            names.push(name);
        } else if (name.startsWith(file.opnid + '_')) {
            names.push(name.substring(file.opnid.length + 1));
        }
    }
    return [...new Set(names)];
};
