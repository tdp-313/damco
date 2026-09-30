// IBM i ソースの「桁位置」と JavaScript 文字列のインデックスを対応させる。
//
// IBM i 上では全角文字(DBCS)は1文字=2桁、さらに全角の並びの前後に SO/SI(各1桁)が入る。
// ダウンロード後のテキストでは全角1文字が JS の1文字になるため、全角を含む行では
// substring(桁-1, ...) で固定桁を読むと右側の欄がずれる。
//
// 変換ツールによって SO/SI の扱いが異なるので、ファイル単位で判定する。
//   'none'  : 全角文字なし。変換不要(従来どおり)
//   'width' : SO/SI が空白(または制御文字のまま)で残っている。全角=2桁で数えれば合う
//   'sosi'  : SO/SI が削除されている。全角=2桁に加え、全角の並びの前後に1桁ずつ補う
//
// このモジュールは monaco / DOM に依存しない(Worker とテストから使うため)。

// 桁合わせ用の詰め物。trim() で消えないよう空白以外の文字を使う
export const FILL = '\u0000';

const SO = '\u000e';
const SI = '\u000f';

// 表示・桁上で2桁を占める文字か(半角カナ、ASCII、Latin-1 は1桁)
// U+FFFD は変換できなかった1バイトの置き換えなので1桁として扱う
export const isWide = (ch) => {
    const code = ch.charCodeAt(0);
    if (code <= 0xff) {
        return false;
    }
    if (code >= 0xff61 && code <= 0xff9f) {
        return false;
    }
    if (code === 0xfffd) {
        return false;
    }
    return true;
};

const hasWide = (line) => {
    for (let i = 0; i < line.length; i++) {
        if (isWide(line[i])) {
            return true;
        }
    }
    return false;
};

// ファイル全体から SO/SI の扱いを判定する。
// SO/SI が空白に置き換わっていれば、全角の並びは必ず空白(または SO/SI 文字)に挟まれる。
// 挟まれていない並びが1つでもあれば SO/SI は削除されている。
export const detectDbcsMode = (lines) => {
    let found = false;
    for (const line of lines) {
        let i = 0;
        while (i < line.length) {
            if (!isWide(line[i])) {
                i++;
                continue;
            }
            found = true;
            const start = i;
            while (i < line.length && isWide(line[i])) {
                i++;
            }
            const prev = start > 0 ? line[start - 1] : ' ';
            // 行末の改行コードは行の端として扱う
            const next = i < line.length && line[i] !== '\r' && line[i] !== '\n' ? line[i] : ' ';
            if ((prev !== ' ' && prev !== SO) || (next !== ' ' && next !== SI)) {
                return 'sosi';
            }
        }
    }
    return found ? 'width' : 'none';
};

// 行を「インデックス = 桁-1」になる文字列に変換する。全角文字の後ろ等に FILL を挟む。
// 全角を含まない行は同じ文字列をそのまま返す(従来動作と完全に一致させるため)。
export const toColumnLine = (line, mode) => {
    if (mode === 'none' || !hasWide(line)) {
        return line;
    }
    let out = '';
    let inRun = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        const wide = isWide(ch);
        if (mode === 'sosi') {
            if (wide && !inRun) {
                out += FILL; // SO
            } else if (!wide && inRun) {
                out += FILL; // SI
            }
        }
        out += wide ? ch + FILL : ch;
        inRun = wide;
    }
    if (mode === 'sosi' && inRun) {
        out += FILL; // 行末の SI
    }
    return out;
};

export const stripFill = (text) => text.indexOf(FILL) === -1 ? text : text.split(FILL).join('');

// 桁位置(1始まり)の範囲を切り出す。toColumnLine 済みの行を渡す
export const cut = (colLine, from, to) => stripFill(colLine.substring(from - 1, to));

// 元の行の JS カラム(Monaco の column、1始まり)→ IBM の桁(1始まり)
export const jsToIbmColumn = (line, jsColumn, mode) => {
    const colLine = toColumnLine(line, mode);
    if (colLine === line) {
        return jsColumn;
    }
    let real = 0;
    for (let i = 0; i < colLine.length; i++) {
        if (colLine[i] === FILL) {
            continue;
        }
        if (real === jsColumn - 1) {
            return i + 1;
        }
        real++;
    }
    return colLine.length + (jsColumn - 1 - real) + 1;
};

// IBM の桁(1始まり)→ 元の行の JS カラム(1始まり)。範囲の開始・終了(排他)どちらにも使える
export const ibmToJsColumn = (line, ibmColumn, mode) => {
    const colLine = toColumnLine(line, mode);
    if (colLine === line) {
        return ibmColumn;
    }
    const head = colLine.substring(0, Math.max(0, ibmColumn - 1));
    const over = Math.max(0, ibmColumn - 1 - colLine.length);
    return stripFill(head).length + over + 1;
};

// Monaco モデル用: バージョンごとに判定結果をキャッシュする
const modelModeCache = new WeakMap();
export const getModelDbcsMode = (model) => {
    const version = model.getVersionId();
    const cached = modelModeCache.get(model);
    if (cached && cached.version === version) {
        return cached.mode;
    }
    const mode = detectDbcsMode(model.getLinesContent());
    modelModeCache.set(model, { version, mode });
    return mode;
};
