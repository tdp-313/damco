import { tabs_add } from "../../tabs.js";
import { getNormalEditor_Model } from "../textmodel.js";
import { Setting } from "../../setting.js";
import wakeLockOff from "../../icon/bedtime_on.svg"
import wakeLockOn from "../../icon/bedtime_off.svg"
import { nowReadFilePath } from "../webworker/filesystem_main.js";
import { sourceExportClipboard } from "../ref/exportSource.js";

export const otherTabsOpenInit = () => {
    const otherTabOpen = document.getElementById('control-otherTab');
    otherTabOpen.addEventListener('click', async () => {
        let model = await getNormalEditor_Model();
        tabs_add(model, true);
    });
    otherTabOpen.addEventListener('contextmenu', async (event) => {
        event.preventDefault();
        otherTabOpenEvent();
    });

    const otherDiffTabOpen = document.getElementById('control-extraLinkFile');
    otherDiffTabOpen.addEventListener('click', async () => {
        let model = await getNormalEditor_Model();
        sourceExportClipboard(model)
        if (!Setting.getSourceOutput) {
            const popup = document.createElement('div');
            popup.textContent = 'Copied Link!';
            popup.style.cssText = `
            position: absolute;
            background-color: #797979ff;
            color: #fff;
            padding: 0.2rem 0.3rem;
            border-radius: 0.3rem;
            font-size: 0.8rem;
            left: 50%;
            transform: translateX(-50%);
            white-space: nowrap;
            z-index: 1000;
            top: 1.5rem;
        `;
            event.target.parentNode.style.position = 'relative';
            event.target.parentNode.appendChild(popup);

            setTimeout(() => {
                popup.remove();
            }, 1000);

        }
    });

    otherDiffTabOpen.addEventListener('contextmenu', async (event) => {
        event.preventDefault();
        otherTabOpenEvent('clipboard');

        const popup = document.createElement('div');
        popup.textContent = 'Copied Link!';
        popup.style.cssText = `
            position: absolute;
            background-color: #797979ff;
            color: #fff;
            padding: 0.2rem 0.3rem;
            border-radius: 0.3rem;
            font-size: 0.8rem;
            left: 50%;
            transform: translateX(-50%);
            white-space: nowrap;
            z-index: 1000;
            top: 1.5rem;
        `;
        event.target.parentNode.style.position = 'relative';
        event.target.parentNode.appendChild(popup);

        setTimeout(() => {
            popup.remove();
        }, 1000);

    });
}

export const otherTabOpenEvent = (mode = 'tabOpen') => {
    let url = new URL(window.location.href);
    const modeChangeCode = document.getElementById('control-EditorModeChange-code');
    const modeChangeDiff = document.getElementById('control-EditorModeChange-diff');
    if (modeChangeCode.checked) {
        url.searchParams.set('init', 'code');
        let nowRead = nowReadFilePath('normal');
        url.searchParams.set('prevView', JSON.stringify(nowRead));
    }
    if (modeChangeDiff.checked) {
        let nowRead = { left: nowReadFilePath('left'), right: nowReadFilePath('right') };
        url.searchParams.set('prevView', JSON.stringify(nowRead));
        url.searchParams.set('init', 'diff');
    }
    if (mode === 'tabOpen') {
        window.open(url, Math.random(), "popup");
    } else if (mode === 'clipboard') {
        navigator.clipboard.writeText(url.toString());
    }
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
            console.log(`${err.name}, ${err.message}`);
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