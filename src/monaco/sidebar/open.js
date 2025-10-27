import upIcon from "../../icon/caret-up.svg"
import rightIcon from "../../icon/caret-right.svg"
import leftIcon from "../../icon/caret-left.svg"
import downIcon from "../../icon/caret-down.svg"

let useFileList_Open = false;
let extraControl = false;


export const sidebarEventStart = () => {
    const control_extraArea = document.getElementById('control-extraButton');
    control_extraArea.addEventListener('click', () => {
        const modeChangeCode = document.getElementById('control-EditorModeChange-code');
        if (modeChangeCode.checked) {
            if (useFileList_Open) {
                extraControlClick(extraControl, "close");
                useFileList_Open = false;
            } else {
                extraControlClick(extraControl, "open");
                useFileList_Open = true;
            }

            return null;
        }

        extraControlClick(extraControl);
        if (extraControl) {
            extraControl = false;
        } else {
            extraControl = true;
        }
    });
}

let lastStateMode = ""
export const extraControlClick = (open, mode = "") => {
    if (mode === 'prev') {
        if (lastStateMode === 'open') {
            mode = 'open';
        } else {
            mode = 'close';
        }
    }

    if (!open && mode !== 'init') {
        lastStateMode = mode;
    }

    const control_extraArea = document.getElementById('control-extraButton');
    let img = control_extraArea.querySelector("img");
    const control_extra = document.getElementById('control-subArea');
    const sidebar = document.getElementById('right-sideBar');
    const mainArea = document.getElementById('monaco-area');
    const tabArea = document.getElementById('monaco-tab');

    if (mode !== "") {
        if (mode === "open") {
            useFileList_Open = true;
            img.src = rightIcon;
            sidebar.classList.add("r-side-open");
            mainArea.classList.add("monaco-area-sidebar-open");
        } else {
            img.src = leftIcon;
            sidebar.classList.remove("r-side-open");
            mainArea.classList.remove("monaco-area-sidebar-open");
        }
        if (mode !== "init") {
            return;
        }
    }
    useFileList_Open = false;
    sidebar.classList.remove("r-side-open");
    mainArea.classList.remove("monaco-area-sidebar-open");
    mainArea.classList.add('monaco-area-tab-hidden');
    if (open) {
        tabArea.classList.add('displayHide');
        img.src = upIcon;
        if (!control_extra.classList.contains('close')) {
            control_extra.classList.add('close');
        }
    } else {
        if (mode === "init") {
            img.src = leftIcon;
            mainArea.classList.remove("monaco-area-tab-hidden");
            tabArea.classList.remove('displayHide');
        } else {
            img.src = downIcon;
        }
        if (control_extra.classList.contains('close')) {
            control_extra.classList.remove('close');
        }
    }
}