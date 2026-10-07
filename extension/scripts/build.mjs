// 拡張機能のビルド。
//   1. src/extension.js を dist/extension.js に 1 ファイルにまとめる('monaco-editor' は src/monacoShim.js に置き換える)
//   2. Web 版のテーマ(src/monaco/theme/*.json)から DAMCO Dark / Light のテーマを作る
// 使い方: node scripts/build.mjs [--watch]
import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { TOKEN_TYPES } from '../src/tokenTypes.js';

const extensionDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoDir = join(extensionDir, '..');
const watch = process.argv.includes('--watch');

// Monaco の組み込みテーマ(vs / vs-dark)のトークンの色。Web 版のテーマは inherit: true でこれを引き継ぐ
const monacoBaseRules = (name) => {
    const path = join(repoDir, 'node_modules', 'monaco-editor', 'esm', 'vs', 'editor', 'standalone', 'common', 'themes.js');
    if (!existsSync(path)) {
        throw new Error('monaco-editor が見つかりません。リポジトリの直下で npm install を実行してください: ' + path);
    }
    const source = readFileSync(path, 'utf8');
    const start = source.indexOf('export const ' + name + ' = {');
    const end = source.indexOf('export const', start + 1);
    const block = source.slice(start, end === -1 ? undefined : end);
    const rules = Object.create(null);
    for (const m of block.matchAll(/\{\s*token:\s*'([^']*)',\s*foreground:\s*'([0-9A-Fa-f]{6})'/g)) {
        rules[m[1]] = m[2];
    }
    return rules;
};

const createTheme = (label, file, type, baseName) => {
    const theme = JSON.parse(readFileSync(join(repoDir, 'src', 'monaco', 'theme', file), 'utf8'));
    const base = monacoBaseRules(baseName);
    const own = Object.create(null);
    for (const rule of theme.rules) {
        if (rule.token && !rule.token.includes(' ')) {
            own[rule.token] = rule;
        }
    }
    // damco の色分け(セマンティックトークン)は、Monarch のトークン名で Web 版と同じ色にする
    const semanticTokenColors = {};
    for (const [token, semanticType] of Object.entries(TOKEN_TYPES)) {
        const rule = own[token];
        const foreground = rule && rule.foreground ? rule.foreground : base[token];
        if (foreground) {
            semanticTokenColors[semanticType] = rule && rule.fontStyle ? { foreground: '#' + foreground, fontStyle: rule.fontStyle } : '#' + foreground;
        }
    }
    const tokenColors = [];
    for (const [token, foreground] of Object.entries(base)) {
        if (token !== '') {
            tokenColors.push({ scope: token, settings: { foreground: '#' + foreground } });
        }
    }
    for (const rule of theme.rules) {
        if (rule.token && (rule.foreground || rule.fontStyle)) {
            const settings = {};
            if (rule.foreground) {
                settings.foreground = '#' + rule.foreground;
            }
            if (rule.fontStyle) {
                settings.fontStyle = rule.fontStyle;
            }
            tokenColors.push({ scope: rule.token, settings });
        }
    }
    return {
        $schema: 'vscode://schemas/color-theme',
        name: label,
        type,
        colors: theme.colors,
        semanticHighlighting: true,
        semanticTokenColors,
        tokenColors,
    };
};

const writeThemes = () => {
    const dir = join(extensionDir, 'dist', 'themes');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'damco-dark.json'), JSON.stringify(createTheme('DAMCO Dark', 'dark_1.json', 'dark', 'vs_dark'), null, 2));
    writeFileSync(join(dir, 'damco-light.json'), JSON.stringify(createTheme('DAMCO Light', 'white.json', 'light', 'vs'), null, 2));
};

const options = {
    entryPoints: [join(extensionDir, 'src', 'extension.js')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    outfile: join(extensionDir, 'dist', 'extension.js'),
    external: ['vscode'],
    alias: { 'monaco-editor': join(extensionDir, 'src', 'monacoShim.js') },
    sourcemap: true,
    logLevel: 'info',
    // Web 版の rpg_indent_text.js にある重複キー(既存のまま)
    logOverride: { 'duplicate-object-key': 'silent' },
};

writeThemes();
if (watch) {
    const context = await esbuild.context(options);
    await context.watch();
} else {
    await esbuild.build(options);
}
