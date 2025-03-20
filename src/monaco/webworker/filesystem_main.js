import { linkStatus } from "../file/directory.js";
import { Setting } from "../../setting.js";
import { monaco_handleName, monaco_handleName_RefMaster, monaco_handleName_his, monaco_handleName_RefMaster_his } from "../../root.js";
import { Directory_Handle_RegisterV2 } from "../file/directory.js";
import { populatePulldown } from "../file/newPulldown.js";
import { createURI } from "../textmodel.js";
import { fileTypeGet } from "../file/read.js";
import { addIndent, addSpaces } from "../file/text_extend.js";
import { modelChange } from "../textmodel.js";
import { textModelEditorApply } from "../textmodel.js";

import { tabs_add } from "../../tabs.js";

const filesystem_worker = new Worker(new URL('./filesystem_worker.js', import.meta.url), {
  type: 'module',
})

const history_worker = new Worker(new URL('./history_worker.js', import.meta.url), {
  type: 'module',
})

export const cache_data = {
  normal: { root: null, rootName: "", lib: null, folder: null, file: null, version: new Map() },
  left: { root: null, rootName: "", lib: null, folder: null, file: null, version: new Map() },
  right: { root: null, rootName: "", lib: null, folder: null, file: null, version: new Map() }
}

export class initOpenCache_Layout {
  constructor(data) {
    this.root = typeof (data.root) === "undefined" ? monaco_handleName : data.root;
    this.lib = typeof (data.lib) === "undefined" ? "" : data.lib;
    this.folder = typeof (data.folder) === "undefined" ? "" : data.folder;
    this.file = typeof (data.file) === "undefined" ? "" : data.file;

    if (this.root === monaco_handleName) {
      this.history_handleName = monaco_handleName_his;
    } else if (this.root === monaco_handleName_RefMaster) {
      this.history_handleName = monaco_handleName_RefMaster_his;
    }
  }
}

let initOpenCache = { normal: {}, left: {}, right: {} };

export const headerFileListCreate = async (initOpen = {}) => {
  //root handle permission check
  initOpenCache.normal = new initOpenCache_Layout(initOpen);
  await Directory_Handle_RegisterV2(initOpenCache.normal.root, false, 'read');
  cache_data.normal.root = linkStatus[initOpenCache.normal.root].handle;
  cache_data.normal.rootName = initOpenCache.normal.root;
  sendDirectoryHandleToWorker(linkStatus[initOpenCache.normal.root].handle, 'root-lib', 'normal');
}

export const diff_headerFileListCreate = async (initOpen = { left: {}, right: {} }) => {
  if (typeof (initOpen.left) !== 'undefined') {
    initOpenCache.left = new initOpenCache_Layout(initOpen.left);
    await Directory_Handle_RegisterV2(initOpenCache.left.root, false, 'read');
    cache_data.left.root = linkStatus[initOpenCache.left.root].handle;
    cache_data.left.rootName = initOpenCache.left.root;
    sendDirectoryHandleToWorker(linkStatus[initOpenCache.left.root].handle, 'root-lib', 'left');
  }
  if (typeof (initOpen.right) !== 'undefined') {
    initOpenCache.right = new initOpenCache_Layout(initOpen.right);
    await Directory_Handle_RegisterV2(initOpenCache.right.root, false, 'read');
    cache_data.right.root = linkStatus[initOpenCache.right.root].handle;
    cache_data.right.rootName = initOpenCache.right.root;
    sendDirectoryHandleToWorker(linkStatus[initOpenCache.right.root].handle, 'root-lib', 'right');
  }
}

