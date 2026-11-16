import { cache_data } from "./filesystem_main";
import { fileTypeGet } from "../file/read";
import { createURI, modelChange } from "../textmodel";
import { get_langIcon } from "../../tabs.js";
import { themeCSS_FilterStyle } from "../theme/theme.js";

import { addIndent, addSpaces } from "../file/text_extend";
import { escapeHtml } from "../sidebar/escape.js";

export let SearchPGM = new Map()

export const SearchStart = async () => {
    let libHandle = cache_data.normal.folder;
    filesystem_worker.postMessage({ type: 'lib-folder', body: libHandle, target: 'folder-file', kind: 'directory' });
    SearchPGM.clear();
    searchCount = 0;
    processCount = 0;
    foundCount = 0;
}

const filesystem_worker = new Worker(new URL('./filesystem_worker.js', import.meta.url), {
    type: 'module',
})

let searchCount = 0;
let processCount = 0;
let foundCount = 0;
filesystem_worker.addEventListener(
    "message",
    async (e) => {
        const folderElem = document.getElementById("Search-Folder-normal");
        const input_1 = document.getElementById("sidebar-searchInput-1");
        const input_2 = document.getElementById("sidebar-searchInput-2");
        let searchQuery = [input_1.value, input_2.value];
        let folderVal = [];
        for (let i = 0; i < folderElem.length; i++) {
            if (folderElem.options[i].selected) {
                folderVal.push(folderElem.options[i].value);
            }
        }
        let rootName = cache_data.normal.rootName;

        let searchFolder = [];
        const processElem = document.getElementById("sidebar-searchProcess");
        const countElem = document.getElementById("sidebar-searchCount");
        const foundElem = document.getElementById("sidebar-searchFound");
        switch (e.data.type) {
            case 'lib-folder':
                searchFolder = [];
                for (const [key, value] of e.data.body.entries()) {
                    if (folderVal.includes(key)) {
                        searchFolder.push({
                            uri: {
                                root: rootName,
                                lib: document.getElementById('control-Library-' + 'normal').value,
                                folder: key
                            }, handle: value
                        });
                    }
                }

                for (let i = 0; i < searchFolder.length; i++) {
                    filesystem_worker.postMessage({ type: 'folder-file', body: searchFolder[i].handle, target: 'fileOpen', kind: 'file', uri: searchFolder[i].uri });
                }
                break;
            case 'folder-file':

                for (const [key, value] of e.data.body.entries()) {
                    searchCount++;
                    filesystem_worker.postMessage({ type: 'fileSearch', body: value, target: 'render', kind: 'file', uri: e.data.uri, searchQuery });
                }

                if (typeof (countElem) !== 'undefined' && typeof (countElem.innerHTML) !== 'undefined') {
                    countElem.innerHTML = searchCount;
                }

                if (typeof (processElem) !== 'undefined' && typeof (processElem.innerHTML) !== 'undefined') {
                    processElem.innerHTML = processCount;
                }
                if (typeof (foundElem) !== 'undefined' && typeof (foundElem.innerHTML) !== 'undefined') {
                    foundElem.innerHTML = '(' + foundCount + ')';
                }
                break;
            case 'fileSearch':
                processCount++;
                if (typeof (processElem) !== 'undefined' && typeof (processElem.innerHTML) !== 'undefined') {
                    processElem.innerHTML = processCount;
                }
                if (e.data.body !== null) {
                    foundCount++;
                    if (typeof (foundElem) !== 'undefined' && typeof (foundElem.innerHTML) !== 'undefined') {
                        foundElem.innerHTML = '(' + foundCount + ')';
                    }
                    //Read TextModel
                    let textRaw = e.data.body;

                    // optionsの中から指定した値を持つoptionを探し、選択状態にします

                    let nowReadHandle = {
                        root: e.data.uri.root,
                        lib: e.data.uri.lib,
                        folder: e.data.uri.folder,
                        file: e.data.body.handle.name.replace(/\.[^/.]+$/, ""),
                        lang: "",
                        formattedText: "",
                        extTimestamp: textRaw.ext + "__" + textRaw.timestamp
                    }
                    nowReadHandle.lang = fileTypeGet(nowReadHandle.folder, true);

                    let indent = true;


                    if (nowReadHandle.lang.indexOf("indent") !== -1 && indent) {
                        nowReadHandle.formattedText = await addIndent(textRaw.text);
                    } else {
                        if (nowReadHandle.lang === 'rpg-indent') {
                            nowReadHandle.lang = 'rpg';
                        }
                        nowReadHandle.formattedText = addSpaces(textRaw.text);
                    }
                    let uri = await createURI(nowReadHandle.root, nowReadHandle.lib, nowReadHandle.folder, nowReadHandle.file, nowReadHandle.extTimestamp, nowReadHandle.lang);
                    let model = await modelChange(nowReadHandle.formattedText, nowReadHandle.lang, uri);
                    //End
                    // 同じ名前のメンバーが別のソースファイルにもあるので、場所(/ライブラリ/ソースファイル/メンバー)で覚える
                    SearchPGM.set(model.uri.path, model);
                    createView();
                }
                if (processCount === searchCount) {
                    createView();
                }
                break;
            default:
                console.warn(e.data)
                break;
        }
    }
);

