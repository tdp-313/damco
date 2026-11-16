import { getNormalEditor_Model } from "../textmodel.js";
import { monaco_handleName_RefMaster } from "../../root.js";
import { linkStatus } from "../file/directory.js";
import { readText_Model } from "../file/searchSrc.js";

// RefMaster のフォルダ。登録していなければ null
const refMasterHandle = () => {
    const status = linkStatus[monaco_handleName_RefMaster];
    return status && status.handle ? status.handle : null;
};

export const searchOpen = () => {
    const exLinkFile = document.getElementById('control-search-status');
    exLinkFile.addEventListener('click', async () => {

        let handle = refMasterHandle();
        if (handle === null) {
            return null;
        }
        let path = handle.name + "/";
        let now_model = await getNormalEditor_Model();
        let array_uri_path = now_model.uri.path.split('/').filter(str => str !== '');
        let preText = "";
        let libText = array_uri_path[0].substring(0, 3) + "*";
        if (array_uri_path.length === 3) {
            path += libText + "/" + array_uri_path[1] + "/";
        }
        let text = prompt('参照先から反映\n' + path, preText);
        if (text === null) {
            return null;
        }
        await readText_Model(array_uri_path[0] + "*", array_uri_path[1], text, handle, monaco_handleName_RefMaster);
    });
    exLinkFile.addEventListener('contextmenu', async (e) => {
        e.preventDefault();
        let handle = refMasterHandle();
        if (handle === null) {
            return null;
        }
        let path = handle.name + "/";
        let now_model = await getNormalEditor_Model();
        let array_uri_path = now_model.uri.path.split('/').filter(str => str !== '');
        let preText = "";
        if (array_uri_path.length === 3) {
            preText += array_uri_path[0] + "/" + array_uri_path[1] + "/";
        }
        let text = prompt('参照先から反映\n' + path, preText);
        if (text === null) {
            return null;
        }
        let result_array = text.split('/').filter(str => str !== '');
        if (result_array.length !== 3) {
            return null;
        }
        console.log(result_array[0], result_array[1], result_array[2]);
        await readText_Model(result_array[0], result_array[1], result_array[2], handle, monaco_handleName_RefMaster);
    });
} 