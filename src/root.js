import { SettingLoad } from "./setting.js";
import { monacoStart } from "./monaco/monaco_root.js";
import { rightSidebarRead } from "./monaco/sidebar/sidebar_events.js";
import { readFileButtonCreate } from "./monaco/header/header_button.js";
import { tabs_eventStart } from "./tabs.js";

export const monaco_handleName = "monaco";
export const monaco_handleName_his = "monaco-his";
export const monaco_handleName_RefMaster = "monaco-ref";
export const monaco_handleName_RefMaster_his = "monaco-ref-his";
export const fileNameExt = 'txt';

window.onload = async () => {
    await SettingLoad();
    await monacoStart();
    await rightSidebarRead();
    readFileButtonCreate();
    await tabs_eventStart();
}