
self.onmessage = async (event) => {
    if (event.data.type === 'fileOpen' || event.data.type === 'fileOpen_change') {
        self.postMessage({ type: event.data.type, body: await fileOpen(event.data.body) });
        return;
    }
    const fileDictionary = event.data.body;

    const fileArray = [];

    for await (const [key, value] of fileDictionary.entries()) {
        if (event.data.kind === value.kind) {
            const fileNameWithoutExtension = key.replace(/\.[^/.]+$/, "");
            fileArray.push({ name: fileNameWithoutExtension, handle: value, type: value.kind });
        }
    }

    fileArray.sort((a, b) => {
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
    });
    let fileMap = new Map()
    fileArray.forEach(element => {
        fileMap.set(element.name, element.handle);
    });
    self.postMessage({ type: event.data.type, body: fileMap });
};

const fileOpen = async (fileHandle) => {
    let file_obj = fileHandle;

    let file = await file_obj.getFile();
    let ext = '★';
    if (file.name.length > 3) {

        let nu_ext = file.name.substring(file.name.indexOf(".") + 1, file.name.length);
        if (!isNaN(Number(nu_ext))) {
            ext = Number(nu_ext);
            if (ext < 10) {
                ext = ext;
            }
        }
    }
    let lastModifiedTime = await file.lastModifiedDate.toLocaleString();

    let rtn = { timestamp: lastModifiedTime, text: "", encode: 'utf-8', ext: ext, handle: fileHandle };

    const response = await fetch(URL.createObjectURL(file));
    const arrayBuffer = await response.arrayBuffer();
    const decoderUTF = new TextDecoder('utf-8');
    const textUTF = decoderUTF.decode(arrayBuffer);
    let text = textUTF;
    if (textUTF.includes('�')) {
        const decoderJIS = new TextDecoder('Shift-JIS');
        const textJIS = decoderJIS.decode(arrayBuffer);
        if (!textJIS.includes('�')) {
            text = textJIS;
            rtn.encode = 'Shift-JIS';
        }
    }
    if (text === '') {
        return rtn;
    }
    rtn.text = text;
    return (rtn);

}