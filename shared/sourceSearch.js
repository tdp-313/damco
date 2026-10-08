// ソース検索(Web 版のサイドバーの検索、src/monaco/webworker/filesystem_worker.js の fileSearch)の判定。
// 検索語は正規表現。% を含む場合は SQL の LIKE と同じく % = 任意の文字列、_ = 任意の 1 文字。
// 空でない検索語がすべて見つかったソースを一致とする(AND)。

const toRegExp = (query) => {
    if (query.includes('%')) {
        const pattern = query
            .replace(/[.+^${}()|[\]\\]/g, '\\$&')
            .replace(/%/g, '.*')
            .replace(/_/g, '.');
        return new RegExp(pattern);
    }
    return new RegExp(query);
};

// 検索語から判定関数を作る。検索語がすべて空なら null。正規表現が正しくなければ例外
export const createSourceMatcher = (queries) => {
    const active = queries.filter((q) => typeof q === 'string' && q !== '');
    if (active.length === 0) {
        return null;
    }
    const regexps = active.map(toRegExp);
    return (text) => regexps.every((reg) => reg.test(text));
};
