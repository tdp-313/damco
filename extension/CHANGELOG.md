# Changelog

## 0.2.0

- 設定 `damco.highlighting` を追加。色分けを DAMCO と IBM i Languages から選べるように(既定は auto: IBM i Languages があればそれを使う)
- IBM i Languages の言語(rpg / rpgle / cl / dds.*)のソースでも、ホバー・定義・参照・使用ファイルの一覧が動くように
- 言語はフォルダ名(damco.sourceFiles)だけで決めるように(固定のフォルダ名の割り当てを削除)

## 0.1.1

- RPG III などの固定形式で、行末に空白がない行の色分けが欄の途中で切り替わっていたのを修正(Web 版と同じく 80 桁まで埋めて色分けする)

## 0.1.0

- 最初の版。Web 版 DAMCO の言語機能(色分け・ホバー・定義・参照・折りたたみ・CodeLens)を VS Code に移植
- ライブラリリストによる参照先の検索、使用ファイル・呼び出しプログラムの一覧、ソース検索
- RPG III のインデント表示
- ソースファイル名(QRPGSRC など)を設定 `damco.sourceFiles` で変更可能に
