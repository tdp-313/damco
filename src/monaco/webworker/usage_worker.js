// 逆引きの索引を作る Web Worker。索引の中身は shared/usageIndex.js。
// メンバーごとの結果は更新日時とサイズで覚えておき(IndexedDB に保存して次回にも使う)、変わったメンバーだけ読み直す。
import { get, set } from 'idb-keyval';
import { buildUsageIndex } from '../../../shared/usageIndex.js';
import { WEB_SOURCE_FILES } from '../file/fileType.js';

const SETTING_IDB = 'monaco-setting';
const CACHE_IDB = 'monaco-usage-index';

let cache = null;
let latest = 0;

const fileOf = (ref) => {
    if (!ref.file) {
        ref.file = ref.handle.getFile();
    }
    return ref.file;
};

const createFs = (forceSJIS) => ({
    list: async (ref) => {
        const entries = [];
        for await (const handle of ref.handle.values()) {
            entries.push({ name: handle.name, isDirectory: handle.kind === 'directory', ref: { handle, path: ref.path + '/' + handle.name } });
        }
        return entries;
    },
    read: async (ref) => (await fileOf(ref)).arrayBuffer(),
    stamp: async (ref) => {
        const file = await fileOf(ref);
        return file.lastModified + ':' + file.size + (forceSJIS ? ':sjis' : '');
    },
    key: (ref) => ref.path,
    toUri: () => null,
});

// { type: 'build', id, roots: [{ name, handle }], libraries, reset } を受けて、進み具合(progress)と結果(done)を返す
self.onmessage = async (event) => {
    const { id, roots, libraries, reset } = event.data;
    latest = id;
    try {
        if (cache === null || reset) {
            const saved = reset ? null : await get(CACHE_IDB);
            cache = saved instanceof Map ? saved : new Map();
        }
        const setting = await get(SETTING_IDB);
        const forceSJIS = !!(setting && setting.isForceSJIS);
        const index = await buildUsageIndex({
            roots: roots.map((root) => ({ name: root.name, ref: { handle: root.handle, path: root.name } })),
            libraries,
            sourceFiles: WEB_SOURCE_FILES,
            fs: createFs(forceSJIS),
            forceSJIS,
            cache,
            onProgress: (progress) => self.postMessage({ type: 'progress', id, ...progress }),
            isCancelled: () => latest !== id,
        });
        if (index === null) {
            self.postMessage({ type: 'cancelled', id });
            return;
        }
        if (index.stats.read > 0 || reset) {
            await set(CACHE_IDB, cache);
        }
        // ハンドルは持たせない(開くときは名前でたどる)
        const members = index.members.map(({ ref, uri, ...member }) => member);
        self.postMessage({ type: 'done', id, members, stats: index.stats });
    } catch (error) {
        self.postMessage({ type: 'error', id, message: String(error && error.message ? error.message : error) });
    }
};
