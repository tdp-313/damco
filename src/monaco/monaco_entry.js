// 'monaco-editor' の差し替え先(vite.config.js の alias から参照)。
// エディタ本体と全機能だけを読み込み、他の言語定義・言語サービスは含めない。

// コマンド・メニュー・検索窓などの表示を日本語にする。
// エディタの機能より先に読み込む必要がある(この import を一番上に置く)。
// 版を上げて動かなくなったら、node_modules/monaco-editor/esm/vs/nls/lang/ja.js があるか確認する。
import 'monaco-editor/nls/lang/ja';
import 'monaco-editor/features/register.all';
export * from 'monaco-editor/editor';