filesystem_worker.addEventListener(
  "message",
  async (e) => {
    let target = e.data.target;
    switch (e.data.type) {
      case 'root-lib':
        const Lib = document.getElementById('control-Library-' + target);
        cache_data[target].lib = e.data.body;
        let searchLib = Lib.value === "" ? initOpenCache[target].lib : Lib.value;
        await populatePulldown(Lib, cache_data[target].lib, searchLib);
        sendDirectoryHandleToWorker(await cache_data[target].lib.get(Lib.value), 'lib-folder', target);
        break;
      case 'lib-folder':
        const Folder = document.getElementById('control-Folder-' + target);
        cache_data[target].folder = e.data.body;
        let searchFolder = Folder.value === "" ? initOpenCache[target].folder : Folder.value;
        await populatePulldown(Folder, cache_data[target].folder, searchFolder);
        sendDirectoryHandleToWorker(await cache_data[target].folder.get(Folder.value), 'folder-file', target, "file");
        break;
      case 'folder-file':
        const File = document.getElementById('control-File-' + target);
        cache_data[target].file = e.data.body;
        let searchFile = File.value === "" ? initOpenCache[target].file : File.value;
        await populatePulldown(File, cache_data[target].file, searchFile, true);
        sendDirectoryHandleToWorker(await cache_data[target].file.get(File.value), 'fileOpen', target);
        break
      case 'fileOpen':
      case 'fileOpen_change':
        let textRaw = e.data.body;
        var selectElement = document.getElementById('control-File-' + target);

        // optionsの中から指定した値を持つoptionを探し、選択状態にします
        for (var i = 0; i < selectElement.options.length; i++) {
          if (selectElement.options[i].value == e.data.body.handle.name.replace(/\.[^/.]+$/, "")) {
            selectElement.selectedIndex = i;
            break;
          }
        }
        let nowReadHandle = {
          root: cache_data[target].rootName,
          lib: document.getElementById('control-Library-' + target).value,
          folder: document.getElementById('control-Folder-' + target).value,
          file: document.getElementById('control-File-' + target).value,
          lang: "",
          formattedText: "",
          extTimestamp: textRaw.ext + "__" + textRaw.timestamp
        }
        nowReadHandle.lang = fileTypeGet(nowReadHandle.folder, true);

        let indent = true;
        if (target === 'left' || target === 'right') {
          indent = Setting.diffIndent
        }

        if (nowReadHandle.lang.indexOf("indent") !== -1 && indent) {
          nowReadHandle.formattedText = await addIndent(textRaw.text);
        } else {
          if (nowReadHandle.lang === 'rpg-indent') {
            nowReadHandle.lang = 'rpg';
          }
          nowReadHandle.formattedText = addSpaces(textRaw.text);
        }
        let uri = await createURI(nowReadHandle.root, nowReadHandle.lib, nowReadHandle.folder, nowReadHandle.file, nowReadHandle.extTimestamp, nowReadHandle.lang);
        let model = await modelChange(nowReadHandle.formattedText, nowReadHandle.lang, uri);
        if (target === 'normal') {
          await tabs_add(model, false);
        } else {
          if (target === 'left') {
            textModelEditorApply(model, null);
          } else {
            textModelEditorApply(null, model);
          }
        }
        if (e.data.type === 'fileOpen_change') {
          break;
        }
        //History
        cache_data[target].version.clear();
        cache_data[target].version.set(nowReadHandle.extTimestamp, { name: nowReadHandle.file, version: nowReadHandle.ext, timestamp: textRaw.timestamp, handle: await cache_data[target].file.get(document.getElementById('control-File-' + target).value) });;
        const version = document.getElementById('control-Version-' + target);
        version.innerHTML = "";
        let history_handleName = initOpenCache[target].history_handleName;
        await Directory_Handle_RegisterV2(history_handleName, false, 'read');
        sendHistoryToWorker(linkStatus[history_handleName].handle, nowReadHandle.lib, nowReadHandle.folder, nowReadHandle.file, target);
        break;
      default:
        break;
    }
  }
);

history_worker.addEventListener(
  "message",
  async (e) => {
    let target = e.data.target;
    const Version = document.getElementById('control-Version-' + target);
    if (e.data.type !== 'nodata') {
      const data = e.data.body;
      for (const [key, value] of data.entries()) {
        cache_data[target].version.set(key, value);
      }
    }
    await populatePulldown(Version, cache_data[target].version, Version.value, false);
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

export const sendDirectoryHandleToWorker = (directoryHandle, type, target, kind = 'directory') => {
  filesystem_worker.postMessage({ type: type, body: directoryHandle, target, kind });
}

export const sendHistoryToWorker = (root, lib, folder, file, target) => {
  history_worker.postMessage({ body: { root, lib, folder, file }, target });
}

export const nowReadFilePath = (target) => {
  return {
    root: cache_data[target].rootName,
    lib: document.getElementById('control-Library-' + target).value,
    folder: document.getElementById('control-Folder-' + target).value,
    file: document.getElementById('control-File-' + target).value,
    version: document.getElementById('control-Version-' + target).value
  }
}
