# DAMCO for VS Code

IBM i のソース(RPG III / RPGLE / DDS / CL)を VS Code で読むための拡張機能です。
Web 版 DAMCO の解析処理をそのまま使っているので、色分け・ホバー・定義ジャンプ・参照ファイルの一覧は Web 版と同じ結果になります。

## フォルダの構成

Web 版と同じく、次の階層のフォルダを開いて使います。

```
ルート/
  ライブラリ/        例: SAMPLIB
    ソースファイル/  例: QRPGLESRC
      メンバー       例: CUSTINQ.rpgle(拡張子はあってもなくてもよい)
```

ソースファイルの名前で種類が決まります(既定: `QRPGSRC` `QRPGLESRC` `QDDSSRC` `QDSPSRC` `QCLSRC`)。名前は設定で変えられます。

## できること

| 機能 | 内容 |
|---|---|
| 色分け | Web 版と同じ規則。テーマ「DAMCO Dark」「DAMCO Light」を選ぶと色も Web 版と同じになります。IBM i Languages の色分けにも切り替えられます(下記) |
| ホバー | 命令コード・キーワード・組み込み関数の説明、DDS のフィールドの説明(TEXT / COLHDG) |
| 定義へ移動(F12) | ソース内の定義、DDS のフィールド・ファイル、呼び出し先のプログラム |
| 参照の検索(Shift+F12) | ソース内で名前を使っている場所 |
| 折りたたみ | RPGLE の IF〜ENDIF など、RPG III の構造 |
| RPG III のインデント表示 | エディタ右上の「インデント表示で開く」。Web 版の通常表示と同じ(読み取り専用) |
| 欄の区切り線 | RPG III は固定のルーラー。RPGLE は行ごとにその行の仕様書の欄に線を引きます |
| 使用ファイル・呼び出しプログラム | アクティビティバーの DAMCO。I/U/O の絞り込みつき |
| ソース検索 | 同じライブラリのソースから文字列(正規表現・`%` のワイルドカード)を含むものを探します。2 つ目の検索語で AND |
| 文字コード | Web 版と同じ判定で、Shift_JIS のファイルは Shift_JIS で開き直します |

RPG III は、元のファイルのままでもホバー・定義・参照が使えます(内部でインデント表示の位置に変換しています)。

## 色分けの切り替え(DAMCO / IBM i Languages)

設定 `damco.highlighting` で、色分けに使う拡張機能を選べます。

| 値 | 動作 |
|---|---|
| `auto`(既定) | IBM i Languages(barrettotte.ibmi-languages)が入っていればそれを、なければ DAMCO を使う |
| `damco` | DAMCO の色分け。言語は `RPG III (DAMCO)` などになります |
| `ibmiLanguages` | IBM i Languages の色分け。ソースファイルのフォルダ名から `rpg` `rpgle` `cl` `dds.pf` `dds.dspf` を割り当てます |

`ibmiLanguages` では、メンバーの拡張子が `.txt` などでもフォルダ名で色が付きます。また、Code for IBM i など `rpgle` などの言語を前提にした拡張機能と一緒に使えます。
どちらの場合も、ホバー・定義・参照・使用ファイルの一覧は DAMCO が出します(ライブラリの階層の外にある `.rpgle` などには DAMCO は答えません)。
RPG III のインデント表示は、常に DAMCO の色分けです。

## 設定

`settings.json`(ワークスペースの `.vscode/settings.json` に書くとチームで共有できます)

```jsonc
{
  // ソースファイル名と種類。書いた種類だけ置き換わり、残りは既定値
  "damco.sourceFiles": {
    "rpgle": ["QRPGLESRC", "QSQLRPGLESRC"],
    "dds": ["QDDSSRC", "QDDS%"]
  },
  // ライブラリごとのライブラリリスト(この順に探す)。書かないライブラリは「自分」と「先頭 3 文字を含むもの」
  "damco.libraryList": {
    "DEVLIB": ["DEVLIB", "PRDLIB", "COM%"]
  },
  // 参照用のルート(Web 版の RefMaster)
  "damco.referenceRoots": ["C:/ibmi/refmaster"]
}
```

| 設定 | 既定値 | 内容 |
|---|---|---|
| `damco.highlighting` | `auto` | 色分けに使う拡張機能(上記) |
| `damco.sourceFiles` | 上記の 5 つ | ソースファイル名と種類。`%` は前方・後方・部分一致。大文字・小文字は区別しない |
| `damco.libraryList` | `{}` | ライブラリごとのライブラリリスト |
| `damco.referenceRoots` | `[]` | 追加で探すルートフォルダ |
| `damco.regExp.split` / `damco.regExp.search` | `""` | 完全一致で見つからないときの部分一致(Web 版の RegExp) |
| `damco.autoDetectEncoding` | `true` | Shift_JIS のファイルを Shift_JIS で開き直す |
| `damco.forceShiftJIS` | `false` | 常に Shift_JIS として読む |
| `damco.rulers.rpgle` | `true` | RPGLE の欄の区切り線 |

## Web 版との違い

- ソースファイル名(QRPGSRC など)を設定で変えられます。既定は完全一致です(Web 版は参照先の検索だけ「名前を含む」でした)。
- 参照先はライブラリリストの順に探します。同じメンバーが複数のライブラリにあれば、リストの前の方を使います。
- ライブラリ・ソースファイル・メンバーの名前は大文字・小文字を区別しません。
- タブ・差分表示・履歴・テーマの切り替えは VS Code の機能を使います。

## 制限

- RPGLE の欄の区切り線は、行の長さより右には引けません。
- 編集中(未保存)のファイルは、文字コードを開き直しません。
- IBM i への直接の接続はありません(ローカルのフォルダが対象です)。
