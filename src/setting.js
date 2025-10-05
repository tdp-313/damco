import { get, set } from 'idb-keyval';
import { monaco_handleName, monaco_handleName_RefMaster, monaco_handleName_his, monaco_handleName_RefMaster_his } from "./root.js";
import { Directory_Handle_RegisterV2 } from "./monaco/file/directory.js";
import { editorFontSizeChange } from './monaco/monaco_root.js';
const SETTING_IDB = "monaco-setting";

export const SettingLoad = async () => {
    let loadData = await get(SETTING_IDB);
    if (loadData) {
        Setting = new localSetting(loadData);
    } else {
        Setting = new localSetting({});
    }
}

export const uiSizeApply = (size) => {
    const root = document.documentElement;
    root.style.setProperty('--globalFontSize', size + 'px');
}

export const initPermissonCheck = async () => {
    await Directory_Handle_RegisterV2(monaco_handleName, false, 'read');
    await Directory_Handle_RegisterV2(monaco_handleName_his, false, 'read');

    await Directory_Handle_RegisterV2(monaco_handleName_RefMaster, false, 'read');
    await Directory_Handle_RegisterV2(monaco_handleName_RefMaster_his, false, 'read');
}

class localSetting {
    constructor(data) {
        this.theme = typeof (data.theme) === 'undefined' ? 0 : data.theme;
        this.diffTheme = typeof (data.diffTheme) === 'undefined' ? true : data.diffTheme;
        this.libraryList = typeof (data.libraryList) === 'undefined' ? {} : data.libraryList;
        this.initRead = typeof (data.initRead) === 'undefined' ? true : data.initRead;
        this.diffIndent = typeof (data.diffIndent) === 'undefined' ? true : data.diffIndent;
        this.inLayhint = typeof (data.inLayhint) === 'undefined' ? false : data.inLayhint;
        const extraRulerChange = document.getElementById('control-extraRuler');
        extraRulerChange.checked = this.inLayhint;

        this.wakelock = typeof (data.wakelock) === 'undefined' ? true : data.wakelock;
        const initRead_DOM = document.getElementById('control-initRead');
        initRead_DOM.checked = this.initRead;

        const initRead_diffIndent = document.getElementById('control-diffExtension');
        initRead_diffIndent.checked = this.diffIndent;
        const diffViewChange = document.getElementById('control-diffViewChange');
        diffViewChange.checked = this.diffTheme;

        this.DivRegExpPattern = typeof (data.DivRegExpPattern) === 'undefined' ? "" : data.DivRegExpPattern;
        this.SearchRefExpPattern = typeof (data.SearchRefExpPattern) === 'undefined' ? "" : data.SearchRefExpPattern;

        this.lastView = typeof (data.lastView) === 'undefined' ? { normal: {}, left: {}, right: {} } : data.lastView;
        this.uiSize = typeof (data.uiSize) === 'undefined' ? 16 : data.uiSize;
        this.editorFontSize = typeof (data.editorFontSize) === 'undefined' ? 16 : data.editorFontSize;
        uiSizeApply(this.uiSize);
        this.prompt = typeof (data.prompt) === 'undefined' ? "" : data.prompt;
        this.isSourceOutputFile = typeof (data.isSourceOutputFile) === 'undefined' ? false : data.isSourceOutputFile;
    }

    get getAll() {
        return this;
    }

    get getTheme() {
        return this.theme;
    }

    get getDiffTheme() {
        return this.diffTheme;
    }

    get getThemeType() {
        if (this.theme === 1) {
            return 'white';
        }
        else {
            return 'black';
        }
    }

    get getInitRead() {
        return this.initRead;
    }

    get getLastView() {
        return this.lastView;
    }

    getLibraryList(data) {
        if (Array.isArray(this.libraryList[data])) {
            return this.libraryList[data];
        } else {
            return [];
        }
    }

    get getWakeLock() {
        return this.wakelock;
    }

    get getSourceOutput() {
        return this.isSourceOutputFile;
    }

    get getPrompt() {
        return this.prompt
    }

    get getInLayhint() {
        return this.inLayhint;
    }

    set setTheme(theme) {
        this.theme = theme;
        this.save();
    }

    set setDiffTheme(theme) {
        this.diffTheme = theme;
        this.save();
    }

    set setLibList(LibList) {
        this.libraryList = LibList;
        this.save();
    }

    set setInitRead(init) {
        this.initRead = init;
        this.save();
    }

    set setdiffIndent(init) {
        this.diffIndent = init;
        this.save();
    }

    set setWakeLock(isLock) {
        this.wakelock = isLock;
        this.save();
    }

    set setUiSize(uiSize) {
        this.uiSize = Number(uiSize);
        uiSizeApply(this.uiSize);
        this.save();
    }

    set setSourceOutput(bool) {
        this.isSourceOutputFile = bool;
        this.save();
    }

    set setPrompt(prompt) {
        this.prompt = prompt
        this.save();
    }

    set setEditorFontSize(editorFontSize) {
        this.editorFontSize = Number(editorFontSize);
        editorFontSizeChange(this.editorFontSize);
        this.save();
    }

    set setInLayhint(isDisp) {
        this.inLayhint = isDisp;
        this.save();
    }

    saveRegExp(div, search) {
        this.DivRegExpPattern = div;
        this.SearchRefExpPattern = search;
        this.save();
    }

    saveLastView(target, data) {
        this.lastView[target] = data;
        this.save();
    }

    save() {
        set(SETTING_IDB, this);
    }
}

export let Setting = new localSetting({});

export const libraryListSave = () => {
    const settingLibraryList = document.getElementById('settingLibraryList');
    let inputText = settingLibraryList.value;
    if (inputText === "") {
        inputText = "{}";
    }
    isJSON(inputText);
}

export const regExpSave = () => {
    const settingDivRegExpPattern = document.getElementById('settingDivRegExpPattern');
    let divRegExp = settingDivRegExpPattern.value;
    const settingSearchRegExpPattern = document.getElementById('settingSearchRegExpPattern');
    let searchRegExp = settingSearchRegExpPattern.value;
    Setting.saveRegExp(divRegExp, searchRegExp);
}

const isJSON = (str) => {
    try {
        let data = JSON.parse(str);
        Setting.setLibList = data;
        console.debug(data);
    } catch (e) {
        window.alert(e);
        return;
    }
}