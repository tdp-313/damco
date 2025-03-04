import { pullDownEventMain } from "./newPulldown.js";
import { isFileSelectSync } from "../header/header_button.js";

export const pullDownEvent = () => {
    const fileFolderPulldown = document.querySelectorAll('.control-FileFolder-pulldown');
    fileFolderPulldown.forEach((pulldown) => {
        pulldown.addEventListener('change', async (e) => {
            let target = e.target.id.split("-");
            if (target.length !== 3) {
                return null;
            }
            if (target[2] === 'normal' || target[2] === 'left' || target[2] === 'right') {
                pullDownEventMain(target[1], target[2])
            }
            if (target[2] === 'left' || target[2] === 'right') {
                if (isFileSelectSync) {
                    let oppose = target[2] === 'left' ? 'right' : 'left';
                    //
                    pullDownEventMain(target[1], oppose, target[2]);
                    if (target[1] === 'Folder') {
                        var selectElement = document.getElementById('control-Folder-' + oppose);

                        // optionsの中から指定した値を持つoptionを探し、選択状態にします
                        for (var i = 0; i < selectElement.options.length; i++) {
                            if (selectElement.options[i].value === document.getElementById('control-Folder-' + target[2]).value) {
                                selectElement.selectedIndex = i;
                                break;
                            }
                        }
                    }
                }
            }
        });
    });

}