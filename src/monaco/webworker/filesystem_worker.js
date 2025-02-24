import { fileOpen } from './fileOpen.js';

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