import { monaco_handleName, monaco_handleName_RefMaster, monaco_handleName_his, monaco_handleName_RefMaster_his } from "../../root.js";
import { Directory_Handle_RegisterV2 } from "../file/directory.js";
import { reload_Process } from "./header_button.js";

export const initReloadButton = () => {
    const modeChangeSync = document.getElementById('control-Reload');

    modeChangeSync.addEventListener('contextmenu', async (event) => {
        event.preventDefault();
        if (window.confirm('Update? FileSystemHandler(main)')) {
            await Directory_Handle_RegisterV2(monaco_handleName, true);
        }
        if (window.confirm('Update? FileSystemHandler(main-History)')) {
            await Directory_Handle_RegisterV2(monaco_handleName_his, true, 'read');
        }
        if (window.confirm('Update? FileSystemHandler(RefMaster)')) {
            await Directory_Handle_RegisterV2(monaco_handleName_RefMaster, true, 'read');
        }
        if (window.confirm('Update? FileSystemHandler(RefMaster-History)')) {
            await Directory_Handle_RegisterV2(monaco_handleName_RefMaster_his, true, 'read');
        }
        window.alert('If there is something wrong with the version update, reload with Shift + F5');
        window.location.reload();
        //fileReadStart(true);
    });

    modeChangeSync.addEventListener('click', async (event) => {
        reload_Process();
    });
}
