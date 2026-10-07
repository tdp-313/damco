// ホバー・定義・参照・折りたたみ・CodeLens。解析は Web 版(src/monaco)の処理をそのまま使い、
// Monaco の形(1 始まりの Range、{ uri, range })と VS Code の形を変換する。
import * as vscode from 'vscode';
import { rpgleHover, rpgleDefinition, rpgleReferences, rpgleFolding } from '../../src/monaco/lang/Provider/rpgle.js';
import { rpgIndentHover, ddsHover } from '../../src/monaco/lang/Provider/hover.js';
import { defGetModule, ddsDefinition } from '../../src/monaco/lang/Provider/definition.js';
import { rpgIndentReferences } from '../../src/monaco/lang/Provider/reference.js';
import { rpgIndentFolding } from '../../src/monaco/lang/Provider/folding.js';
import { rpgIndentCodeLenses } from '../../src/monaco/lang/Provider/codeLens.js';
import { isDamcoDocument, languagesOfKind } from './languages.js';

const MAX_COLUMN = 10000;

const clamp = (value, max) => {
    if (!Number.isFinite(value)) {
        return max;
    }
    return Math.max(0, Math.min(Math.floor(value), max));
};

// VS Code の位置 → Monaco の位置(RPG III の元のファイルはインデント済みの位置に変える)
const toMonacoPosition = (entry, position) => {
    const column = position.character + 1;
    return {
        lineNumber: position.line + 1,
        column: entry.map ? entry.map.toIndentColumn(position.line, column) : column,
    };
};

// Monaco の範囲 → VS Code の範囲。同じドキュメントの範囲で RPG III の元のファイルなら位置を戻す
const toRange = (range, entry, sameDocument) => {
    const startLine = clamp(range.startLineNumber - 1, 1e6);
    const endLine = clamp(range.endLineNumber - 1, 1e6);
    let startColumn = range.startColumn;
    let endColumn = range.endColumn;
    if (sameDocument && entry && entry.map) {
        startColumn = entry.map.toRawColumn(startLine, startColumn);
        endColumn = Number.isFinite(endColumn) && endColumn < MAX_COLUMN ? entry.map.toRawColumn(endLine, endColumn) : endColumn;
    }
    return new vscode.Range(startLine, clamp(startColumn - 1, MAX_COLUMN), endLine, clamp(endColumn - 1, MAX_COLUMN));
};

const toLocations = (result, entry, document) => {
    if (!Array.isArray(result)) {
        return [];
    }
    const locations = [];
    for (const item of result) {
        if (!item || !item.uri || !item.range) {
            continue;
        }
        const uri = item.uri instanceof vscode.Uri ? item.uri : vscode.Uri.parse(String(item.uri));
        const same = uri.toString() === document.uri.toString();
        locations.push(new vscode.Location(uri, toRange(item.range, entry, same)));
    }
    return locations;
};

const toHover = (result, entry) => {
    if (!result || !Array.isArray(result.contents)) {
        return null;
    }
    const contents = result.contents
        .map((c) => (typeof c === 'string' ? c : c && c.value))
        .filter((value) => typeof value === 'string' && value.trim() !== '')
        .map((value) => new vscode.MarkdownString(value));
    if (contents.length === 0) {
        return null;
    }
    return new vscode.Hover(contents, result.range ? toRange(result.range, entry, true) : undefined);
};

// 解析の例外でエディタの操作を止めない。DAMCO が扱わないドキュメントには答えない
const safe = (output, name, fn) => async (...args) => {
    if (!isDamcoDocument(args[0])) {
        return null;
    }
    try {
        return await fn(...args);
    } catch (error) {
        output.appendLine('[' + name + '] ' + (error && error.stack ? error.stack : error));
        return null;
    }
};