filesystem_worker.addEventListener(
    "error",
    (e) => {
        console.error(e);
    },
    false
);
window.SearchPGM = SearchPGM;
export const createView = async () => {
    const searchContents = document.getElementById('searchContents');
    const processElem = document.getElementById("sidebar-searchProcess");
    const countElem = document.getElementById("sidebar-searchCount");
    const foundElem = document.getElementById("sidebar-searchFound");
    try {
        if (typeof (countElem) !== 'undefined' && typeof (countElem.innerHTML) !== 'undefined') {
            countElem.innerHTML = searchCount;
        }

        if (typeof (processElem) !== 'undefined' && typeof (processElem.innerHTML) !== 'undefined') {
            processElem.innerHTML = processCount;
        }
        if (typeof (foundElem) !== 'undefined' && typeof (foundElem.innerHTML) !== 'undefined') {
            foundElem.innerHTML = '(' + foundCount + ')';
        }
        if (searchContents) {
            searchContents.innerHTML = "";
            let filter_style = themeCSS_FilterStyle();
            let temp = "";
            // 複数のソースファイルから見つかったときは、どのソースファイルかも出す
            const folders = new Set();
            SearchPGM.forEach((model) => folders.add(model.uri.path.split('/')[2]));
            SearchPGM.forEach((model, key) => {
                let langType = model.getLanguageId(); // Get language from the model
                let icon = get_langIcon(langType);
                let fileName = escapeHtml(model.uri.path.split('/')[3]);

                let useStr = "-";
                let desc = document.getElementById("sidebar-searchInput-2").value === "" ? document.getElementById("sidebar-searchInput-1").value : document.getElementById("sidebar-searchInput-1").value + ", " + document.getElementById("sidebar-searchInput-2").value;
                desc = escapeHtml((folders.size > 1 ? model.uri.path.split('/')[2] + ' : ' : '') + desc);
                const border_class = 'input_border';

                temp += '<div id="sidebar-contents-' + fileName + ' " class="sidebar-contents hoverButton ' + border_class + '"style="grid-template-rows:1.2rem 0">';
                temp += '<img  class="refSize control-iconButton" style="filter: ' + filter_style + ';" src="' + icon + '">';
                temp += '<span class="sidebar-filename">' + fileName + '</span>';
                temp += '<span style="overflow: overlay; text-wrap: nowrap;">' + desc + '</span>';
                temp += '<span style="font-size: 0.8rem; justly-contents: center;display:none">' + useStr + '</span>';
                temp += '<span class="sidebar-lfm" style="font-size: 0.8rem;display:none">' + escapeHtml(model.uri.path) + '</span>';
                temp += '</div>';

            });
            searchContents.innerHTML += temp;
        }
    } catch (error) {

    }
}
export const SearchExportClipboard = () => {
    let exportText = "";
    let desc = document.getElementById("sidebar-searchInput-2").value === "" ? document.getElementById("sidebar-searchInput-1").value : document.getElementById("sidebar-searchInput-1").value + "\t" + document.getElementById("sidebar-searchInput-2").value;
    for (const model of SearchPGM.values()) {
        exportText += model.uri.path.split('/')[3] + "\t" + desc + "\n";
    }
    navigator.clipboard.writeText(exportText);
    window.alert("Copied to clipboard!");

        
}