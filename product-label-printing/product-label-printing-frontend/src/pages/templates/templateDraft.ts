import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { TemplateInput } from '../../api'
import type { LabelTemplate } from '../../types'
import { autoLayout, fieldsFromElements } from '../../lib/freeLayout'
import { safeMargins } from '../../lib/labelLayout'

// Every edit in the designer is kept in localStorage, one draft per template, until the
// user saves or discards it. Reopening the page (or switching back to a template)
// restores the work in progress.

const PREFIX = 'smart-label-template-draft:'
const HISTORY_LIMIT = 100

interface Stored {
  draft: TemplateInput
  savedAt: string
}

/** Same shape for saved templates and drafts, so "unsaved changes" is a plain comparison. */
export function normalizeInput(t: TemplateInput | LabelTemplate): TemplateInput {
  const elements = t.elements ?? autoLayout(t)
  return {
    name: t.name,
    widthMm: t.widthMm,
    heightMm: t.heightMm,
    columns: t.columns,
    gapMm: t.gapMm ?? 2,
    rowGapMm: t.rowGapMm ?? 2,
    mediaMode: t.mediaMode ?? 'GAP',
    pageMode: t.pageMode ?? 'ROW',
    rotate: t.rotate ?? 0,
    offsetXMm: t.offsetXMm ?? 0,
    offsetYMm: t.offsetYMm ?? 0,
    // The safe print area; elements outside it get a warning in the designer.
    marginsMm: safeMargins(t),
    orientation: t.orientation,
    barcodeType: t.barcodeType,
    elements,
    fields: fieldsFromElements(elements, t.fields),
  }
}

export function readDraft(key: string): Stored | null {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Stored
    return parsed?.draft && Array.isArray(parsed.draft.elements) ? parsed : null
  } catch {
    return null
  }
}

export function clearDraft(key: string) {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    /* storage unavailable */
  }
}

function writeDraft(key: string, draft: TemplateInput): string | null {
  try {
    const savedAt = new Date().toISOString()
    localStorage.setItem(PREFIX + key, JSON.stringify({ draft, savedAt } satisfies Stored))
    return savedAt
  } catch {
    return null // storage full or blocked: keep editing in memory
  }
}

type Update = TemplateInput | ((d: TemplateInput) => TemplateInput)

/**
 * Draft + undo/redo for one template. Mount it with `key={template id}` so switching
 * templates starts fresh from that template's own stored draft.
 */
export function useTemplateDraft(storageKey: string, base: TemplateInput) {
  const [state, setState] = useState(() => {
    const stored = readDraft(storageKey)
    const draft = stored ? normalizeInput(stored.draft) : base
    const restored = stored && JSON.stringify(draft) !== JSON.stringify(base) ? stored.savedAt : null
    return { draft, past: [] as TemplateInput[], future: [] as TemplateInput[], restoredAt: restored, savedLocallyAt: restored }
  })
  const snapshot = useRef<TemplateInput | null>(null)
  const current = useRef(state.draft)
  useEffect(() => {
    current.current = state.draft
  }, [state.draft])
  const baseJson = useMemo(() => JSON.stringify(base), [base])
  const dirty = JSON.stringify(state.draft) !== baseJson

  // Persist after every change (debounced so a drag does not write 60 times a second).
  useEffect(() => {
    const t = setTimeout(() => {
      if (JSON.stringify(state.draft) === baseJson) {
        clearDraft(storageKey)
        setState((s) => (s.savedLocallyAt ? { ...s, savedLocallyAt: null } : s))
      } else {
        const at = writeDraft(storageKey, state.draft)
        if (at) setState((s) => ({ ...s, savedLocallyAt: at }))
      }
    }, 250)
    return () => clearTimeout(t)
  }, [state.draft, baseJson, storageKey])

  /** Normal edit: one undo step. `transient` edits (mid-drag) are grouped by begin/end. */
  const update = useCallback((next: Update, transient = false) => {
    setState((s) => {
      const value = typeof next === 'function' ? next(s.draft) : next
      const draft = { ...value, fields: fieldsFromElements(value.elements ?? [], value.fields) }
      if (transient) return { ...s, draft }
      return { ...s, draft, past: [...s.past, s.draft].slice(-HISTORY_LIMIT), future: [] }
    })
  }, [])

  /** Start of a drag/resize: everything until `end()` becomes a single undo step. */
  const begin = useCallback(() => {
    snapshot.current = current.current
  }, [])

  const end = useCallback(() => {
    const before = snapshot.current
    snapshot.current = null
    if (!before) return
    setState((s) => (JSON.stringify(before) === JSON.stringify(s.draft) ? s : { ...s, past: [...s.past, before].slice(-HISTORY_LIMIT), future: [] }))
  }, [])

  const undo = useCallback(() => {
    setState((s) => (s.past.length ? { ...s, draft: s.past[s.past.length - 1], past: s.past.slice(0, -1), future: [s.draft, ...s.future] } : s))
  }, [])

  const redo = useCallback(() => {
    setState((s) => (s.future.length ? { ...s, draft: s.future[0], past: [...s.past, s.draft], future: s.future.slice(1) } : s))
  }, [])

  const discard = useCallback(() => {
    clearDraft(storageKey)
    setState((s) => ({ draft: base, past: [...s.past, s.draft].slice(-HISTORY_LIMIT), future: [], restoredAt: null, savedLocallyAt: null }))
  }, [base, storageKey])

  const dismissRestored = useCallback(() => setState((s) => ({ ...s, restoredAt: null })), [])

  return {
    draft: state.draft,
    dirty,
    restoredAt: state.restoredAt,
    savedLocallyAt: state.savedLocallyAt,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    update,
    begin,
    end,
    undo,
    redo,
    discard,
    dismissRestored,
  }
}
