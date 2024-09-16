export const Directory_Handle_RegisterV2 = async (name, isNew = false, rw_mode = 'readwrite') => {
    // Indexed Database から FileSystemDirectoryHandle オブジェクトを取得
    if (typeof linkStatus[name] === 'undefined') {
        linkStatus[name] = new linkStatusClass;
    }
    linkStatus[name].handle = await idbKeyval.get(name);
    if (linkStatus[name].handle) {
        if (isNew) {
            linkStatus[name].handle = await window.showDirectoryPicker();
        } else {
            // すでにユーザーの許可が得られているかをチェック
            let permission = await linkStatus[name].handle.queryPermission({ mode: rw_mode });
            if (permission !== 'granted') {
                // ユーザーの許可が得られていないなら、許可を得る（ダイアログを出す）
                permission = await linkStatus[name].handle.requestPermission({ mode: rw_mode });
                if (permission !== 'granted') {
                    linkStatus[name].handle = await window.showDirectoryPicker();
                    if (!linkStatus[name].handle) {
                        connect_dispNaviBar(false);
                        throw new Error('ユーザーの許可が得られませんでした。');
                    }
                }
            }
        }
    } else {
        // ディレクトリ選択ダイアログを表示
        console.warn(name + ' : not Registered');
        return ('NG');
        //linkStatus[name].handle = await window.showDirectoryPicker();
    }
    linkStatus[name].ishandle = true;
    // FileSystemDirectoryHandle オブジェクトを Indexed Database に保存
    await idbKeyval.set(name, linkStatus[name].handle);
    return ('OK');
}

class linkStatusClass {
    constructor() {
      this.handle = null;
      this.ishandle = false;
    }
}
  
export let linkStatus = {}; 