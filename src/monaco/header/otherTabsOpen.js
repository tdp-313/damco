import { tabs_add } from "../../tabs.js";
import { getNormalEditor_Model } from "../textmodel.js";

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