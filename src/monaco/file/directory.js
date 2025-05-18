import { get, set } from 'idb-keyval';
import { Setting } from '../../setting';
import { monaco_handleName_RefMaster } from '../../root';
export const Directory_Handle_RegisterV2 = async (name, isNew = false, rw_mode = 'readwrite') => {
    // Indexed Database から FileSystemDirectoryHandle オブジェクトを取得
    if (typeof linkStatus[name] === 'undefined') {
        linkStatus[name] = new linkStatusClass();
    }
    linkStatus[name].selectHandle = await get(name);
    if (linkStatus[name].selectHandle) {
        if (isNew) {
            linkStatus[name].selectHandle = await window.showDirectoryPicker();
        } else {
            // すでにユーザーの許可が得られているかをチェック
            let permission = await linkStatus[name].selectHandle.queryPermission({ mode: rw_mode });
            if (permission !== 'granted') {
                // ユーザーの許可が得られていないなら、許可を得る（ダイアログを出す）
                permission = await linkStatus[name].selectHandle.requestPermission({ mode: rw_mode });
                if (permission !== 'granted') {
                    linkStatus[name].selectHandle = await window.showDirectoryPicker();
                    if (!linkStatus[name].selectHandle) {
                        connect_dispNaviBar(false);
                        throw new Error('ユーザーの許可が得られませんでした。');
                    }
                }
            }
        }
    } else {
        // ディレクトリ選択ダイアログを表示
        console.warn(name + ' : not Registered');
        try {
            linkStatus[name].selectHandle = await window.showDirectoryPicker();
        } catch (error) {
            console.warn(error)
            return 'NG';
        }
    }

    linkStatus[name].ishandle = true;
    // FileSystemDirectoryHandle オブジェクトを Indexed Database に保存
    await set(name, linkStatus[name].selectHandle);
    if(Setting.isUsingOPFS && name === monaco_handleName_RefMaster){
        linkStatus[name].isOPFS = true;
        try {
            linkStatus[name].handle = await (await navigator.storage.getDirectory()).getDirectoryHandle(name);
            console.log('OPFS Enabled ->' + name);
        }
        catch {
            linkStatus[name].handle = linkStatus[name].selectHandle;
        }
    }
    else {
        linkStatus[name].handle = linkStatus[name].selectHandle;
    }
    return ('OK');
}

class linkStatusClass {
    constructor() {
        this.handle = null;
        this.ishandle = false;
        this.selectHandle = null;
        this.isOPFS = false;
    }
}

export let linkStatus = {}; 