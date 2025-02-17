self.onmessage = async (event) => {
    //input: { root: handle, lib: name, folder: name, file: name }
    const target = event.data.body;

    //lib
    let libHandle = null;
    for await (const [key, value] of target.root.entries()) {
        if (target.lib === key) {
            libHandle = value;
            break;
        }
    }
    if (libHandle === null) {
        self.postMessage({ type: "nodata", body: null });
        return;
    }

    //folder
    let folderHandle = null;
    for await (const [key, value] of libHandle.entries()) {
        if (target.folder === key) {
            folderHandle = value;
            break;
        }
    }
    if (folderHandle === null) {
        self.postMessage({ type: "nodata", body: null });
        return;
    }

    //member
    const fileArray = [];
    for await (const [key, value] of folderHandle.entries()) {
        const fileNameWithoutExtension = key.replace(/\.[^/.]+$/, "");
        if (target.file === fileNameWithoutExtension) {
            const filename = key.split('.');
            if (!isNaN(filename[1])) {
                let file = await value.getFile();
                fileArray.push({ name: filename[0], timestamp: await file.lastModifiedDate.toLocaleString(), version: Number(filename[1]), handle: value });
            }

        }
    }
    if (fileArray.length === 0) {
        self.postMessage({ type: "nodata", body: null });
        return;
    }

    fileArray.sort((a, b) => {
        if (a.version < b.version) return -1;
        if (a.version > b.version) return 1;
        return 0;
    });

    let fileMap = new Map()
    fileArray.forEach(element => {
        let key_name = element.version + "__" + element.timestamp;
        fileMap.set(key_name, element);
    });

    self.postMessage({ type: "history", body: fileMap });
};