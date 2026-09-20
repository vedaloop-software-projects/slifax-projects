// Client-side store standing in for the backend database.
// Reads go through useDb(); writes go through src/api (never mutate directly from UI).

import { useSyncExternalStore } from 'react'
import type { Db } from '../types'
import { DB_VERSION, createSeed } from './seed'

const STORAGE_KEY = 'smart-label-db'

function load(): Db {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Db
      if (parsed.version === DB_VERSION) return parsed
    }
  } catch {
    /* fall through to seed */
  }
  return createSeed()
}

let db: Db = load()
const listeners = new Set<() => void>()
let saveTimer: ReturnType<typeof setTimeout> | undefined

function persist() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
    } catch {
      /* storage full / disabled — keep working in memory */
    }
  }, 250)
}

export function getDb(): Db {
  return db
}

/** Immutable update: return a new Db (spread only the collections you change). */
export function setDb(update: (prev: Db) => Db) {
  db = update(db)
  persist()
  listeners.forEach((l) => l())
}

export function resetDb() {
  db = createSeed()
  persist()
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Subscribe to the whole snapshot. Derive with useMemo in components. */
export function useDb(): Db {
  return useSyncExternalStore(subscribe, getDb)
}

// Keep multiple tabs in sync (e.g. admin tab + public scan tab).
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        db = JSON.parse(e.newValue) as Db
        listeners.forEach((l) => l())
      } catch {
        /* ignore */
      }
    }
  })
}
