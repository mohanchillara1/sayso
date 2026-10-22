export type SavedPhrase = {
  id?: number
  text: string
  createdAt: number
  photo?: Blob
  pic?: string
  img?: string
}
export type SessionRecord = {
  id?: number
  phraseId?: number
  phraseText: string
  at: number
  mode?: "find" | "camera" | "sing" | "name"
  find?: "first" | "later" | "shown"
  selfRating?: "got" | "notyet"
}

const DB_NAME = "singback"
const VERSION = 1

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains("phrases")) db.createObjectStore("phrases", { keyPath: "id", autoIncrement: true })
      if (!db.objectStoreNames.contains("sessions")) db.createObjectStore("sessions", { keyPath: "id", autoIncrement: true })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode)
    const req = fn(tx.objectStore(store))
    tx.oncomplete = () => resolve(req.result)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export const savePhrase = (p: SavedPhrase) => {
  const record: SavedPhrase = { ...p }
  if (record.id == null) delete record.id
  return run<IDBValidKey>("phrases", "readwrite", (s) => s.put(record)) as Promise<number>
}
export const listPhrases = () => run<SavedPhrase[]>("phrases", "readonly", (s) => s.getAll())
export const deletePhrase = (id: number) => run<undefined>("phrases", "readwrite", (s) => s.delete(id))
export const saveSession = (r: SessionRecord) => run<IDBValidKey>("sessions", "readwrite", (s) => s.add(r))
export const listSessions = () => run<SessionRecord[]>("sessions", "readonly", (s) => s.getAll())
