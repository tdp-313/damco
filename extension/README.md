# DAMCO for VS Code

IBM i のソース(RPG III / RPGLE / DDS / CL)を VS Code で読むための拡張機能です。
Web 版 DAMCO の解析処理をそのまま使っているので、色分け・ホバー・定義ジャンプ・使用ファイルの一覧は Web 版と同じ結果になります。

画面写真つきの説明は GitHub にあります: https://github.com/tdp-313/damco/blob/main/docs/vscode.md

## できること

- 色分け(テーマ「DAMCO Dark」「DAMCO Light」で Web 版と同じ色。IBM i Languages の色分けにも切り替え可)
- ホバー: 命令コード・キーワード・組み込み関数・欄の説明、DDS のフィールドの説明
- 定義へ移動(F12)・その場で見る(Alt+F12)・参照(Shift+F12)
- 使用ファイル・呼び出しプログラムの一覧(アクティビティバーの DAMCO)
- RPG III のインデント表示(エディタ右上の「インデント表示で開く」)
- ソース検索(同じライブラリのソースから文字列を探す)
- Shift_JIS のファイルの自動判定

## はじめかた

次の階層のフォルダ(ルート)を VS Code で開きます。

```
ルート/
  SAMPLIB/          ライブラリ
    QRPGLESRC/      ソースファイル(名前で種類が決まる)
      CUSTINQ       メンバー(拡張子はあってもなくてもよい)
```

| 種類 | ソースファイル名(既定) |
|---|---|
| RPG III | `QRPGSRC` |
| RPGLE | `QRPGLESRC` |
| DDS | `QDDSSRC`(物理・論理・印刷)、`QDSPSRC`(表示装置) |
| CL | `QCLSRC` |

## 設定

設定画面(Ctrl+,)で `@ext:tdp-313.damco` と検索すると一覧が出ます。

| 設定 | 既定値 | 内容 |
|---|---|---|
| `damco.highlighting` | `auto` | 色分け。`auto` は IBM i Languages があればそれ、なければ DAMCO |
| `damco.sourceFiles` | 上の表 | ソースファイル名と種類。`%` のワイルドカード可 |
| `damco.libraryList` | `{}` | ライブラリごとのライブラリリスト(この順に探す) |
| `damco.referenceRoots` | `[]` | 参照先を探す追加のルートフォルダ(Web 版の RefMaster) |
| `damco.regExp.split` / `damco.regExp.search` | `""` | 完全一致で見つからないときの部分一致 |
| `damco.autoDetectEncoding` | `true` | Shift_JIS のファイルを Shift_JIS で開き直す |
| `damco.forceShiftJIS` | `false` | 常に Shift_JIS として読む |
| `damco.rulers.rpgle` | `true` | RPGLE の欄の区切り線 |

```jsonc
{
  "damco.sourceFiles": { "rpgle": ["QRPGLESRC", "QSQLRPGLESRC"] },
  "damco.libraryList": { "DEVLIB": ["DEVLIB", "PRDLIB", "COM%"] },
  "damco.referenceRoots": ["C:/ibmi/refmaster"]
}
```

## 困ったとき

- 色が付かない: ステータスバー右下の言語が `RPGLE (DAMCO)` などになっているか、ソースファイル名が `damco.sourceFiles` に当てはまるかを確認してください。
- 使用ファイルが「Not Found」: 一覧の上の「ライブラリ: …」に、そのファイルのライブラリが入っているかを確認してください(`damco.libraryList`)。
- 文字化け: 未保存のファイルは開き直しません。閉じて開き直すか、`damco.forceShiftJIS` を使ってください。
- 名前の青い波線はスペルチェッカー(Code Spell Checker など)のものです。
- エラーの内容は、出力パネル(Ctrl+Shift+U)の「DAMCO」に出ます。
