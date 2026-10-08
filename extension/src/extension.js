// DAMCO の VS Code 拡張機能。Web 版(src/)の解析処理を共有し、VS Code の機能として提供する。
import * as vscode from 'vscode';
import { DocumentService } from './documents.js';
import { registerAssign } from './assign.js';
import { registerProviders } from './providers.js';
import { registerSemanticTokens } from './semanticTokens.js';
import { registerIndentView } from './indentView.js';
import { registerRulers } from './rulers.js';
import { registerViews, buildFileList, buildProgramList } from './views.js';
import { registerSearch, searchSources } from './search.js';
import { readConfig, referenceRootUris } from './config.js';
import { isDamcoDocument } from './languages.js';

export const activate = (context) => {
    const output = vscode.window.createOutputChannel('DAMCO');
    context.subscriptions.push(output);
    const service = new DocumentService(output);
    context.subscriptions.push(service.onDidUpdateEmitter);

    registerAssign(context, output);
    registerSemanticTokens(context, output);
    registerProviders(context, service, output);
    registerIndentView(context);
    registerRulers(context);
    const views = registerViews(context, service);
    registerSearch(context);

    // ファイルが増えた・消えた・変わったら、次に使うときに探し直す
    const invalidate = () => {
        service.invalidate();
        const editor = vscode.window.activeTextEditor;
        if (editor && isDamcoDocument(editor.document)) {
            service.ensureReferences(editor.document);
        }
    };
    let timer;
    const scheduleInvalidate = () => {
        clearTimeout(timer);
        timer = setTimeout(invalidate, 500);
    };
    const watchers = [];
    const watch = () => {
        watchers.splice(0).forEach((w) => w.dispose());
        const patterns = (vscode.workspace.workspaceFolders || []).map((folder) => new vscode.RelativePattern(folder, '**/*'));
        for (const uri of referenceRootUris(readConfig())) {
            patterns.push(new vscode.RelativePattern(uri, '**/*'));
        }
        for (const pattern of patterns) {
            const watcher = vscode.workspace.createFileSystemWatcher(pattern);
            watcher.onDidCreate(scheduleInvalidate);
            watcher.onDidDelete(scheduleInvalidate);
            watcher.onDidChange(scheduleInvalidate);
            watchers.push(watcher);
        }
    };
    watch();
    context.subscriptions.push({ dispose: () => watchers.forEach((w) => w.dispose()) });
    context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(watch));
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('damco')) {
            if (e.affectsConfiguration('damco.referenceRoots')) {
                watch();
            }
            invalidate();
        }
    }));
    context.subscriptions.push(vscode.workspace.onDidCloseTextDocument((document) => service.forget(document)));

    context.subscriptions.push(vscode.commands.registerCommand('damco.refresh', () => {
        invalidate();
        views.refresh();
    }));

    // テスト用(結合テストから中身を確かめる)
    return {
        service,
        buildFileList,
        buildProgramList,
        searchSources,
        readConfig,
    };
};

export const deactivate = () => { };
