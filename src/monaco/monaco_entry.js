// 'monaco-editor' の差し替え先(vite.config.js の alias から参照)。
// エディタ本体と全機能だけを読み込み、他の言語定義・言語サービスは含めない。
import 'monaco-editor/features/register.all';
export * from 'monaco-editor/editor';
