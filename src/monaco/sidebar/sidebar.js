import { themeCSS_FilterStyle } from "../theme/theme.js";
import { Setting } from "../../setting.js";
import { get_langIcon } from "../../tabs.js";
import { UseIO_Layout } from "../ref/other.js";
import { libraryListSave, regExpSave } from "../../setting.js";
import { fileTypeGet2 } from "../file/fileType.js";
import { getNormalEditor_Model } from "../textmodel.js";

import databese_search_svg from "../../icon/database-search.svg"

const sidebar_mode_file = document.getElementById('rs-mode-file');

sidebar_mode_file.addEventListener('click', async (event) => {
    let model = await getNormalEditor_Model();
    await createUseFileList(model);
});

const sidebar_mode_def = document.getElementById('rs-mode-def');
sidebar_mode_def.addEventListener('click', async (event) => {
    let model = await getNormalEditor_Model();
    await createUseFileList(model);
});

const sidebar_mode_pgm = document.getElementById('rs-mode-pgm');
sidebar_mode_pgm.addEventListener('click', async (event) => {
    let model = await getNormalEditor_Model();
    await createUseFileList(model);
});

const sidebar_mode_setting = document.getElementById('rs-mode-setting');
sidebar_mode_setting.addEventListener('click', async (event) => {
    await createUseFileList(null);
});

