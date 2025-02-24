import { linkStatus } from "../file/directory.js";
import { monaco_handleName, monaco_handleName_RefMaster, monaco_handleName_his, monaco_handleName_RefMaster_his } from "../../root.js";
import { Directory_Handle_RegisterV2 } from "../file/directory.js";
import { populatePulldown } from "../file/newPulldown.js";
import { createURI } from "../textmodel.js";
import { fileTypeGet } from "../file/read.js";
import { addIndent, addSpaces } from "../file/text_extend.js";
import { modelChange } from "../textmodel.js";

import { tabs_add } from "../../tabs.js";

const filesystem_worker = new Worker(new URL('./filesystem_worker.js', import.meta.url), {
  type: 'module',
})

const history_worker = new Worker(new URL('./history_worker.js', import.meta.url), {
  type: 'module',
})

export const cacheNormal = { root: null, rootName: "", lib: null, folder: null, file: null, version: new Map() };
window.cacheNormal = cacheNormal;

export class initOpenCache_Layout {
  constructor(data) {
    this.root = typeof (data.root) === "undefined" ? monaco_handleName : data.root;
    this.lib = typeof (data.lib) === "undefined" ? "" : data.lib;
    this.folder = typeof (data.folder) === "undefined" ? "" : data.folder;
    this.file = typeof (data.file) === "undefined" ? "" : data.file;
    if (this.root === monaco_handleName) {
      this.history = monaco_handleName_his;
    } else if (this.root === monaco_handleName_RefMaster) {
      this.history = monaco_handleName_RefMaster_his;
    }
  }
}

let initOpenCache = null;

export const headerFileListCreate = async (initOpen = {}) => {
  //root handle permission check
  initOpenCache = new initOpenCache_Layout(initOpen);
  await Directory_Handle_RegisterV2(initOpenCache.root, false, 'read');
  cacheNormal.root = linkStatus[initOpenCache.root].handle;
  cacheNormal.rootName = initOpenCache.root;
  sendDirectoryHandleToWorker(linkStatus[initOpenCache.root].handle, 'root-lib');
}

filesystem_worker.addEventListener(
  "message",
  async (e) => {
    switch (e.data.type) {
      case 'root-lib':
        const Lib = document.getElementById('control-Library-normal');
        cacheNormal.lib = e.data.body;
        await populatePulldown(Lib, cacheNormal.lib, Lib.value);
        sendDirectoryHandleToWorker(await cacheNormal.lib.get(Lib.value), 'lib-folder');
        break;
      case 'lib-folder':
        const Folder = document.getElementById('control-Folder-normal');
        cacheNormal.folder = e.data.body;
        await populatePulldown(Folder, cacheNormal.folder, Folder.value);
        sendDirectoryHandleToWorker(await cacheNormal.folder.get(Folder.value), 'folder-file', "file");
        break;
      case 'folder-file':
        const File = document.getElementById('control-File-normal');
        cacheNormal.file = e.data.body;
        await populatePulldown(File, cacheNormal.file, File.value, true);
        sendDirectoryHandleToWorker(await cacheNormal.file.get(File.value), 'fileOpen');
        break
      case 'fileOpen':
      case 'fileOpen_change':
        let textRaw = e.data.body;
        let nowReadHandle = {
          root: cacheNormal.rootName,
          lib: document.getElementById('control-Library-normal').value,
          folder: document.getElementById('control-Folder-normal').value,
          file: document.getElementById('control-File-normal').value,
          lang: "",
          formattedText: "",
          extTimestamp: textRaw.ext + "__" + textRaw.timestamp
        }
        nowReadHandle.lang = fileTypeGet(nowReadHandle.folder, true);
        let uri = await createURI(nowReadHandle.root, nowReadHandle.lib, nowReadHandle.folder, nowReadHandle.file, nowReadHandle.extTimestamp, nowReadHandle.lang);
        if (nowReadHandle.lang.indexOf("indent") !== -1) {
          nowReadHandle.formattedText = await addIndent(textRaw.text);
        } else {
          nowReadHandle.formattedText = addSpaces(textRaw.text);
        }
        let model = await modelChange(nowReadHandle.formattedText, nowReadHandle.lang, uri);
        await tabs_add(model, false);

        if (e.data.type === 'fileOpen_change') {
          break;
        }
        //History
        cacheNormal.version.clear();
        cacheNormal.version.set(nowReadHandle.extTimestamp, { name: nowReadHandle.file, version: nowReadHandle.ext, timestamp: textRaw.timestamp, handle: await cacheNormal.file.get(document.getElementById('control-File-normal').value) });;


        await Directory_Handle_RegisterV2(initOpenCache.history, false, 'read');
        sendHistoryToWorker(linkStatus[initOpenCache.history].handle, nowReadHandle.lib, nowReadHandle.folder, nowReadHandle.file);
        break;
      default:
        break;
    }
  },
  false
);

history_worker.addEventListener(
  "message",
  async (e) => {
    const Version = document.getElementById('control-Version-normal');
    if (e.data.type !== 'nodata') {
      const data = e.data.body;
      for (const [key, value] of data.entries()) {
        cacheNormal.version.set(key, value);
      }
    }
    await populatePulldown(Version, cacheNormal.version, Version.value, false);
  },
  false
);

filesystem_worker.addEventListener(
  "error",
  (e) => {
    console.error(e);
  },
  false
);

history_worker.addEventListener(
  "error",
  (e) => {
    console.error(e);
  },
  false
);

export const sendDirectoryHandleToWorker = (directoryHandle, type, kind = 'directory') => {
  filesystem_worker.postMessage({ type: type, body: directoryHandle, kind });
}

export const sendHistoryToWorker = (root, lib, folder, file) => {
  history_worker.postMessage({ body: { root, lib, folder, file } });
}