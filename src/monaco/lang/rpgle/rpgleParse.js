// RPGLE(ILE RPG)ソースの解析。固定形式・/FREE・**FREE を同じ結果形式で返す。
// 桁位置は IBM i 7.5 ILE RPG 解説書に従う:
//   F: 名前 7-16 / ファイルタイプ 17 / 追加 20 / 装置 36-42 / キーワード 44-80
//   D: 名前 7-21 / 定義タイプ 24-25 / キーワード 44-80(長い名前は ... で継続)
//   P: 名前 7-21 / 開始・終了 24 / キーワード 44-80
//   C: 演算項目1 12-25 / 命令コード 26-35 / 演算項目2 36-49 / 結果 50-63 / 長さ 64-68
//      拡張演算項目2 36-80(EVAL, IF, CALLP など)
//   I: フィールド名 49-62
// monaco / DOM には依存しない(Worker とテストから使うため)。
import { detectDbcsMode, cut, toColumnLine, jsToIbmColumn, ibmToJsColumn, FILL } from "../column.js";
import { scanLines, freeStatements } from "./rpgleLine.js";

const NAME_CHARS = /[A-Za-z0-9_#@$]/;
const NAME_START = /[A-Za-z_#@$]/;
const NAME_RE = /^[A-Za-z_#@$][A-Za-z0-9_#@$]*$/;
const TOKEN_RE = /[A-Za-z_#@$][A-Za-z0-9_#@$]*/g;

// 拡張演算項目2(36-80桁)を使う命令コード
export const EXT_F2_OPCODES = new Set([
    'CALLP', 'DATA-GEN', 'DATA-INTO', 'DOU', 'DOW', 'ELSEIF', 'EVAL', 'EVAL-CORR', 'EVALR',
    'FOR', 'FOR-EACH', 'IF', 'ON-ERROR', 'ON-EXCP', 'ON-EXIT', 'RETURN', 'SND-MSG', 'SORTA',
    'WHEN', 'XML-INTO', 'XML-SAX',
]);

export const DEF_KIND_LABEL = {
    FILE: 'ファイル',
    S: 'スタンドアロン・フィールド',
    C: '名前付き定数',
    DS: 'データ構造',
    SUBF: 'サブフィールド',
    PR: 'プロトタイプ',
    PARM: 'パラメーター',
    PROC: 'プロシージャー',
    SR: 'サブルーチン',
    FIELD: 'フィールド',
    KLIST: 'キー・リスト',
    PLIST: 'パラメーター・リスト',
};

const upperName = (name) => (name || '').trim().toUpperCase();

// 'ABC' → ABC(引用符で囲まれた文字定数でなければ null)
const literalValue = (text) => {
    if (typeof text !== 'string') {
        return null;
    }
    const m = text.trim().match(/^'((?:[^']|'')*)'$/);
    return m ? m[1].replace(/''/g, "'") : null;
};

// LIB/OBJ・*LIBL/OBJ → OBJ
const objectName = (value) => {
    const parts = value.trim().split('/');
    return parts[parts.length - 1].trim().toUpperCase();
};

const maskLiterals = (text) => text.replace(/'(?:[^']|'')*'?/g, (m) => "'" + ' '.repeat(Math.max(0, m.length - 2)) + (m.length > 1 ? "'" : ''));

// キーワードの有無と引数(括弧の中身)を返す。括弧の入れ子1段まで対応
export const keywordArg = (text, keyword) => {
    const masked = maskLiterals(text);
    const re = new RegExp('(^|[^A-Za-z0-9_#@$-])' + keyword + '(?![A-Za-z0-9_#@$-])', 'i');
    const m = masked.match(re);
    if (!m) {
        return null;
    }
    let i = m.index + m[0].length;
    while (i < text.length && text[i] === ' ') {
        i++;
    }
    if (text[i] !== '(') {
        return { arg: null };
    }
    let depth = 0;
    for (let j = i; j < text.length; j++) {
        if (masked[j] === '(') {
            depth++;
        } else if (masked[j] === ')') {
            depth--;
            if (depth === 0) {
                return { arg: text.substring(i + 1, j).trim() };
            }
        }
    }
    return { arg: text.substring(i + 1).trim() };
};

// 文字列定数と // コメントを除いて名前を取り出す。from/to は桁(1始まり、to を含む)
// 戻り値の start/end は桁(end は排他)
export const tokensInRange = (colLine, from, to, startsInQuote = false) => {
    const tokens = [];
    const text = colLine.substring(from - 1, to === Infinity ? undefined : to);
    let masked = '';
    let inQuote = startsInQuote;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === "'") {
            inQuote = !inQuote;
            masked += ' ';
            continue;
        }
        if (!inQuote && ch === '/' && text[i + 1] === '/') {
            break;
        }
        masked += inQuote ? ' ' : ch;
    }
    let m;
    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(masked)) !== null) {
        const prev = m.index > 0 ? masked[m.index - 1] : '';
        const next = masked[m.index + m[0].length] || '';
        if (prev === '%' || prev === '*' || NAME_CHARS.test(prev)) {
            continue;
        }
        // DCL-S / END-DS / ON-ERROR などハイフンを含む命令コード
        if (next === '-' && /^[A-Za-z]/.test(masked[m.index + m[0].length + 1] || '') && /^(DCL|END|CTL|EVAL|ON|DATA|XML|SND|FOR)$/i.test(m[0])) {
            const rest = masked.substring(m.index).match(/^[A-Za-z]+-[A-Za-z]+/);
            TOKEN_RE.lastIndex = m.index + rest[0].length;
            continue;
        }
        if (prev === '-' && m.index >= 2 && /[A-Za-z]/.test(masked[m.index - 2])) {
            const head = masked.substring(0, m.index - 1).match(/[A-Za-z]+$/);
            if (head && /^(DCL|END|CTL|EVAL|ON|DATA|XML|SND|FOR)$/i.test(head[0])) {
                continue;
            }
        }
        tokens.push({ name: m[0].toUpperCase(), start: from + m.index, end: from + m.index + m[0].length });
    }
    return tokens;
};

