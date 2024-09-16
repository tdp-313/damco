import { file_read_text } from "../file/IO.js";

export const getFolderExistList_Text = async (List, target, file) => {
    for (let i = 0; i < List.length; i++) {
        if (List[i].name === target) {
            let file = await file_read_text(List[i].fullname, List[i].handle, false, 'text', false, false);
            let text = file.text;
            return {
                text: text, list: List[i], time: file.time
            };
        }
    }
    return null;
}