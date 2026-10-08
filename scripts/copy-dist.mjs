// ビルド結果(dist)を、GitHub Pages で公開しているリポジトリ直下に反映する。
//   - 直下の assets/ は中身を全部消してから、dist/assets/ をコピーする(前のビルドのファイルを残さない)
//   - 直下の index.html を dist/index.html で置き換える
// npm run build の最後に実行される。
import { existsSync, rmSync, cpSync, copyFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

if (!existsSync(join(dist, 'index.html')) || !existsSync(join(dist, 'assets'))) {
    console.error('dist/index.html または dist/assets がありません。先に vite build を実行してください。');
    process.exit(1);
}

rmSync(join(root, 'assets'), { recursive: true, force: true });
cpSync(join(dist, 'assets'), join(root, 'assets'), { recursive: true });
copyFileSync(join(dist, 'index.html'), join(root, 'index.html'));

console.log('直下に反映しました: index.html, assets/(' + readdirSync(join(root, 'assets')).length + ' ファイル)');
