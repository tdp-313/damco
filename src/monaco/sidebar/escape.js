// HTML の文字列を組み立てるときに、ソースから来た文字(名前・TEXT の説明・検索語)をそのまま文字として出す。
// DOM には依存しない(テストから使うため)
export const escapeHtml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
