// ソースファイル(QRPGSRC など)の名前から、ソースの種類を判定する。
// 名前は設定で変更でき、ライブラリリストと同じ % のワイルドカードを使える。
// このモジュールは monaco / DOM / vscode に依存しない。

// 種類ごとのソースファイル名の既定値(完全一致)
export const DEFAULT_SOURCE_FILES = {
    rpg: ['QRPGSRC'],
    rpgle: ['QRPGLESRC'],
    dds: ['QDDSSRC'],
    dsp: ['QDSPSRC'],
    cl: ['QCLSRC'],
};

export const SOURCE_TYPES = Object.keys(DEFAULT_SOURCE_FILES);

// % のワイルドカード付きの名前と比べる(大文字・小文字は区別しない)
//   %文字%: 部分一致 / %文字: 後方一致 / 文字%: 前方一致 / それ以外: 完全一致
export const matchSearchName = (targetName, searchName) => {
    const target = String(targetName).toUpperCase();
    const search = String(searchName).toUpperCase();
    if (search.startsWith('%') && search.endsWith('%') && search.length > 2) {
        return target.includes(search.slice(1, -1));
    } else if (search.startsWith('%')) {
        return target.endsWith(search.slice(1));
    } else if (search.endsWith('%')) {
        return target.startsWith(search.slice(0, -1));
    }
    return target === search;
};

// 設定値を既定値と合わせる。種類ごとに、配列が指定されていればそれを使う
export const normalizeSourceFiles = (setting) => {
    const result = {};
    for (const type of SOURCE_TYPES) {
        const value = setting ? setting[type] : undefined;
        result[type] = Array.isArray(value) ? value.filter((name) => typeof name === 'string' && name !== '') : [...DEFAULT_SOURCE_FILES[type]];
    }
    return result;
};

// ソースファイル名に当てはまる種類をすべて返す(rpg, rpgle, dds, dsp, cl の順)
export const matchSourceTypes = (fileName, sourceFiles) => {
    const types = [];
    for (const type of SOURCE_TYPES) {
        if ((sourceFiles[type] || []).some((pattern) => matchSearchName(fileName, pattern))) {
            types.push(type);
        }
    }
    return types;
};

// ソースファイル名から種類を1つ決める。当てはまらなければ null
export const resolveSourceType = (fileName, sourceFiles) => {
    const types = matchSourceTypes(fileName, sourceFiles);
    return types.length > 0 ? types[0] : null;
};

// 参照先を探すときの分類。DDS(物理・論理・印刷)、表示装置、プログラム
export const categoryOf = (type) => {
    if (type === 'dds' || type === 'dsp') {
        return type;
    }
    return type === null ? null : 'pgm';
};
