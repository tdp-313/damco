import { tabs_add } from "../../tabs.js";
import { getNormalEditor_Model } from "../textmodel.js";
import { Setting } from "../../setting.js";
import wakeLockOff from "../../icon/bedtime_on.svg"
import wakeLockOn from "../../icon/bedtime_off.svg"


export const otherTabsOpenInit = () => {
    const otherTabOpen = document.getElementById('control-otherTab');
    otherTabOpen.addEventListener('click', async () => {
        let model = await getNormalEditor_Model();
        tabs_add(model, true);
    });
    otherTabOpen.addEventListener('contextmenu', async (event) => {
        event.preventDefault();
        window.open(window.location.href, Math.random(), "popup");
    });
}

let wakeLock = null;
export const wakeLockInit = (isLock) => {
    const wakelockButton = document.getElementById('control-wakelock');
    wakelockButton.addEventListener('click', (e) => {
        let chageValue = !Setting.getWakeLock;
        Setting.setWakeLock = chageValue;
        wakeLockChange(Setting.getWakeLock);
    });
    document.addEventListener("visibilitychange", async () => {
        if (wakeLock !== null && document.visibilityState === "visible") {
            wakeLock = await navigator.wakeLock.request("screen");
        }
    });
    
    wakeLockChange(isLock);
}

export const wakeLockChange = async (isLock) => {
    const wakelockButton = document.getElementById('control-wakelock');
    if (wakelockButton.children.length !== 1) {
        return null;
    }
    let imgElem = wakelockButton.children[0];
    if (isLock) {
        imgElem.src = wakeLockOn;
        try {
            wakeLock = await navigator.wakeLock.request("screen");
          } catch (err) {
            console.log( `${err.name}, ${err.message}`);
          }
    } else {
        if (wakeLock !== null) {
            wakeLock.release().then(() => {
                wakeLock = null;
            });   
        }
        imgElem.src = wakeLockOff;
    }
}