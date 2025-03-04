import { sendDirectoryHandleToWorker, cache_data } from '../webworker/filesystem_main.js';

export const pullDownEventMain = async (id, target, sync = target) => {
    switch (id) {
        case 'Library':
            const Lib = document.getElementById('control-Library-' + target);
            sendDirectoryHandleToWorker(cache_data[target].lib.get(Lib.value), 'lib-folder', target);
            return 'Library';
        case 'Folder':
            const Folder = document.getElementById('control-Folder-' + sync);
            if (await cache_data[target].folder.has(Folder.value)) {
                sendDirectoryHandleToWorker(cache_data[target].folder.get(Folder.value), 'folder-file', target, 'file');
            }
            return 'Folder';
        case 'File':
            const File = document.getElementById('control-File-' + sync);
            if (await cache_data[target].file.has(File.value)) {
                sendDirectoryHandleToWorker(await cache_data[target].file.get(File.value), 'fileOpen', target);
            }
            return 'File';
        case 'Version':
            const Version = document.getElementById('control-Version-' + sync);
            sendDirectoryHandleToWorker(await cache_data[target].version.get(Version.value).handle, 'fileOpen_change', target);
            return 'Version';

        default:
    }
}

export const populatePulldown = async (create_target, fileList, selected = '', optGrouop = false) => {
    let beforeOptGroupCategory = "";
    let beforeOptElem = null;
    let perfectMatch = false;
    let count = 0;
    create_target.innerHTML = '';
    fileList.forEach((value, key) => {
        let insert = document.createElement('option');
        count++;
        insert.value = key;
        insert.text = key;
        if (selected === key) {
            insert.selected = true;
            perfectMatch = true;
        }
        if (selected.length > 3 && key.length > 3) {
            if (selected.substring(0, 3) === key.substring(0, 3) && !perfectMatch) {
                insert.selected = true;
            }
        }
        if (optGrouop) {
            let preID = key.substring(0, 2);
            if (preID !== beforeOptGroupCategory) {
                if (beforeOptGroupCategory !== "") {
                    create_target.appendChild(beforeOptElem);
                }
                beforeOptElem = document.createElement('optgroup');
                beforeOptElem.label = preID;
                beforeOptGroupCategory = preID;
            }
            beforeOptElem.appendChild(insert);
        } else {
            create_target.appendChild(insert);
        }
    });

    if (beforeOptGroupCategory !== "") {
        create_target.appendChild(beforeOptElem);
    }

    if (create_target.id.indexOf('Version') !== -1) {
        if (count === 1) {
            create_target.style.display = 'none';
        } else {
            create_target.style.display = 'block';
        }
    }
}