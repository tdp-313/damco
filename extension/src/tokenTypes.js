// Monarch のトークン名 → VS Code のセマンティックトークンの種類。
// 種類ごとの既定の色(TextMate のスコープ)は package.json の semanticTokenScopes、
// damco と同じ色は DAMCO テーマ(scripts/build.mjs で Web 版のテーマから作る)で付ける。
// このモジュールは vscode に依存しない(ビルドスクリプトからも使う)。

export const TOKEN_TYPES = {
    comment: 'damcoComment',
    string: 'damcoString',
    number: 'damcoNumber',
    keyword: 'damcoKeyword',
    storage: 'damcoStorage',
    constant: 'damcoConstant',
    entity: 'damcoEntity',
    support: 'damcoSupport',
    type: 'damcoType',
    tag: 'damcoTag',
    predefined: 'damcoPredefined',
    regexp: 'damcoRegexp',
    variable: 'damcoVariable',
    invalid: 'damcoInvalid',
    constructor: 'damcoConstructor',
    metatag: 'damcoMetatag',
    PreIOs: 'damcoPreIOs',
};

export const LEGEND_TYPES = Object.values(TOKEN_TYPES);

// identifier・空白・区切り記号などは色を付けない(null)
export const semanticTypeOf = (monarchToken) => {
    if (!monarchToken) {
        return null;
    }
    const head = monarchToken.split('.')[0];
    return Object.prototype.hasOwnProperty.call(TOKEN_TYPES, head) ? TOKEN_TYPES[head] : null;
};
