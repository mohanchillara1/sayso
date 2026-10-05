// On-device storage (IndexedDB). Nothing leaves the device: no account, no server.
import type { Word } from "./syllables"
import type { TapResult } from "./scoring"

// One list for both modes. Every item has text (used by Sing it). An item with a
// photo can also be used by Name it; cue/box/due only matter there.
export type SavedPhrase = {
  id?: number
  text: string
  words: Word[]
  createdAt: number
  photo?: Blob
  /** Caregiver-written sentence cue, e.g. "I drink coffee from my ___". */
  cue?: string
  /** Review box 1..5 (Name it). */
  box?: number
  /** When it is next due, ms since epoch. */
  due?: number
}
export type SessionRecord = {
  id?: number
  phraseId: number
  phraseText: string
  at: number
  mode?: "sing" | "name"
  tap?: TapResult
  stepsCompleted?: number
  /** Name it: 0 = said it with no hint, 1 first letter, 2 sentence, 3 whole word shown. */
  cueLevel?: number
  /** Name it: what the helper pressed. */
  result?: "clear" | "close" | "notyet"
  said?: boolean
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