export const createUseFileList = async (model) => {
    let refDef = null;
    if (model !== null) {
        refDef = model.otherData.normalRefDef;
    }

    let html = "";
    const sidebar_contents = document.getElementById('right-sideBar-contents');
    const selectedRadio = document.querySelector('input[name="rs-mode"]:checked');
    let mode = selectedRadio.value;
    sidebar_contents.innerHTML = "";
    let filter_style = themeCSS_FilterStyle();
    const get_template = (fileName, desc, library, langIcon, filter, use) => {
        if (use.io.size === 0) {
            let temp = "";
            temp += '<div id="sidebar-contents-' + fileName + ' " class="sidebar-contents hoverButton">';
            temp += '<img  class="refSize control-iconButton" style="filter: ' + filter + ';" src="' + langIcon + '">';
            temp += '<span class="sidebar-filename">' + fileName + '</span>';
            temp += '<span style="overflow: overlay; text-wrap: nowrap;">' + desc + '</span>';
            temp += '<span class="sidebar-lfm" style="font-size: 0.8rem; padding-left: 2rem;">' + library + '</span>';
            temp += '</div>';
            return (temp);
        } else {
            let border_class = "";
            let useStr = "";

            if (use.io.has("U") && use.io.has("O")) {
                useStr = "U/O";
                border_class = "output_border";
            } else if (use.io.has("I") && use.io.has("O")) {
                useStr = "I/O";
                border_class = "output_border";
            } else if (use.io.has("O")) {
                useStr = "O";
                border_class = "output_border";
            } else if (use.io.has("U")) {
                useStr = "U";
                border_class = "update_border";
            } else if (use.io.has("I")) {
                useStr = "I";
                border_class = "input_border";
            }

            let temp = "";
            temp += '<div id="sidebar-contents-' + fileName + ' " class="sidebar-contents hoverButton ' + border_class + '">';
            temp += '<img  class="refSize control-iconButton" style="filter: ' + filter + ';" src="' + langIcon + '">';
            temp += '<span class="sidebar-filename">' + fileName + '</span>';
            temp += '<span style="overflow: overlay; text-wrap: nowrap;">' + desc + '</span>';
            temp += '<span style="font-size: 0.8rem; justly-contents: center;">' + useStr + '</span>';
            temp += '<span class="sidebar-lfm" style="font-size: 0.8rem;">' + library + '</span>';
            temp += '</div>';
            return (temp);
        }
    }

    if (mode === 'file') {
        let existFile = [];
        //Filter Element Create
        html += '<div id="sidebar-filter-root">';
        if (filter.Ref) {
            html += '<span id="sidebar-filter"><input id="sidebar-filter-Ref" type="checkbox" checked/><label id="sidebar-filter" class="control-iconButton" for="sidebar-filter-Ref"><img id="sidebar-filter-svg" class="refSize control-iconButton" style="filter: ' + filter_style + ';" src="' + databese_search_svg + '" ></label></span>';
        } else {
            html += '<span id="sidebar-filter"><input id="sidebar-filter-Ref" type="checkbox"/><label id="sidebar-filter" class="control-iconButton" for="sidebar-filter-Ref"><img id="sidebar-filter-svg" class="refSize control-iconButton" style="filter: ' + filter_style + ';" src="' + databese_search_svg + '" ></label></span>';
        }
        if (filter.Input) {
            html += '<span id="sidebar-filter"><input id="sidebar-filter-Input" type="checkbox" checked/><label id="sidebar-filter" class="control-iconButton" for="sidebar-filter-Input">I</label></span>';
        } else {
            html += '<span id="sidebar-filter"><input id="sidebar-filter-Input" type="checkbox"/><label id="sidebar-filter" class="control-iconButton" for="sidebar-filter-Input">I</label></span>';
        }
        if (filter.Update) {
            html += '<span id="sidebar-filter"><input id="sidebar-filter-Update" type="checkbox" checked/><label id="sidebar-filter" class="control-iconButton" for="sidebar-filter-Update">U</label></span>';
        } else {
            html += '<span id="sidebar-filter"><input id="sidebar-filter-Update" type="checkbox"/><label id="sidebar-filter" class="control-iconButton" for="sidebar-filter-Update">U</label></span>';
        }
        if (filter.Output) {
            html += '<span id="sidebar-filter"><input id="sidebar-filter-Output" type="checkbox" checked/><label id="sidebar-filter" class="control-iconButton" for="sidebar-filter-Output">O</label></span>';
        } else {
            html += '<span id="sidebar-filter"><input id="sidebar-filter-Output" type="checkbox"/><label id="sidebar-filter" class="control-iconButton" for="sidebar-filter-Output">O</label></span>';
        }

        let filterContents = [];
        let maxFile = 0;

        //DSP
        refDef.forEach((value, key) => {
            // 第一引数にキーが、第二引数に値が渡される
            value.forEach((value) => {
                if (value.sourceType === 'file') {
                    let langType = fileTypeGet2(value.location.uri.path.split('/')[2]);
                    if (langType === 'dsp') {
                        maxFile++;
                        existFile.push(key);
                        filterContents.push(get_template(key, value.s_description, value.location.uri.path, get_langIcon(langType), filter_style, value.use));
                    }
                }
            })
        });
        for (let value of model.otherData.refListFile.dsp) {
            if (!existFile.includes(value[0])) {
                maxFile++;
                let notFoundFile = value[1];
                if (isDisplayCheck(notFoundFile.use)) {
                    notFoundFile.use.original = true;
                    filterContents.push(get_template(notFoundFile.name, "Not Found", "", get_langIcon("dsp", notFoundFile.use.original, notFoundFile.use.device), filter_style, notFoundFile.use));
                }
            };
        }

        //DDS
        refDef.forEach((value, key) => {
            // 第一引数にキーが、第二引数に値が渡される
            value.forEach((value) => {
                if (value.sourceType === 'file') {
                    let langType = fileTypeGet2(value.location.uri.path.split('/')[2]);
                    if (langType !== 'dsp') {
                        maxFile++;
                        existFile.push(key);
                        if (isDisplayCheck(value.use)) {
                            filterContents.push(get_template(key, value.s_description, value.location.uri.path, get_langIcon(langType, value.use.original, value.use.device), filter_style, value.use));
                        }
                    }
                }
            });
        });
        for (let value of model.otherData.refListFile.dds) {
            if (!existFile.includes(value[0])) {
                maxFile++;
                let notFoundFile = value[1];
                if (isDisplayCheck(notFoundFile.use)) {
                    notFoundFile.use.original = true;
                    filterContents.push(get_template(notFoundFile.name, "Not Found", "", get_langIcon("dds", notFoundFile.use.original, notFoundFile.use.device), filter_style, notFoundFile.use));
                }
            };
        }
        html += '<span id="sidebar-filter-count">' + filterContents.length + '/' + maxFile + '</span>';
        html += '</div>';
        for (let i = 0; i < filterContents.length; i++) {
            html += filterContents[i];
        }
    }

    if (mode === 'pgm') {
        let existFile = [];
        refDef.forEach((value, key) => {
            value.forEach((value) => {
                // 第一引数にキーが、第二引数に値が渡される
                if (value.sourceType === 'PGM') {
                    existFile.push(key.replace(/'/g, ""));
                    html += get_template(key.replace(/'/g, ""), value.s_description, value.location.uri.path, get_langIcon(fileTypeGet2(value.location.uri.path.split('/')[2])), filter_style, value.use);
                }
            });
        });
        for (let value of model.otherData.refListFile.pgm) {
            if (!existFile.includes(value[0])) {
                let notFoundFile = value[1];
                notFoundFile.use.original = true;
                html += get_template(notFoundFile.name, "Not Found", "", get_langIcon("pgm", notFoundFile.use.original, notFoundFile.use.device), filter_style, notFoundFile.use);
            };
        }
    }

    if (mode === 'def') {
        refDef.forEach((value, key) => {
            value.forEach((value) => {
                // 第一引数にキーが、第二引数に値が渡される
                if (value.sourceType === 'definition') {
                    let langType = fileTypeGet2(value.location.uri.path.split('/')[2]);
                    if (langType === 'dsp') {
                        html += get_template(key, value.s_description, value.location.uri.path, get_langIcon(langType), filter_style, new UseIO_Layout(true));
                    }
                }
            });
        });
        refDef.forEach((value, key) => {
            // 第一引数にキーが、第二引数に値が渡される
            value.forEach((value) => {
                if (value.sourceType === 'definition') {
                    let langType = fileTypeGet2(value.location.uri.path.split('/')[2]);
                    if (langType !== 'dsp') {
                        html += get_template(key, value.s_description, value.location.uri.path, get_langIcon(langType), filter_style, new UseIO_Layout(true));
                    }
                }
            });
        });
    }

    if (mode === 'setting') {
        html = "<h4>Library List Setting</h4>";
        html += "<div>Library List</div>";
        html += '<textarea id="settingLibraryList"rows="15" cols="41">' + JSON.stringify(Setting.libraryList) + '</textarea>';
        html += "<button id='settingLibrarySaveButton'>Save</button>";
        html += "<div>RegExp</div>";
        html += '<textarea id="settingDivRegExpPattern"rows="1" cols="41">' + Setting.DivRegExpPattern + '</textarea>';
        html += '<textarea id="settingSearchRegExpPattern"rows="1" cols="41">' + Setting.SearchRefExpPattern + '</textarea>';
        html += "<button id='settingRegExpSaveButton'>Save</button>";
        html += "<h4>Other Setting</h4>";
        html += '<div class="settingOther";>';
        html += '<label for="settingUISize">UI-Size</label><input type="number" id="settingUISize" max=48 min=4 step=0.1 value=' + Setting.uiSize + '></input>';
        html += '<label for="settingFontSize">Editor-FontSize</label><input type="number" id="settingFontSize" max=32 min=5 step=0.1 value=' + Setting.editorFontSize + '></input>';
        html += '<span>-</span><span></span>';
        html += '<label for="settingIsFileOutput">File Output</label><input type="checkbox" id="settingIsFileOutput" ';
        html += Setting.isSourceOutputFile ? 'checked />' : "/>";
        html += "</div>";
        html += '<div>Prompt</div>'
        html += ' ';
        html += '<textarea id="settingPrompt"rows="15" cols="41" placeholder="%{name} %{main} %{wstn} %{disk} %{pgm}">' + Setting.getPrompt + '</textarea>';
        html += "<button id='settingPromptSaveButton'>Save</button>";
    }
    sidebar_contents.innerHTML = html;
    const librarySaveButton = document.getElementById('settingLibrarySaveButton');
    const regExpSaveButton = document.getElementById('settingRegExpSaveButton');
    const promptSaveButton = document.getElementById('settingPromptSaveButton');
    const uiSizeChange = document.getElementById('settingUISize');
    const isFileOutputChange = document.getElementById('settingIsFileOutput');
    const editorFontSizeChange = document.getElementById('settingFontSize');
    if (mode === 'setting') {
        librarySaveButton.addEventListener('click', () => { libraryListSave() });
        regExpSaveButton.addEventListener('click', () => { regExpSave() });
        promptSaveButton.addEventListener('click', () => { Setting.setPrompt = document.getElementById('settingPrompt').value });
        uiSizeChange.addEventListener('change', (e) => { Setting.setUiSize = e.target.value });
        isFileOutputChange.addEventListener('change', (e) => { Setting.setSourceOutput = e.target.checked });
        editorFontSizeChange.addEventListener('change', (e) => { Setting.setEditorFontSize = e.target.value });
    }
}
let filter = { Input: true, Update: true, Output: true, Ref: true };

export const filterSettingUpdate = async (target, isFilter) => {
    filter[target] = isFilter;
    let model = await getNormalEditor_Model();
    createUseFileList(model);
}

export const isDisplayCheck = (useType) => {
    if (!filter.Ref) {
        if (!useType.original) {
            return false;
        }
    }
    if (useType.io.has("I") && filter.Input) {
        return true;
    }
    if (useType.io.has("U") && filter.Update) {
        return true;
    }
    if (useType.io.has("O") && filter.Output) {
        return true;
    }
    if (useType.io.size === 0) {
        return true;
    }
    return false;
}