// 固定形式の行で名前が書かれる欄(桁の範囲)
const fixedAreas = (info) => {
    const col = info.col;
    switch (info.spec) {
        case 'H':
            return [[7, 80]];
        case 'F':
            return [[7, 16], [44, 80]];
        case 'D':
        case 'P':
            if (isContinuedNameLine(col)) {
                return [[7, 80]];
            }
            return [[7, 21], [44, 80]];
        case 'C': {
            const op = cut(col, 26, 35).trim().toUpperCase().replace(/\(.*$/, '');
            const continuation = op === '' && cut(col, 7, 35).trim() === '';
            if (continuation || EXT_F2_OPCODES.has(op)) {
                return [[12, 25], [36, 80]];
            }
            return [[12, 25], [36, 49], [50, 63]];
        }
        case 'I':
            return [[7, 16], [21, 30], [49, 62]];
        case 'O':
            return [[7, 16], [30, 43], [53, 80]];
        default:
            return [];
    }
};

// D/P 仕様書の名前継続行(名前が 7-21 桁で始まり、... で終わる)
const isContinuedNameLine = (col) => {
    const area = cut(col, 7, 80);
    const trimmedEnd = area.trimEnd();
    if (!trimmedEnd.endsWith('...')) {
        return false;
    }
    const lead = area.length - area.trimStart().length;
    if (lead > 14) {
        return false;
    }
    return /^[A-Za-z_#@$][A-Za-z0-9_#@$]*\.\.\.$/.test(trimmedEnd.trim());
};

export const lineTokens = (info) => {
    if (info.kind === 'fixed') {
        const tokens = [];
        for (const [from, to] of fixedAreas(info)) {
            tokens.push(...tokensInRange(info.col, from, to));
        }
        return tokens;
    }
    if (info.kind === 'free') {
        const to = info.codeStart === 0 ? Infinity : 80;
        return tokensInRange(info.col, info.codeStart + 1, to, info.startsInQuote);
    }
    return [];
};

const USAGE_DEFAULT = {
    DISK: ['I'],
    SEQ: ['I'],
    SPECIAL: ['I'],
    WORKSTN: ['I', 'O'],
    PRINTER: ['O'],
};

const usageToIo = (arg) => {
    const io = [];
    for (const part of arg.split(':')) {
        const u = part.trim().toUpperCase();
        const v = u === '*INPUT' ? 'I' : u === '*OUTPUT' ? 'O' : (u === '*UPDATE' || u === '*DELETE') ? 'U' : null;
        if (v && !io.includes(v)) {
            io.push(v);
        }
    }
    return io;
};

const fixedFileIo = (type, add) => {
    const io = [];
    if (type === 'I') {
        io.push('I');
    } else if (type === 'U') {
        io.push('U');
    } else if (type === 'O') {
        io.push('O');
    } else if (type === 'C') {
        io.push('I', 'O');
    }
    if (add === 'A' && !io.includes('O')) {
        io.push('O');
    }
    return io;
};

// EXTDESC('LIB/F') → EXTFILE('LIB/F') → 宣言名 の順で、実際に探すファイル名を決める
const resolveFileObject = (name, keywords) => {
    const extdesc = keywordArg(keywords, 'EXTDESC');
    const extdescLit = extdesc ? literalValue(extdesc.arg) : null;
    if (extdescLit) {
        return objectName(extdescLit);
    }
    const extfile = keywordArg(keywords, 'EXTFILE');
    const extfileLit = extfile ? literalValue(extfile.arg) : null;
    if (extfileLit && !extfileLit.startsWith('*')) {
        return objectName(extfileLit);
    }
    return name;
};

const firstName = (text) => {
    const m = text.match(/^\s*([A-Za-z_#@$*][A-Za-z0-9_#@$]*)/);
    return m ? m[1] : '';
};

export const parseRpgle = (lines) => {
    const mode = detectDbcsMode(lines);
    const infos = scanLines(lines, mode);
    const statements = freeStatements(infos);
    const result = {
        mode: mode,
        infos: infos,
        statements: statements,
        files: [],
        programs: [],
        definitions: [],
        copies: [],
        controls: [],
        unknownLines: [],
        unterminated: statements.filter((s) => !s.terminated).length,
    };

    const events = [];
    for (const info of infos) {
        if (info.kind === 'fixed' || info.kind === 'directive') {
            events.push({ line: info.line, info: info });
        } else if (info.kind === 'unknown') {
            result.unknownLines.push(info.line);
        }
    }
    for (const stmt of statements) {
        events.push({ line: stmt.line, stmt: stmt });
    }
    events.sort((a, b) => a.line - b.line);

    const files = [];
    const protos = [];
    const interfaces = new Set();
    const usedNames = new Set();
    let block = null;          // { type: 'DS'|'PR'|'PI'|'ENUM', form: 'fixed'|'free', def }
    const procStack = [];
    let subroutine = null;
    let listMode = '';         // 'ENTRY' | 'PLIST' | 'KLIST'
    let listDef = null;
    let pendingName = '';
    let lastDecl = null;
    let lastFile = null;

    const currentProc = () => procStack.length > 0 ? procStack[procStack.length - 1].name : null;
    const addDef = (name, kind, line, endLine = line, extra = {}) => {
        const def = Object.assign({ name: upperName(name), kind: kind, line: line, endLine: endLine, closeLine: null, proc: currentProc(), keywords: '' }, extra);
        if (def.name !== '' && def.name !== '*N' && NAME_RE.test(def.name)) {
            result.definitions.push(def);
        }
        return def;
    };
    const closeBlock = () => {
        block = null;
    };
    const markUsed = (tokens) => {
        for (const t of tokens) {
            usedNames.add(t.name);
        }
    };

    const handleFixed = (info) => {
        const col = info.col;
        const line = info.line;
        switch (info.spec) {
            case 'F': {
                const name = cut(col, 7, 16).trim();
                if (name !== '') {
                    // 桁がずれた(コンパイルできない)ソースで誤った装置名を作らないよう、既知の装置だけ採用する
                    const device = cut(col, 36, 42).trim().toUpperCase();
                    lastFile = {
                        name: upperName(name),
                        type: cut(col, 17, 17).toUpperCase(),
                        add: cut(col, 20, 20).toUpperCase(),
                        device: USAGE_DEFAULT[device] ? device : '',
                        keywords: cut(col, 44, 80),
                        line: line,
                        form: 'fixed',
                    };
                    files.push(lastFile);
                    addDef(name, 'FILE', line);
                } else if (lastFile !== null && lastFile.form === 'fixed') {
                    lastFile.keywords += ' ' + cut(col, 44, 80);
                }
                return;
            }
            case 'D':
            case 'P': {
                if (isContinuedNameLine(col)) {
                    pendingName += cut(col, 7, 80).trim().slice(0, -3);
                    return;
                }
                let name = cut(col, 7, 21).trim();
                if (pendingName !== '') {
                    name = pendingName + name;
                    pendingName = '';
                }
                const keywords = cut(col, 44, 80);
                if (info.spec === 'P') {
                    const be = cut(col, 24, 24).toUpperCase();
                    closeBlock();
                    if (be === 'B') {
                        const def = addDef(name, 'PROC', line, line, { keywords: keywords });
                        procStack.push(def);
                        lastDecl = def;
                    } else if (be === 'E') {
                        const proc = procStack.pop();
                        if (proc) {
                            proc.endLine = line;
                            proc.closeLine = line;
                        }
                        lastDecl = null;
                    } else if (lastDecl !== null) {
                        lastDecl.keywords += ' ' + keywords;
                    }
                    return;
                }
                const type = cut(col, 24, 25).trim().toUpperCase();
                if (name === '' && type === '') {
                    if (lastDecl !== null) {
                        lastDecl.keywords += ' ' + keywords;
                    }
                    return;
                }
                switch (type) {
                    case 'S':
                    case 'C':
                        closeBlock();
                        lastDecl = addDef(name, type, line, line, { keywords: keywords });
                        return;
                    case 'DS':
                    case 'PR':
                    case 'PI': {
                        closeBlock();
                        if (type === 'PI') {
                            if (name !== '' && upperName(name) !== '*N') {
                                interfaces.add(upperName(name));
                            }
                            lastDecl = { keywords: keywords };
                            block = { type: 'PI', form: 'fixed', def: lastDecl };
                            return;
                        }
                        const def = addDef(name, type, line, line, { keywords: keywords });
                        if (type === 'PR') {
                            protos.push(def);
                        }
                        lastDecl = def;
                        block = { type: type, form: 'fixed', def: def };
                        return;
                    }
                    case '':
                        if (block === null || block.form !== 'fixed') {
                            lastDecl = { keywords: keywords };
                            return;
                        }
                        block.def.endLine = line;
                        if (block.type === 'DS') {
                            lastDecl = addDef(name, 'SUBF', line, line, { keywords: keywords, parent: block.def.name });
                        } else if (block.type === 'PI') {
                            lastDecl = addDef(name, 'PARM', line, line, { keywords: keywords });
                        } else {
                            lastDecl = { keywords: keywords };
                        }
                        return;
                    default:
                        closeBlock();
                        lastDecl = null;
                        return;
                }
            }
            case 'C': {
                closeBlock();
                const factor1 = cut(col, 12, 25).trim();
                const op = cut(col, 26, 35).trim().toUpperCase().replace(/\(.*$/, '');
                const factor2 = cut(col, 36, 49).trim();
                const resultField = cut(col, 50, 63).trim();
                const length = cut(col, 64, 68).trim();
                markUsed(lineTokens(info));
                if (op !== 'PARM' && op !== 'KFLD') {
                    listMode = '';
                    listDef = null;
                }
                const extended = EXT_F2_OPCODES.has(op) || (op === '' && cut(col, 7, 35).trim() === '');
                switch (op) {
                    case 'BEGSR':
                        subroutine = addDef(factor1, 'SR', line);
                        break;
                    case 'ENDSR':
                        if (subroutine !== null) {
                            subroutine.endLine = line;
                            subroutine.closeLine = line;
                        }
                        subroutine = null;
                        break;
                    case 'PLIST':
                        if (factor1.toUpperCase() === '*ENTRY') {
                            listMode = 'ENTRY';
                        } else {
                            listMode = 'PLIST';
                            listDef = addDef(factor1, 'PLIST', line);
                        }
                        break;
                    case 'KLIST':
                        listMode = 'KLIST';
                        listDef = addDef(factor1, 'KLIST', line);
                        break;
                    case 'PARM':
                    case 'KFLD':
                        if (listDef !== null) {
                            listDef.endLine = line;
                        }
                        if (op === 'PARM' && listMode === 'ENTRY' && resultField !== '') {
                            addDef(resultField, 'PARM', line, line, { entry: true });
                        } else if (resultField !== '' && length !== '') {
                            addDef(resultField, 'FIELD', line);
                        }
                        break;
                    case 'CALL': {
                        const lit = literalValue(factor2);
                        if (lit) {
                            result.programs.push({ program: objectName(lit), line: line, via: 'CALL' });
                        }
                        break;
                    }
                    case 'DEFINE':
                        addDef(resultField, 'FIELD', line);
                        break;
                    default:
                        if (!extended && resultField !== '' && length !== '') {
                            addDef(resultField, 'FIELD', line);
                        }
                }
                if (op === 'ENDSR' || op === 'BEGSR') {
                    lastDecl = null;
                }
                const ctl = controlOf(op, 'fixed');
                if (ctl) {
                    result.controls.push({ type: ctl, line: line });
                }
                return;
            }
            case 'I': {
                if (cut(col, 7, 16).trim() === '') {
                    const field = cut(col, 49, 62).trim();
                    if (NAME_RE.test(field)) {
                        addDef(field, 'FIELD', line);
                    }
                }
                return;
            }
            default:
                return;
        }
    };

    const handleStatement = (stmt) => {
        // 自由形式の名前継続(name... の次の行に続き)をつなげる
        const text = stmt.text.replace(/([A-Za-z0-9_#@$])\.\.\.\s+(?=[A-Za-z_#@$])/g, '$1');
        const m = text.match(/^([A-Za-z][A-Za-z0-9-]*)/);
        const op = m ? m[1].toUpperCase() : '';
        const afterOp = m ? text.substring(m[0].length).replace(/^\s*\([^)]*\)/, '') : text;
        const name = firstName(afterOp);
        const afterName = afterOp.replace(/^\s*[A-Za-z_#@$*][A-Za-z0-9_#@$]*/, '');
        const line = stmt.line;
        const endLine = stmt.endLine;
        // 文の種類: decl(宣言)/ member(DS・PR・PI の中の要素)/ exec(実行文)
        stmt.role = 'decl';
        const inlineEnd =(word) => new RegExp('(^|\\s)' + word + '(\\s|$)', 'i').test(maskLiterals(afterName));

        switch (op) {
            case 'CTL-OPT':
                return;
            case 'DCL-F': {
                closeBlock();
                const noLit = maskLiterals(afterName);
                const dev = noLit.match(/(^|[\s)])(DISK|WORKSTN|PRINTER|SEQ|SPECIAL)(?![A-Za-z0-9_#@$-])/i);
                let device = dev ? dev[2].toUpperCase() : 'DISK';
                const usage = keywordArg(afterName, 'USAGE');
                let io = usage && usage.arg ? usageToIo(usage.arg) : null;
                let object = null;
                const likeFile = keywordArg(afterName, 'LIKEFILE');
                if (likeFile && likeFile.arg) {
                    const parent = files.find((f) => f.name === upperName(likeFile.arg));
                    if (parent) {
                        // 外部記述は親ファイルのものを引き継ぐ
                        device = parent.device;
                        object = parent.object || resolveFileObject(parent.name, parent.keywords);
                    }
                }
                const file = {
                    name: upperName(name),
                    device: device,
                    keywords: afterName,
                    line: line,
                    form: 'free',
                    io: io,
                    object: object,
                    template: keywordArg(afterName, 'TEMPLATE') !== null,
                };
                files.push(file);
                lastFile = file;
                addDef(name, 'FILE', line, endLine);
                return;
            }
            case 'DCL-S':
            case 'DCL-C':
                closeBlock();
                addDef(name, op === 'DCL-S' ? 'S' : 'C', line, endLine, { keywords: afterName });
                return;
            case 'DCL-DS': {
                closeBlock();
                const def = addDef(name, 'DS', line, endLine, { keywords: afterName });
                const noSubfields = inlineEnd('END-DS') || keywordArg(afterName, 'LIKEDS') !== null || keywordArg(afterName, 'LIKEREC') !== null;
                if (!noSubfields) {
                    block = { type: 'DS', form: 'free', def: def };
                }
                return;
            }
            case 'DCL-PR': {
                closeBlock();
                const def = addDef(name, 'PR', line, endLine, { keywords: afterName });
                protos.push(def);
                if (!inlineEnd('END-PR')) {
                    block = { type: 'PR', form: 'free', def: def };
                }
                return;
            }
            case 'DCL-PI': {
                closeBlock();
                if (name !== '' && upperName(name) !== '*N') {
                    interfaces.add(upperName(name));
                }
                if (!inlineEnd('END-PI')) {
                    block = { type: 'PI', form: 'free', def: { line: line, endLine: endLine } };
                }
                return;
            }
            case 'DCL-ENUM': {
                closeBlock();
                const def = addDef(name, 'C', line, endLine, { keywords: afterName });
                if (!inlineEnd('END-ENUM')) {
                    block = { type: 'ENUM', form: 'free', def: def };
                }
                return;
            }
            case 'END-DS':
            case 'END-PR':
            case 'END-PI':
            case 'END-ENUM':
                if (block !== null && block.form === 'free') {
                    block.def.endLine = endLine;
                    block.def.closeLine = line;
                }
                closeBlock();
                return;
            case 'DCL-SUBF':
                if (block !== null && block.type === 'DS') {
                    addDef(name, 'SUBF', line, endLine, { keywords: afterName, parent: block.def.name });
                }
                return;
            case 'DCL-PARM':
                if (block !== null && block.type === 'PI') {
                    addDef(name, 'PARM', line, endLine, { keywords: afterName });
                }
                return;
            case 'DCL-PROC': {
                closeBlock();
                const def = addDef(name, 'PROC', line, endLine, { keywords: afterName });
                procStack.push(def);
                return;
            }
            case 'END-PROC': {
                closeBlock();
                const proc = procStack.pop();
                if (proc) {
                    proc.endLine = endLine;
                    proc.closeLine = line;
                }
                return;
            }
            case 'BEGSR':
                closeBlock();
                subroutine = addDef(name, 'SR', line, endLine);
                return;
            case 'ENDSR':
                if (subroutine !== null) {
                    subroutine.endLine = endLine;
                    subroutine.closeLine = line;
                }
                subroutine = null;
                return;
            default:
                break;
        }

        if (block !== null && block.form === 'free') {
            // ブロック内の文はサブフィールド / パラメーター / 列挙の要素
            stmt.role = 'member';
            const memberName = firstName(text);
            if (block.type === 'DS') {
                addDef(memberName, 'SUBF', line, endLine, { keywords: text.substring(memberName.length), parent: block.def.name });
            } else if (block.type === 'PI') {
                addDef(memberName, 'PARM', line, endLine, { keywords: text.substring(memberName.length) });
            } else if (block.type === 'ENUM') {
                addDef(memberName, 'C', line, endLine);
            }
            return;
        }
        closeBlock();
        stmt.role = 'exec';

        // 実行文: 使われている名前を集める(EXTPGM プロトタイプが本当に呼ばれているかの判定用)
        for (let l = stmt.line; l <= stmt.endLine; l++) {
            markUsed(lineTokens(infos[l]));
        }
        const ctl = controlOf(op, 'free');
        if (ctl) {
            result.controls.push({ type: ctl, line: line });
        }
    };

    for (const ev of events) {
        if (ev.stmt) {
            handleStatement(ev.stmt);
        } else if (ev.info.kind === 'directive') {
            const dir = ev.info.directive;
            if (dir.name === 'COPY' || dir.name === 'INCLUDE') {
                result.copies.push({ target: dir.args, line: ev.line });
            }
        } else {
            handleFixed(ev.info);
        }
    }

    // ファイル: 使用区分と実際のオブジェクト名を確定する
    for (const f of files) {
        if (f.form === 'fixed') {
            f.io = fixedFileIo(f.type, f.add);
        } else if (f.io === null) {
            f.io = f.template ? [] : (USAGE_DEFAULT[f.device] || ['I']).slice();
        }
        if (!f.object) {
            f.object = resolveFileObject(f.name, f.keywords);
        }
        result.files.push({ name: f.name, object: f.object, device: f.device, io: f.io, line: f.line, form: f.form });
    }

    // EXTPGM のプロトタイプのうち、実際に使われているものを呼び出し先とする。
    // 同名の PI があるもの(自分自身の入口)は除く
    for (const pr of protos) {
        const ext = keywordArg(pr.keywords, 'EXTPGM');
        if (ext === null) {
            continue;
        }
        let program = null;
        if (ext.arg === null || ext.arg === '') {
            program = pr.name;
        } else {
            const lit = literalValue(ext.arg);
            program = lit ? objectName(lit) : null;
        }
        if (program === null || interfaces.has(pr.name) || !usedNames.has(pr.name)) {
            continue;
        }
        result.programs.push({ program: program, prototype: pr.name, line: pr.line, via: 'EXTPGM' });
    }

    return result;
};

// 制御構造の開始・終了
const controlOf = (op, form) => {
    if (op === '') {
        return null;
    }
    if (/^(IF|DOW|DOU|FOR|FOR-EACH|SELECT|MONITOR)$/.test(op)) {
        return 'open';
    }
    if (form === 'fixed' && (/^(IF|DOW|DOU)(EQ|NE|LT|GT|LE|GE)$/.test(op) || op === 'DO')) {
        return 'open';
    }
    if (/^(ENDIF|ENDDO|ENDFOR|ENDSL|ENDMON)$/.test(op) || (form === 'fixed' && op === 'END')) {
        return 'close';
    }
    return null;
};

// 名前から定義を探す(大文字小文字は区別しない)
export const findDefinitions = (parsed, name) => {
    const key = upperName(name);
    return parsed.definitions.filter((d) => d.name === key);
};

// 名前の出現箇所(line は 0 始まり、start/end は桁)
export const findReferences = (parsed, name) => {
    const key = upperName(name);
    const refs = [];
    for (const info of parsed.infos) {
        for (const t of lineTokens(info)) {
            if (t.name === key) {
                refs.push({ line: info.line, start: t.start, end: t.end });
            }
        }
    }
    return refs;
};

// RPG 上の名前 → 外部の名前(ファイル: EXTDESC/EXTFILE、プロトタイプ: EXTPGM)
export const externalAliases = (parsed) => {
    const map = new Map();
    for (const f of parsed.files) {
        map.set(f.name, f.object);
    }
    for (const p of parsed.programs) {
        if (p.prototype) {
            map.set(p.prototype, "'" + p.program + "'");
        }
    }
    return map;
};

// 折りたたみ範囲(1始まりの行番号)
export const foldingRanges = (parsed) => {
    const ranges = [];
    const stack = [];
    const events = [];
    for (const c of parsed.controls) {
        events.push(c);
    }
    for (const info of parsed.infos) {
        if (info.kind === 'fixed' && info.spec === 'P') {
            const be = cut(info.col, 24, 24).toUpperCase();
            if (be === 'B') {
                events.push({ type: 'open', line: info.line });
            } else if (be === 'E') {
                events.push({ type: 'close', line: info.line });
            }
        }
    }
    for (const d of parsed.definitions) {
        if (d.closeLine !== null && d.closeLine > d.line && !(d.kind === 'PROC' && parsed.infos[d.line].kind === 'fixed')) {
            ranges.push({ start: d.line + 1, end: d.closeLine });
        }
    }
    events.sort((a, b) => a.line - b.line);
    for (const e of events) {
        if (e.type === 'open') {
            stack.push(e.line);
        } else {
            const open = stack.pop();
            if (open !== undefined && e.line > open + 1) {
                ranges.push({ start: open + 1, end: e.line });
            }
        }
    }
    return ranges.filter((r) => r.end > r.start);
};

// カーソル位置の名前(または文字定数)。jsColumn は Monaco の column
export const wordAt = (lineText, jsColumn, mode) => {
    const col = toColumnLine(lineText, mode);
    const idx = jsToIbmColumn(lineText, jsColumn, mode) - 1;
    // 文字定数の中なら 'XXX' を返す(CALL 'PGM' のジャンプ用)
    let quoteStart = -1;
    for (let i = 0; i < col.length; i++) {
        if (col[i] !== "'") {
            continue;
        }
        if (quoteStart === -1) {
            quoteStart = i;
        } else if (col[i + 1] === "'") {
            i++;
        } else {
            if (idx >= quoteStart && idx <= i) {
                const inner = col.substring(quoteStart + 1, i).split(FILL).join('');
                return {
                    text: "'" + inner.trim().toUpperCase() + "'",
                    literal: true,
                    startColumn: ibmToJsColumn(lineText, quoteStart + 1, mode),
                    endColumn: ibmToJsColumn(lineText, i + 2, mode),
                };
            }
            quoteStart = -1;
        }
    }
    let s = idx;
    let e = idx;
    if (!NAME_CHARS.test(col[s] || '')) {
        if (s > 0 && NAME_CHARS.test(col[s - 1] || '')) {
            s--;
            e--;
        } else {
            return null;
        }
    }
    while (s > 0 && NAME_CHARS.test(col[s - 1])) {
        s--;
    }
    while (e < col.length - 1 && NAME_CHARS.test(col[e + 1])) {
        e++;
    }
    const word = col.substring(s, e + 1);
    if (!NAME_START.test(word[0])) {
        return null;
    }
    return {
        text: word.toUpperCase(),
        literal: false,
        prefix: s > 0 ? col[s - 1] : '',
        startColumn: ibmToJsColumn(lineText, s + 1, mode),
        endColumn: ibmToJsColumn(lineText, e + 2, mode),
    };
};
