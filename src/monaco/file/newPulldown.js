import { sendDirectoryHandleToWorker, cacheNormal } from '../webworker/filesystem_main.js';

export const pullDownEventMain = async (id) => {
    let id_type = id.split('-');

    switch (id_type[1]) {
        case 'Library':
            const Lib = document.getElementById('control-Library-normal');
            sendDirectoryHandleToWorker(cacheNormal.lib.get(Lib.value), 'lib-folder');
            return 'Library';
        case 'Folder':
            const Folder = document.getElementById('control-Folder-normal');
            sendDirectoryHandleToWorker(cacheNormal.folder.get(Folder.value), 'folder-file', 'file');
            return 'Folder';
        case 'File':
            const File = document.getElementById('control-File-normal');
            sendDirectoryHandleToWorker(await cacheNormal.file.get(File.value), 'fileOpen');
            return 'File';
        case 'Version':
            const Version = document.getElementById('control-Version-normal');
            sendDirectoryHandleToWorker(await cacheNormal.version.get(Version.value).handle, 'fileOpen_change');
            return 'Version';

        default:
    }
}

export const populatePulldown = async (create_target, fileList, selected = '', optGrouop = false) => {
    let beforeOptGroupCategory = "";
    let beforeOptElem = null;
    create_target.innerHTML = '';
    fileList.forEach((value, key) => {
        let insert = document.createElement('option');
        insert.value = key;
        insert.text = key;
        if (selected === key) {
            insert.selected = true;
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
}