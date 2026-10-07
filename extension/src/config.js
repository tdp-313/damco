// 設定(damco.*)の読み込み
import * as vscode from 'vscode';
import { normalizeSourceFiles } from '../../shared/sourceFiles.js';

export const readConfig = (scope) => {
    const c = vscode.workspace.getConfiguration('damco', scope);
    const libraryList = c.get('libraryList');
    const referenceRoots = c.get('referenceRoots');
    return {
        sourceFiles: normalizeSourceFiles(c.get('sourceFiles')),
        libraryList: libraryList && typeof libraryList === 'object' ? libraryList : {},
        referenceRoots: Array.isArray(referenceRoots) ? referenceRoots.filter((p) => typeof p === 'string' && p !== '') : [],
        regExp: { div: c.get('regExp.split') || '', search: c.get('regExp.search') || '' },
        forceShiftJIS: c.get('forceShiftJIS') === true,
        autoDetectEncoding: c.get('autoDetectEncoding') !== false,
        rpgleRulers: c.get('rulers.rpgle') !== false,
        highlighting: c.get('highlighting') || 'auto',
    };
};

// 参照用のルート(Web 版の RefMaster)を Uri にする。相対パスは最初のワークスペースフォルダから
export const referenceRootUris = (config) => {
    const folders = vscode.workspace.workspaceFolders || [];
    const uris = [];
    for (const path of config.referenceRoots) {
        if (/^[a-zA-Z]:[\\/]/.test(path) || path.startsWith('/') || path.startsWith('\\\\')) {
            uris.push(vscode.Uri.file(path));
        } else if (folders.length > 0) {
            uris.push(vscode.Uri.joinPath(folders[0].uri, path));
        }
    }
    return uris;
};
