// 開いているソースから「使っているファイル・呼び出しているプログラム」の一覧を作る。
// refDefWorker.js(Web Worker)から使うので monaco / DOM には依存しない。
import { UseIO_Layout } from "./other.js";
import { detectDbcsMode, toColumnLine } from "../lang/column.js";
import { parseRpgle } from "../lang/rpgle/rpgleParse.js";

const newEntry = (name, use, aliases = []) => {
    return { name: name, use: use, isFound: false, data: {}, uri_path: {}, isRegExpFound: false, aliases: aliases };
};

// RPG III(インデント済みテキスト)用。C 仕様書の桁は 18文字の差し込み分ずれている
export const createRefList = (textLine) => {
    let dds = new Map();
    let dsp = new Map();
    let pgm = new Map();
    const mode = detectDbcsMode(textLine);

    for (let i = 0; i < textLine.length; i++) {
        let lineText = toColumnLine(textLine[i], mode);
        if (lineText.substring(5, 6) === "F" && lineText.substring(6, 7) !== "*") {
            let type = lineText.substring(39, 46).trim();
            let file = lineText.substring(6, 14).trim();
            let use = lineText.substring(14, 15).trim();
            let add = lineText.substring(65, 66).trim();
            let using = new UseIO_Layout(true);
            using.device = type;
            if (add === "A") {
                using.io.add('O');
            }
            if (use === "I") {
                using.io.add('I');
            } else if (use === "U") {
                using.io.add('U');
            } else if (use === "O") {
                using.io.add('O');
            }
            if (type === "WORKSTN") {
                if (dsp.has(file)) {
                    using.io = new Set([...using.io, ...dsp.get(file).use.io]);
                }
                dsp.set(file, newEntry(file, using));
            } else if (type === "DISK") {
                if (dds.has(file)) {
                    using.io = new Set([...using.io, ...dds.get(file).use.io]);
                }
                dds.set(file, newEntry(file, using));
            } else if (type === "PRINTER") {
                if (dds.has(file)) {
                    using.io = new Set([...using.io, ...dds.get(file).use.io]);
                }
                dds.set(file, newEntry(file, using));
            }
        } else if (lineText.substring(5, 6) === "C" && lineText.substring(6, 7) !== "*") {
            let op_m = lineText.substring(45, 50).trim();
            let op_2 = lineText.substring(50, 60).trim();
            let op_2_ex = op_2.replace(/'/g, "");
            if (op_m === "CALL") {
                let using = new UseIO_Layout(true);
                using.device = "PGM";
                using.io = new Set(["-", "-"]);
                pgm.set(op_2_ex, newEntry(op_2_ex, using));
            }
        }
    }

    return { dds: dds, dsp: dsp, pgm: pgm };
};

// RPGLE 用。固定形式・/FREE・**FREE のいずれにも対応する
export const createRefList_rpgle = (textLine) => {
    let dds = new Map();
    let dsp = new Map();
    let pgm = new Map();
    const parsed = parseRpgle(textLine);

    for (const file of parsed.files) {
        let using = new UseIO_Layout(true);
        using.device = file.device;
        using.io = new Set(file.io);
        const target = file.device === 'WORKSTN' ? dsp : (file.device === 'DISK' || file.device === 'PRINTER') ? dds : null;
        if (target === null) {
            continue;
        }
        const aliases = file.name !== file.object ? [file.name] : [];
        if (target.has(file.object)) {
            const before = target.get(file.object);
            using.io = new Set([...using.io, ...before.use.io]);
            aliases.push(...before.aliases.filter((a) => !aliases.includes(a)));
        }
        target.set(file.object, newEntry(file.object, using, aliases));
    }

    for (const call of parsed.programs) {
        let using = new UseIO_Layout(true);
        using.device = "PGM";
        using.io = new Set(["-", "-"]);
        const aliases = pgm.has(call.program) ? pgm.get(call.program).aliases : [];
        if (call.prototype && !aliases.includes(call.prototype)) {
            aliases.push(call.prototype);
        }
        pgm.set(call.program, newEntry(call.program, using, aliases));
    }

    return { dds: dds, dsp: dsp, pgm: pgm };
};
