// On-device storage (IndexedDB). Nothing leaves the device: no account, no server.
import type { Word } from "./syllables"
import type { TapResult } from "./scoring"

export type SavedPhrase = { id?: number; text: string; words: Word[]; createdAt: number }
export type SessionRecord = {
  id?: number
  phraseId: number
  phraseText: string
  at: number
  tap: TapResult
  stepsCompleted: number
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
    const req = fn(db.transaction(store, mode).objectStore(store))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export const savePhrase = (p: SavedPhrase) => run<IDBValidKey>("phrases", "readwrite", (s) => s.put(p)) as Promise<number>
export const listPhrases = () => run<SavedPhrase[]>("phrases", "readonly", (s) => s.getAll())
export const deletePhrase = (id: number) => run<undefined>("phrases", "readwrite", (s) => s.delete(id))
export const saveSession = (r: SessionRecord) => run<IDBValidKey>("sessions", "readwrite", (s) => s.add(r))
export const listSessions = () => run<SessionRecord[]>("sessions", "readonly", (s) => s.getAll())
