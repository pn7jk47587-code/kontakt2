// Minimaler IndexedDB-Wrapper. Alle Daten bleiben auf dem Gerät.
const DB = (() => {
  const NAME = 'kontaktbogen';
  const VER = 4;
  const STORES = ['stocks', 'cameras', 'lenses', 'fridge', 'rolls', 'frames', 'images', 'meta'];
  let dbp = null;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open(NAME, VER);
      r.onupgradeneeded = () => {
        const db = r.result;
        for (const s of STORES) {
          if (!db.objectStoreNames.contains(s)) {
            const os = db.createObjectStore(s, { keyPath: 'id' });
            if (s === 'frames') os.createIndex('rollId', 'rollId');
          }
        }
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }

  async function tx(store, mode, fn) {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction(store, mode);
      const os = t.objectStore(store);
      let out;
      Promise.resolve(fn(os)).then(v => { out = v; });
      t.oncomplete = () => res(out);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    });
  }

  const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

  return {
    get: (s, id) => tx(s, 'readonly', os => req(os.get(id))),
    all: (s) => tx(s, 'readonly', os => req(os.getAll())),
    put: (s, obj) => tx(s, 'readwrite', os => req(os.put(obj))),
    putMany: (s, arr) => tx(s, 'readwrite', os => Promise.all(arr.map(o => req(os.put(o))))),
    del: (s, id) => tx(s, 'readwrite', os => req(os.delete(id))),
    clear: (s) => tx(s, 'readwrite', os => req(os.clear())),
    byIndex: (s, idx, val) => tx(s, 'readonly', os => req(os.index(idx).getAll(val))),
    STORES
  };
})();
