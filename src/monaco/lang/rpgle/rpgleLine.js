// RPGLE ソースの行分類と、フリー形式の文(; まで)の組み立て。
// 規則は IBM i 7.5 ILE RPG 解説書「Free-Form Statements」「Common Entries」に従う。
// monaco / DOM には依存しない(Worker とテストから使うため)。
import { detectDbcsMode, toColumnLine, stripFill } from "../column.js";

// 行の種類
//   blank     : 空行
//   comment   : コメント行(6桁目か7桁目が * / // で始まる)
//   directive : コンパイラー指示(/FREE /COPY /IF など、1行目の **FREE)
//   fixed     : 固定形式の仕様書(H/F/D/P/C/I/O)
//   free      : フリー形式のコード(6-7桁目が空白の行の8-80桁、**FREE ソースの全桁)
//   data      : ** 以降のコンパイル時データ、/EOF 以降
//   unknown   : 上記のどれにも当たらない行(精度レポートで件数を監視する)
const FIXED_SPECS = 'HFDPCIO';

// 引用符の外にある // 以降を取り除く。inQuote は行頭で文字列の途中かどうか
const stripComment = (code, inQuote) => {
    for (let i = 0; i < code.length; i++) {
        const ch = code[i];
        if (ch === "'") {
            inQuote = !inQuote;
        } else if (!inQuote && ch === '/' && code[i + 1] === '/') {
            return { code: code.substring(0, i), endsInQuote: false };
        }
    }
    return { code: code, endsInQuote: inQuote };
};

export const stripLineComment = (code) => stripComment(code, false).code;

// 文字列が + / - で次の行へ続くか(引用符の中で行が終わり、最後の文字が + か -)
const continuesLiteral = (code, endsInQuote) => {
    if (!endsInQuote) {
        return false;
    }
    const last = code.trimEnd().slice(-1);
    return last === '+' || last === '-';
};

const directiveInfo = (text) => {
    const m = text.match(/^\/([A-Za-z][A-Za-z-]*)\s*(.*)$/);
    if (!m) {
        return null;
    }
    return { name: m[1].toUpperCase(), args: m[2].trim() };
};

export const scanLines = (lines, mode = detectDbcsMode(lines)) => {
    const out = [];
    let fullyFree = false;
    let dataSection = false;
    let quoteCarry = false;
    // /IF の入れ子の深さ。条件は評価できないので全分岐を読み、/IF の中の /EOF は無視する
    let condDepth = 0;
    const applyDirective = (info, dir) => {
        info.kind = 'directive';
        info.directive = dir;
        if (dir.name === 'IF') {
            condDepth++;
        } else if (dir.name === 'ENDIF') {
            condDepth = Math.max(0, condDepth - 1);
        } else if (dir.name === 'EOF' && condDepth === 0) {
            dataSection = true;
        }
    };

    const setFree = (info, text, codeStart) => {
        const result = stripComment(text, quoteCarry);
        info.kind = 'free';
        info.startsInQuote = quoteCarry;
        info.code = stripFill(result.code);
        info.codeStart = codeStart;
        quoteCarry = continuesLiteral(result.code, result.endsInQuote);
    };

    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i].replace(/\r$/, '');
        const col = toColumnLine(raw, mode);
        const info = { line: i, kind: 'blank', spec: '', col: col, code: '', codeStart: 0, startsInQuote: false };
        out.push(info);

        if (dataSection) {
            info.kind = 'data';
            continue;
        }
        if (/^\*\*(?!\*)/.test(col) && !quoteCarry) {
            if (/^\*\*FREE\b/i.test(col)) {
                // **FREE は1行目の1桁目だけ有効。それ以外の行は無視する
                if (i === 0) {
                    fullyFree = true;
                }
                info.kind = 'directive';
                info.directive = { name: '**FREE', args: '' };
                continue;
            }
            dataSection = true;
            info.kind = 'data';
            continue;
        }

        if (fullyFree) {
            const trimmed = col.trim();
            if (trimmed === '') {
                continue;
            }
            if (!quoteCarry && trimmed.startsWith('//')) {
                info.kind = 'comment';
                continue;
            }
            const dir = !quoteCarry && trimmed.startsWith('/') ? directiveInfo(trimmed) : null;
            if (dir) {
                applyDirective(info, dir);
                continue;
            }
            setFree(info, col, 0);
            continue;
        }

        if (col.trim() === '') {
            continue;
        }
        const spec = col.charAt(5);
        const c7 = col.charAt(6);
        if (spec === '*' || c7 === '*') {
            info.kind = 'comment';
            continue;
        }
        if (c7 === '/') {
            if (col.charAt(7) === '/') {
                info.kind = 'comment';
                continue;
            }
            const dir = directiveInfo(col.substring(6, 80).trimEnd());
            if (dir) {
                applyDirective(info, dir);
                continue;
            }
        }
        if (spec === ' ' || spec === '') {
            // 6桁目が空白ならフリー形式(8-80桁)。81桁目以降は注記
            const area = col.substring(7, 80);
            const trimmed = area.trim();
            if (trimmed === '') {
                continue;
            }
            if (!quoteCarry && trimmed.startsWith('//')) {
                info.kind = 'comment';
                continue;
            }
            setFree(info, area, 7);
            continue;
        }
        const upper = spec.toUpperCase();
        if (FIXED_SPECS.includes(upper)) {
            info.kind = 'fixed';
            info.spec = upper;
            quoteCarry = false;
            continue;
        }
        info.kind = 'unknown';
    }
    return out;
};

// フリー形式の行をつなげて、; で区切られた文にする。
// 固定形式の行・データ部が来たら途中の文はそこで打ち切る。
// 指示行(/IF など)は宣言文の途中に書けるので、文は打ち切らない。
export const freeStatements = (infos) => {
    const statements = [];
    let current = null;
    const flush = () => {
        if (current !== null && current.text.trim() !== '') {
            current.text = current.text.trim();
            statements.push(current);
        }
        current = null;
    };
    for (const info of infos) {
        if (info.kind !== 'free') {
            if (info.kind === 'fixed' || info.kind === 'data') {
                flush();
            }
            continue;
        }
        const code = info.code;
        let inQuote = info.startsInQuote;
        let segStart = 0;
        for (let i = 0; i <= code.length; i++) {
            const ch = code[i];
            const end = i === code.length;
            if (!end && ch === "'") {
                inQuote = !inQuote;
                continue;
            }
            if (end || (ch === ';' && !inQuote)) {
                const segment = code.substring(segStart, i);
                if (segment.trim() !== '') {
                    if (current === null) {
                        current = { text: '', line: info.line, endLine: info.line, terminated: false };
                    }
                    current.text += ' ' + segment;
                    current.endLine = info.line;
                }
                if (!end) {
                    if (current !== null) {
                        current.terminated = true;
                    }
                    flush();
                }
                segStart = i + 1;
            }
        }
    }
    flush();
    return statements;
};
