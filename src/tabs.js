import { fileTypeGet2 } from "./monaco/file/read.js";
import { refDefStart } from "./monaco/ref/init.js";
import { getNormalEditor_Model, getNormalEditor_View, setNormalEditor_Model, setNormalEditor_View } from "./monaco/textmodel.js";
import { themeCSS_FilterStyle } from "./monaco/theme/theme.js";
import x_svg from "./icon/x.svg"
import print_svg from "./icon/print.svg"
import database_svg from "./icon/database.svg"
import databese_search_svg from "./icon/database-search.svg"
import terminal_2_svg from "./icon/terminal-2.svg"
import letter_r_svg from "./icon/letter-r.svg"
import hash_svg from "./icon/hash.svg"
import code_asterix_svg from "./icon/code-asterix.svg"

export const tabs = new Map();

export const tabs_eventStart = async () => {
    document.getElementById('monaco-tab').addEventListener('click', async (e) => {
        if (e.target.tagName === 'INPUT' && e.target.type === 'radio') {
            let now_model = await getNormalEditor_Model();
            let now_view = await getNormalEditor_View();
            let id = now_model.id;

            let select_tabs_general = await tabs.get("*");
            if (typeof (select_tabs_general) !== 'undefined') {
                if (select_tabs_general.model.id === now_model.id) {
                    tabs.set("*", { model: now_model, view: now_view });
                    if (tabs.has(now_model.id)) {
                        tabs.set(now_model.id, { model: now_model, view: now_view });
                    }
                } else {
                    if (tabs.has(now_model.id)) {
                        tabs.set(now_model.id, { model: now_model, view: now_view });
                    }
                }
            }
            let select_tabs_MAP = await tabs.get(e.target.value);
            if (typeof (select_tabs_MAP) !== 'undefined') {
                await setNormalEditor_Model(select_tabs_MAP.model);
                await setNormalEditor_View(select_tabs_MAP.view);
                await refDefStart(select_tabs_MAP.model);
            }
        }

        if (e.target.tagName === 'IMG' && e.target.src.indexOf("x.svg") !== -1) {
            const selectedRadio = document.querySelector('input[name="rs-tab"]:checked');
            let li = e.target.parentNode.parentNode;
            if (li.getElementsByClassName('tab-item')[0].innerText === selectedRadio.value) {
                let nextTabID = "";
                let nextTabValue = null;
                const entries = [];
                for (const [key, value] of tabs.entries()) {
                    entries.push(key);
                }
                for (let i = 0; i < entries.length; i++) {
                    if (entries[i] === selectedRadio.value) {
                        if (i === 0) {
                            if (entries.length === 1) {
                                break;
                            }
                            nextTabID = entries[i + 1];
                            nextTabValue = tabs.get(nextTabID);
                        } else {
                            nextTabID = entries[i - 1];
                            nextTabValue = tabs.get(nextTabID);
                        }
                        const next_input = document.getElementById('monaco-tab-' + nextTabID);
                        next_input.checked = true;
                        await setNormalEditor_Model(nextTabValue.model);
                        await refDefStart(nextTabValue.model);
                        break;
                    }
                }
            } else {
                selectedRadio.checked = true;
            }
            tabs.delete(li.getElementsByClassName('tab-item')[0].innerText)
            li.remove();
        }
    });
}

