// On-device storage (IndexedDB). Nothing leaves the device: no account, no server.
// Records saved by older versions may carry extra fields from the modes we removed
// (Sing it, Name it); they are kept as they are and ignored.

// One word list for both modes. Every item has text. Hear it, find it shows its photo,
// else its built-in picture.
export type SavedPhrase = {
  id?: number
  text: string
  createdAt: number
  photo?: Blob
  /** Built-in picture (an emoji) for starter words that have no photo yet. */
  pic?: string
  /** Built-in clipart picture (a PNG under public/pics/, as "pics/fork.png") for starter words with no clear emoji. Shown after a photo, before the emoji. */
  img?: string
}
export type SessionRecord = {
  id?: number
  /** Missing for Point and name: the object is not in the word list. */
  phraseId?: number
  phraseText: string
  at: number
  /** "sing" and "name" only appear in records from older versions. */
  mode?: "find" | "camera" | "sing" | "name"
  /** Hear it, find it: right on the first tap, after a wrong tap, or the app showed it. */
  find?: "first" | "later" | "shown"
  /** Point and name: what the person said about themselves (no one else judged it). */
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

// Resolve when the transaction has committed, not when the request returns, so a
// quick Back press cannot lose a write.
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

// A new phrase must not carry an `id` key at all: IndexedDB rejects {id: undefined}
// ("not a valid key") instead of generating one.
export const savePhrase = (p: SavedPhrase) => {
  const record: SavedPhrase = { ...p }
  if (record.id == null) delete record.id
  return run<IDBValidKey>("phrases", "readwrite", (s) => s.put(record)) as Promise<number>
}
export const listPhrases = () => run<SavedPhrase[]>("phrases", "readonly", (s) => s.getAll())
export const deletePhrase = (id: number) => run<undefined>("phrases", "readwrite", (s) => s.delete(id))
export const saveSession = (r: SessionRecord) => run<IDBValidKey>("sessions", "readwrite", (s) => s.add(r))
export const listSessions = () => run<SessionRecord[]>("sessions", "readonly", (s) => s.getAll())
