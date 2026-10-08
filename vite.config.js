import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  root: 'src',
  resolve: {
    alias: [
      // 'monaco-editor' は全言語の色分け・ワーカーを含むので、エディタ本体(edcore.main)だけを使う。
      // ビルドに他の言語(abap.js など)のファイルができないようにするため
      { find: /^monaco-editor$/, replacement: 'monaco-editor/esm/vs/editor/edcore.main.js' },
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