export const tabs_add = async (model, new_data) => {
    await refDefStart(model);
    let id = "";
    let path = model.uri.path;
    let pathA = path.split("/");
    let file = ""
    let name = ""//path.substring(path.lastIndexOf("/") + 1, path.lastIndexOf(".") === -1 ? path.length : path.lastIndexOf("."));
    if (pathA.length === 4) {
        file = pathA[2];
        name = pathA[3];
    }
    let lang_icon = "";

    let versionText = model.uri.query.substring(model.uri.query.indexOf("=") + 1, model.uri.query.length);
    versionText = versionText.substring(0, versionText.indexOf("_"));

    if (new_data) {//その他
        id = model.id;
        lang_icon = get_langIcon(fileTypeGet2(file));
    }
    else {//*の更新
        id = "*"
        lang_icon = get_langIcon("")
    }
    //Prev Save
    let now_model = await getNormalEditor_Model();
    let now_view = await getNormalEditor_View();

    let select_tabs_general = await tabs.get("*");
    if (typeof (select_tabs_general) !== 'undefined') {
        if (select_tabs_general.model.id === now_model.id) {
            tabs.set("*", { model: now_model, view: now_view });
        } else {
            if (tabs.has(now_model.id)) {
                tabs.set(now_model.id, { model: now_model, view: now_view });
            }
        }
    }

    let tab_check = await tabs.get(id);
    const input_dom = document.getElementById('monaco-tab-' + id);
    if (typeof (tab_check) !== 'undefined' && input_dom !== null) {
        if (new_data) {
            await setNormalEditor_Model(tab_check.model);
            await setNormalEditor_View(tab_check.view);
        } else {
            await setNormalEditor_Model(model);
            const libnameArea = input_dom.parentNode.getElementsByClassName('tab-libnameArea')[0];
            libnameArea.innerHTML = "";
            let pgmName = document.createElement('span');
            pgmName.textContent = name;
            pgmName.classList.add("tab-pgmName");
            libnameArea.appendChild(pgmName);

            let pathArea = document.createElement('span');
            pathArea.textContent = path;
            pathArea.classList.add("tab-libnameText");
            libnameArea.appendChild(pathArea);

            let versionArea = document.createElement('span');
            versionArea.textContent = versionText;
            versionArea.classList.add("tab-versionInfo");
            libnameArea.appendChild(versionArea);
            tabs.set(id, { model: model, view: await setNormalEditor_View() });
        }
        input_dom.checked = true;
        return null;
    }
    let filter_style = themeCSS_FilterStyle();

    const tabs_html = (name, id, lang, path, filter, versionText) => {
        let li = document.createElement("li");
        let temp = "";
        temp += '<input type="radio" class="displayHide" id="monaco-tab-' + id + '" name="rs-tab" value="' + id + '" checked></input>';
        temp += '<label for="monaco-tab-' + id + '" class="tab-design">';
        temp += '<img class="refSize" style="width: 1rem; filter:' + filter + ' " src="' + lang + '">';
        temp += '<span class="tab-libnameArea">';
        temp += '<span class="tab-pgmName">' + name + '</span>';
        temp += '<span class="tab-libnameText">' + path.substring(1, path.lastIndexOf('/')) + '</span>';
        temp += '<span class="tab-versionInfo">' + versionText + '</span>';
        temp += '</span>'
        temp += '<img class="refSize control-iconButton" style="width: 1.5rem;filter:' + filter + '" src=' + x_svg + '>';
        temp += '<span class="tab-item" style="display: none;">' + id + '</span>';
        temp += '</label>';
        li.innerHTML = temp;
        li.draggable = true;
        li.classList.add('tabLayout');
        return li;
    }
    await setNormalEditor_Model(model);
    const tabs_dom = document.getElementById('monaco-tab');

    let dom_li = tabs_html(name, id, lang_icon, path, filter_style, versionText);
    tabs_dom.appendChild(dom_li);
    tabs.set(id, { model: model, view: await setNormalEditor_View() });
}

export const get_langIcon = (langType, original = true, device = "", iconPath = true) => {
    let lang_icon = "";
    if (langType === 'dds') {
        if (device === "PRINTER") {
            lang_icon = iconPath ? print_svg : 'print';
        } else {
            if (original) {
                lang_icon = iconPath ? database_svg : 'database';
            } else {
                lang_icon = iconPath ? databese_search_svg : 'database-search';
            }
        }

    } else if (langType === 'dsp') {
        lang_icon = iconPath ? terminal_2_svg : 'terminal-2';
    } else if (langType === 'rpg' || langType === 'rpgle') {
        lang_icon = iconPath ? letter_r_svg : 'letter-r';
    } else if (langType === 'cl') {
        lang_icon = iconPath ? hash_svg : 'hash';
    } else {
        lang_icon = iconPath ? code_asterix_svg : 'code-asterix';
    }
    return (lang_icon);
}