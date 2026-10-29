import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Letterhead } from './model'

// Ported from the product-label designer: the working draft with undo/redo, kept in
// localStorage until it is saved or discarded so a reload never loses work.
const STORAGE_KEY = 'zenx-letterhead-draft'
const HISTORY_LIMIT = 100
type Update = Letterhead | ((draft: Letterhead) => Letterhead)

function readStored(): { draft: Letterhead; savedAt: string } | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as { draft: Letterhead; savedAt: string } | null
    return parsed?.draft?.version === 1 && Array.isArray(parsed.draft.elements) ? parsed : null
  } catch { return null }
}
const writeStored = (draft: Letterhead) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ draft, savedAt: new Date().toISOString() })); return true } catch { return false } }
export const clearStoredDraft = () => { try { localStorage.removeItem(STORAGE_KEY) } catch { /* storage unavailable */ } }

export function useLetterheadDraft(base: Letterhead) {
  const [state, setState] = useState(() => {
    const stored = readStored()
    const draft = stored?.draft ?? base
    return { draft, past: [] as Letterhead[], future: [] as Letterhead[], restoredAt: stored && JSON.stringify(stored.draft) !== JSON.stringify(base) ? stored.savedAt : null }
  })
  const snapshot = useRef<Letterhead | null>(null), current = useRef(state.draft)
  useEffect(() => { current.current = state.draft }, [state.draft])
  const baseJson = useMemo(() => JSON.stringify(base), [base])
  const dirty = JSON.stringify(state.draft) !== baseJson

  useEffect(() => {
    const timer = setTimeout(() => { if (JSON.stringify(state.draft) === baseJson) clearStoredDraft(); else writeStored(state.draft) }, 300)
    return () => clearTimeout(timer)
  }, [state.draft, baseJson])

  /** Normal edit: one undo step. `transient` edits (mid-drag) are grouped by begin/end. */
  const update = useCallback((next: Update, transient = false) => {
    setState(s => {
      const draft = typeof next === 'function' ? next(s.draft) : next
      return transient ? { ...s, draft } : { ...s, draft, past: [...s.past, s.draft].slice(-HISTORY_LIMIT), future: [] }
    })
  }, [])
  const begin = useCallback(() => { snapshot.current = current.current }, [])
  const end = useCallback(() => {
    const before = snapshot.current
    snapshot.current = null
    if (before) setState(s => (JSON.stringify(before) === JSON.stringify(s.draft) ? s : { ...s, past: [...s.past, before].slice(-HISTORY_LIMIT), future: [] }))
  }, [])
  const undo = useCallback(() => setState(s => (s.past.length ? { ...s, draft: s.past[s.past.length - 1]!, past: s.past.slice(0, -1), future: [s.draft, ...s.future] } : s)), [])
  const redo = useCallback(() => setState(s => (s.future.length ? { ...s, draft: s.future[0]!, past: [...s.past, s.draft], future: s.future.slice(1) } : s)), [])
  const reset = useCallback((next: Letterhead) => { clearStoredDraft(); setState(s => ({ draft: next, past: [...s.past, s.draft].slice(-HISTORY_LIMIT), future: [], restoredAt: null })) }, [])
  const dismissRestored = useCallback(() => setState(s => ({ ...s, restoredAt: null })), [])

  return { draft: state.draft, dirty, restoredAt: state.restoredAt, canUndo: state.past.length > 0, canRedo: state.future.length > 0, update, begin, end, undo, redo, reset, dismissRestored }
}
