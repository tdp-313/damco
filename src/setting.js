import { get, set } from 'idb-keyval';
import { monaco_handleName, monaco_handleName_RefMaster, monaco_handleName_his, monaco_handleName_RefMaster_his } from "./root.js";
import { Directory_Handle_RegisterV2 } from "./monaco/file/directory.js";

const SETTING_IDB = "monaco-setting";

export const SettingLoad = async () => {
    let loadData = await get(SETTING_IDB);
    if (loadData) {
        Setting = new localSetting(loadData);
    } else {
        Setting = new localSetting({});
    }
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

        this.wakelock = typeof (data.wakelock) === 'undefined' ? true : data.wakelock;
        const initRead_DOM = document.getElementById('control-initRead');
        initRead_DOM.checked = this.initRead;

        const initRead_diffIndent = document.getElementById('control-diffExtension');
        initRead_diffIndent.checked = this.diffIndent;
        const diffViewChange = document.getElementById('control-diffViewChange');
        diffViewChange.checked = this.diffTheme;

        this.lastView = typeof (data.lastView) === 'undefined' ? { normal: {}, left: {}, right: {} } : data.lastView;

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