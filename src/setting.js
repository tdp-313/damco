import { get, set } from 'idb-keyval';
import { monaco_handleName, monaco_handleName_RefMaster, monaco_handleName_his, monaco_handleName_RefMaster_his } from "./root.js";
import { Directory_Handle_RegisterV2 } from "./monaco/file/directory.js";
import { opfsWorkerRegister } from './monaco/opfs/opfs_main.js';

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
        this.isUsingOPFS = typeof (data.isUsingOPFS) === 'undefined' ? false : data.isUsingOPFS;
        this.lastOPFS_Update = typeof (data.lastOPFS_Update) === 'undefined' ? new Date(0) : new Date(data.lastOPFS_Update);

        this.OPFS_run();
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

    set setIsUsingOPFS(isUsing) {
        this.isUsingOPFS = isUsing;
        this.save();
        if (isUsing) {
            this.OPFS_run();
        } else {
            this.lastOPFS_Update = new Date(0);
            this.save();
        }

    }

    set setLastOPFS_Update(time) {
        this.lastOPFS_Update = time.toISOString();
        this.save();
    }

    get getlastOPFS_Update() {
        return new Date(this.lastOPFS_Update);
    }

    OPFS_run() {
        let today = new Date();
        if (this.isUsingOPFS && this.getlastOPFS_Update.toDateString() !== today.toDateString()) {
            opfsWorkerRegister(monaco_handleName_RefMaster);
        }
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