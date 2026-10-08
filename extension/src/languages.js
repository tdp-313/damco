// 言語 ID と、ファイルの場所(ルート / ライブラリ / ソースファイル / メンバー)の判定
import * as vscode from 'vscode';
import { resolveSourceType, matchSourceTypes } from '../../shared/sourceFiles.js';
import { stripExtension } from '../../shared/refSearch.js';
import { readConfig } from './config.js';

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

// IBM i Languages(barrettotte.ibmi-languages)の言語 ID。damco.highlighting で色分けをこちらにできる
export const IBMI_LANGUAGES_EXTENSION = 'barrettotte.ibmi-languages';
export const IBMI_LANGUAGE_OF_TYPE = {
    rpg: 'rpg',
    rpgle: 'rpgle',
    dds: 'dds.pf',
    dsp: 'dds.dspf',
    cl: 'cl',
};
const IBMI_DDS_LANGUAGES = ['dds.pf', 'dds.lf', 'dds.dspf', 'dds.prtf'];
export const IBMI_LANGUAGES = ['rpg', 'rpgle', 'cl', ...IBMI_DDS_LANGUAGES];

// 解析での種類(rpg / rpg-indent / rpgle / dds / cl)。DAMCO と IBM i Languages のどちらの言語 ID でも同じ
export const kindOfLanguage = (languageId) => {
    switch (languageId) {
        case 'damco-rpg':
        case 'rpg':
            return 'rpg';
        case INDENT_LANGUAGE:
            return 'rpg-indent';
        case 'damco-rpgle':
        case 'rpgle':
            return 'rpgle';
        case 'damco-dds':
            return 'dds';
        case 'damco-cl':
        case 'cl':
            return 'cl';
        default:
            return IBMI_DDS_LANGUAGES.includes(languageId) ? 'dds' : null;
    }
};

// 解析の種類ごとの、Provider を登録する言語
export const languagesOfKind = (kind) => {
    const all = [...DAMCO_LANGUAGES, ...IBMI_LANGUAGES];
    return all.filter((languageId) => kindOfLanguage(languageId) === kind);
};

export const isIbmiLanguagesInstalled = () => vscode.extensions.getExtension(IBMI_LANGUAGES_EXTENSION) !== undefined;

// 色分けを DAMCO と IBM i Languages のどちらで行うか。IBM i Languages が入っていなければ DAMCO
export const resolveHighlighting = (config) => {
    if (config.highlighting === 'damco' || !isIbmiLanguagesInstalled()) {
        return 'damco';
    }
    return 'ibmiLanguages';
};

// 種類に割り当てる言語。IBM i Languages の DDS は、拡張子で物理・論理・印刷が決まっていればそれを残す
export const languageForType = (type, highlighting, currentLanguageId) => {
    if (highlighting !== 'ibmiLanguages') {
        return LANGUAGE_OF_TYPE[type];
    }
    if (type === 'dds' && ['dds.pf', 'dds.lf', 'dds.prtf'].includes(currentLanguageId)) {
        return currentLanguageId;
    }
    return IBMI_LANGUAGE_OF_TYPE[type];
};

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

// DAMCO が解析するドキュメントか。DAMCO の言語、または IBM i Languages の言語でソースファイルのフォルダにあるもの
// (フォルダの外の .rpgle などは、ほかの拡張機能に任せる)
export const isDamcoDocument = (document) => {
    if (DAMCO_LANGUAGES.includes(document.languageId)) {
        return true;
    }
    if (!IBMI_LANGUAGES.includes(document.languageId)) {
        return false;
    }
    return sourceTypeOf(document.uri, readConfig(document.uri).sourceFiles) !== null;
};
