import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  root: 'src',
  resolve: {
    alias: [
      // 'monaco-editor' は全言語の色分け・ワーカーを含むので、エディタ本体(editor 本体と全機能のみ)だけを使う。
      // ビルドに他の言語(abap.js など)のファイルができないようにするため
      { find: /^monaco-editor$/, replacement: fileURLToPath(new URL('./src/monaco/monaco_entry.js', import.meta.url)) },
    ],
  },
  base: './',
  publicDir: 'public',
  build: {
    outDir: '../dist',
    // dist は root(src)の外なので、明示しないと前回のファイルが残る
    emptyOutDir: true,
    sourcemap: false,
  },
})