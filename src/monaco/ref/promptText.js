// プロンプト出力の文字列の組み立て。DOM・設定には依存しない(テストから使うため)。
import { revIndent } from "../file/text_extend.js";

// 画面のテキストを、出力するソースに戻す(行末の空白を除き、最後は改行 1 つ)。
// インデント表示の線を取り除くのは RPG III のインデント表示(rpg-indent)だけ。
// RPGLE や CL に同じ処理をかけると、6 桁目が C の行の 28〜45 桁目が消えてしまう
export const exportSourceText = (text, languageId) => {
    const lines = text.split(/\r\n|\r|\n/).map((line) => line.trimEnd());
    const source = languageId === 'rpg-indent' ? revIndent(lines) : lines.join("\n");
    return source.replace(/\n*$/, "\n");
};

// ひな形の %{name} などを置き換える(それぞれ最初の 1 か所)。
// 置き換える文字列は関数で渡す。文字列のまま渡すと、ソースの中の $' や $& が特別な意味になって出力が崩れる
export const fillPrompt = (template, replaceTextSet) => {
    let prompt = template;
    for (const item of replaceTextSet) {
        prompt = prompt.replace(item.placement, () => item.text);
    }
    return prompt;
};
