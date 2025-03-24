import { sidebarEventStart } from "./open.js";

import { tabs_add } from "../../tabs.js";
import { getNormalEditor_Model_URI, getNormalEditor_Model } from "../textmodel.js";
import { filterSettingUpdate } from "./sidebar.js";

export const rightSidebarRead = async () => {
  const r_sidebar_contents = document.getElementById('right-sideBar-contents');
  r_sidebar_contents.addEventListener('click', async (e) => {
    const selectedRadio = document.querySelector('input[name="rs-mode"]:checked');
    if (e.target.id.indexOf("sidebar-filter") !== -1) {
      if (typeof (e.target.checked) !== 'undefined') {
        filterSettingUpdate(e.target.id.substring(15, e.target.id.length), e.target.checked);
      }
      return null;
    }
    if (e.target.id === 'right-sideBar-contents' || selectedRadio.value === "setting") {
      return null;
    }
    let click_node = e.target.parentNode;
    let filename = click_node.getElementsByClassName('sidebar-filename')[0].innerText;
    let lfm = click_node.getElementsByClassName('sidebar-lfm')[0].innerText;
    let member = lfm.split("/")[3];
    let nowModel = await getNormalEditor_Model();
    let isRead = false;
    let model = null;
    
    let search_key = ["'" + filename + "'", filename];
    for (let i = 0; i < search_key.length; i++) {
      let mapValue = await nowModel.otherData.normalRefDef.get(search_key[i]);
      if (typeof (mapValue) !== 'undefined') {
        for (let p = 0; p < mapValue.length; p++){
          if(mapValue[p].location.uri.path.split('/')[3] === member){
            model = await getNormalEditor_Model_URI(mapValue[p].location.uri);
            isRead = true;
            break;
          }
        }
        break;
      }
    }
    if (isRead) {
      await tabs_add(model, true);
    }
  });
  sidebarEventStart();
}