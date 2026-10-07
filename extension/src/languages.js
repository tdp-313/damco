// 言語 ID と、ファイルの場所(ルート / ライブラリ / ソースファイル / メンバー)の判定
import * as vscode from 'vscode';
import { resolveSourceType, matchSourceTypes } from '../../shared/sourceFiles.js';
import { stripExtension } from '../../shared/refSearch.js';

// 種類 → 言語 ID。表示装置ファイル(dsp)も DDS として色分けする
export const LANGUAGE_OF_TYPE = {
    rpg: 'damco-rpg',
    rpgle: 'damco-rpgle',
    dds: 'damco-dds',
    dsp: 'damco-dds',
    cl: 'damco-cl',
};
export const INDENT_LANGUAGE = 'damco-rpg-indent';
export const INDENT_SCHEME = 'damco-indent';
export const DAMCO_LANGUAGES = ['damco-rpg', INDENT_LANGUAGE, 'damco-rpgle', 'damco-dds', 'damco-cl'];

// 言語を割り当てるスキーム(git は差分表示で色分けするため)
export const LANGUAGE_SCHEMES = ['file', 'vscode-remote', 'vscode-vfs', 'git', INDENT_SCHEME];
// ライブラリを探せるスキーム(workspace.fs で読める)
export const SEARCH_SCHEMES = ['file', 'vscode-remote', 'vscode-vfs'];

// インデント表示の Uri ⇔ 元のファイルの Uri。元のスキームは query に入れておく
export const toIndentUri = (uri) => uri.with({ scheme: INDENT_SCHEME, query: uri.scheme });
export const fromIndentUri = (uri) => uri.with({ scheme: uri.query || 'file', query: '' });

// 元のファイルの Uri(インデント表示なら元に戻す)
export const sourceUriOf = (uri) => (uri.scheme === INDENT_SCHEME ? fromIndentUri(uri) : uri);

const segments = (uri) => uri.path.split('/').filter((s) => s !== '');

// ルート / ライブラリ / ソースファイル / メンバー に分ける。階層が足りなければ null
export const parseSourcePath = (uri) => {
    const source = sourceUriOf(uri);
    const parts = segments(source);
    if (parts.length < 3) {
        return null;
    }
    const memberFile = parts[parts.length - 1];
    return {
        uri: source,
        root: vscode.Uri.joinPath(source, '..', '..', '..'),
        lib: parts[parts.length - 3],
        file: parts[parts.length - 2],
        member: stripExtension(memberFile),
        memberFile,
    };
};

// ソースファイル名(親フォルダの名前)から種類を決める
export const sourceTypeOf = (uri, sourceFiles) => {
    const parts = segments(sourceUriOf(uri));
    if (parts.length < 2) {
        return null;
    }
    return resolveSourceType(parts[parts.length - 2], sourceFiles);
};

export const conflictingTypesOf = (uri, sourceFiles) => {
    const parts = segments(sourceUriOf(uri));
    return parts.length < 2 ? [] : matchSourceTypes(parts[parts.length - 2], sourceFiles);
};

export const isDamcoDocument = (document) => DAMCO_LANGUAGES.includes(document.languageId);