export const registerProviders = (context, service, output) => {
    const selector = (...kinds) => kinds.flatMap(languagesOfKind).map((language) => ({ language }));
    const rpgle = selector('rpgle');
    const rpgIndent = selector('rpg', 'rpg-indent');
    const dds = selector('dds');
    const register = (disposable) => context.subscriptions.push(disposable);
    const sync = (name, fn) => (document) => {
        if (!isDamcoDocument(document)) {
            return [];
        }
        try {
            return fn(document);
        } catch (error) {
            output.appendLine('[' + name + '] ' + error);
            return [];
        }
    };

    const withModel = async (document, fn) => {
        const entry = await service.ready(document);
        return fn(entry);
    };

    // RPGLE
    register(vscode.languages.registerHoverProvider(rpgle, {
        provideHover: safe(output, 'hover', (document, position) => withModel(document, (entry) =>
            toHover(rpgleHover(entry.model, toMonacoPosition(entry, position)), entry))),
    }));
    register(vscode.languages.registerDefinitionProvider(rpgle, {
        provideDefinition: safe(output, 'definition', (document, position) => withModel(document, (entry) =>
            toLocations(rpgleDefinition(entry.model, toMonacoPosition(entry, position)), entry, document))),
    }));
    register(vscode.languages.registerReferenceProvider(rpgle, {
        provideReferences: safe(output, 'references', (document, position) => withModel(document, (entry) =>
            toLocations(rpgleReferences(entry.model, toMonacoPosition(entry, position)), entry, document))),
    }));
    register(vscode.languages.registerFoldingRangeProvider(rpgle, {
        provideFoldingRanges: sync('folding', (document) =>
            rpgleFolding(service.get(document).model).map((r) => new vscode.FoldingRange(r.start - 1, r.end - 1))),
    }));

    // RPG III(元のファイルとインデント表示)
    register(vscode.languages.registerHoverProvider(rpgIndent, {
        provideHover: safe(output, 'hover', (document, position) => withModel(document, async (entry) =>
            toHover(await rpgIndentHover(entry.model, toMonacoPosition(entry, position)), entry))),
    }));
    register(vscode.languages.registerDefinitionProvider(rpgIndent, {
        provideDefinition: safe(output, 'definition', (document, position) => withModel(document, async (entry) =>
            toLocations(await defGetModule(entry.model, toMonacoPosition(entry, position)), entry, document))),
    }));
    register(vscode.languages.registerReferenceProvider(rpgIndent, {
        provideReferences: safe(output, 'references', (document, position) => withModel(document, async (entry) =>
            toLocations(await rpgIndentReferences(entry.model, toMonacoPosition(entry, position)), entry, document))),
    }));
    register(vscode.languages.registerFoldingRangeProvider(rpgIndent, {
        provideFoldingRanges: sync('folding', (document) =>
            rpgIndentFolding(service.get(document).model)
                .filter((r) => r.end > r.start)
                .map((r) => new vscode.FoldingRange(r.start - 1, r.end - 1))),
    }));
    register(vscode.languages.registerCodeLensProvider(rpgIndent, {
        provideCodeLenses: sync('codeLens', (document) => {
            const entry = service.get(document);
            return rpgIndentCodeLenses(entry.model)
                .filter((lens) => lens.range.startLineNumber <= document.lineCount)
                .map((lens) => new vscode.CodeLens(toRange(lens.range, entry, true), { title: lens.command.title, command: '' }));
        }),
    }));

    // DDS
    register(vscode.languages.registerHoverProvider(dds, {
        provideHover: safe(output, 'hover', (document, position) => withModel(document, async (entry) =>
            toHover(await ddsHover(entry.model, toMonacoPosition(entry, position)), entry))),
    }));
    register(vscode.languages.registerDefinitionProvider(dds, {
        provideDefinition: safe(output, 'definition', (document, position) => withModel(document, async (entry) =>
            toLocations(await ddsDefinition(entry.model, toMonacoPosition(entry, position)), entry, document))),
    }));
};
