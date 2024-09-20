const SETTING_IDB = "monaco-setting";

export const SettingLoad = async () => {
    let loadData = await idbKeyval.get(SETTING_IDB);
    if (loadData) {
        Setting = new localSetting(loadData);
    } else {
        Setting = new localSetting({});
    }
}

class localSetting {
    constructor(data) {
        this.theme = typeof (data.theme) === 'undefined' ? 0 : data.theme;
        this.diffTheme = typeof (data.diffTheme) === 'undefined' ? true : data.diffTheme;
        this.libraryList = typeof (data.libraryList) === 'undefined' ? {} : data.libraryList;
        this.initRead = typeof (data.initRead) === 'undefined' ? true : data.initRead;
        this.diffIndent = typeof (data.diffIndent) === 'undefined' ? true : data.diffIndent;

        const initRead_DOM = document.getElementById('control-initRead');
        initRead_DOM.checked = this.initRead;
        const initRead_diffIndent = document.getElementById('control-diffExtension');
        initRead_diffIndent.checked = this.diffIndent;
        const diffViewChange = document.getElementById('control-diffViewChange');
        diffViewChange.checked = this.diffTheme;
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

    save() {
        idbKeyval.set(SETTING_IDB, this);
    }
}

export let Setting = new localSetting({});

export const libraryListSave = () => {
    const settingLibraryList = document.getElementById('settingLibraryList');
    let inputText = settingLibraryList.value;
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