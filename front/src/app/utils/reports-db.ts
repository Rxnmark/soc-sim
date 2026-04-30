const DB_NAME = "ReportsDB";
const STORE_NAME = "directories";
const KEY = "selectedDirectory";

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function openStore(db: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore {
    return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
}

export async function saveDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
    const db = await openDB();
    const store = openStore(db, "readwrite");
    await new Promise<void>((resolve, reject) => {
        const req = store.put(handle, KEY);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

export async function getDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
    const db = await openDB();
    const store = openStore(db, "readonly");
    return new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
        const req = store.get(KEY);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export async function deleteDirectoryHandle(): Promise<void> {
    const db = await openDB();
    const store = openStore(db, "readwrite");
    await new Promise<void>((resolve, reject) => {
        const req = store.delete(KEY);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}
