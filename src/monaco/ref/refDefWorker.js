// 参照先の検索を行う Web Worker。検索の中身は refDefSearch.js
import { searchRefDef } from "./refDefSearch.js";

const SETTING_IDB = "monaco-setting";
import { get } from 'idb-keyval';

let IsForceSJIS = false;
let isFirstload = true;

self.onmessage = async (event) => {
    if (isFirstload) {
        isFirstload = false;
        IsForceSJIS = await get(SETTING_IDB).then((data) => {
            if (data && data.isForceSJIS) {
                return data.isForceSJIS;
            } else {
                return false;
            }
        });
    }
    const otherData = await searchRefDef(event.data, IsForceSJIS);
    if (otherData === null) {
        return null;
    }
    self.postMessage(otherData);
};
