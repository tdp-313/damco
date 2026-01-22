import { fileOpen } from './fileOpen.js';

self.onmessage = async (event) => {
    let uri = typeof (event.data.uri) === 'undefined' ? null : event.data.uri;
    let searchQuery = typeof (event.data.searchQuery) === 'undefined' ? null : event.data.searchQuery;
    if (event.data.type === 'fileOpen' || event.data.type === 'fileOpen_change') {
        self.postMessage({ type: event.data.type, body: await fileOpen(event.data.body), target: event.data.target, uri });
        return;
    } else if (event.data.type === 'fileSearch') {
        self.postMessage({ type: event.data.type, body: await fileSearch(event.data.body, searchQuery), target: event.data.target, uri });
        return
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
    self.postMessage({ type: event.data.type, target: event.data.target, body: fileMap, uri });
};

const fileSearch = async (fileHandle, searchQuery) => {
    let text = await fileOpen(fileHandle);
    // If all search queries are empty, return null
    if (searchQuery.every(query => query === "")) {
        return null;
    }

    let match = true;
    for (let i = 0; i < searchQuery.length; i++) {
        if (searchQuery[i] === "") continue; // Skip empty search queries
        
        let query = searchQuery[i];
        let reg;
        
        // Check if the query contains '%' characters for wildcard matching
        if (query.includes('%')) {
            // Convert SQL-like wildcards to regex
            // '%' matches any number of characters, '_' matches single character
            let regPattern = query
                .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
                .replace(/%/g, '.*') // Replace % with .*
                .replace(/_/g, '.'); // Replace _ with .
            reg = new RegExp(regPattern);
        } else {
            // Standard regex pattern
            reg = new RegExp(query);
        }
        
        if (!reg.test(text.text)) {
            match = false;
            break;
        }
    }
    return match ? text : null;
}
