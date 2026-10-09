import { useEffect, useMemo, useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent } from 'react'
import type { TemplateInput } from '../../api'
import type { LabelElement, LabelElementKind } from '../../types'
import { ElementContent } from '../../components/LabelPreview'
import { ELEMENT_INFO, clampElement, defaultElement, elementBox, labelFrame, newElementId, shapeOf, type ElementData } from '../../lib/freeLayout'
import { DRAG_KIND, GRID_MM, resizeElement, snapMove, type Gesture, type Guide, type Handle } from './canvasMath'
import { cx } from '../../lib/format'
import { outsideSafeArea, safeArea } from '../../lib/labelLayout'

const HANDLES: Handle[] = ['nw', 'ne', 'sw', 'se', 'e', 'w']
const HANDLE_POS: Record<Handle, string> = {
  nw: '-left-1.5 -top-1.5 cursor-nwse-resize',
  ne: '-right-1.5 -top-1.5 cursor-nesw-resize',
  sw: '-left-1.5 -bottom-1.5 cursor-nesw-resize',
  se: '-right-1.5 -bottom-1.5 cursor-nwse-resize',
  e: '-right-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize',
  w: '-left-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize',
}

export function LabelCanvas({
  draft,
  data,
  selectedId,
  onSelect,
  onChange,
  onBegin,
  onEnd,
  onUndo,
  onRedo,
}: {
  draft: TemplateInput
  data: ElementData
  selectedId: string | null
  onSelect: (id: string | null) => void
  onChange: (elements: LabelElement[], transient?: boolean) => void
  onBegin: () => void
  onEnd: () => void
  onUndo: () => void
  onRedo: () => void
}) {
  const frame = labelFrame(draft)
  const elements = useMemo(() => draft.elements ?? [], [draft.elements])
  const safe = safeArea(draft)
  const outside = new Set(outsideSafeArea(draft).map((e) => e.id))
  const wrapRef = useRef<HTMLDivElement>(null)
  const paperRef = useRef<HTMLDivElement>(null)
  const [wrapWidth, setWrapWidth] = useState(640)
  const [guides, setGuides] = useState<Guide[]>([])
  const [dropping, setDropping] = useState(false)
  const latest = useRef({ elements, frame, onChange, onEnd })
  useEffect(() => {
    latest.current = { elements, frame, onChange, onEnd }
  })

  useEffect(() => {
    const node = wrapRef.current
    if (!node) return
    const ro = new ResizeObserver(([entry]) => setWrapWidth(entry.contentRect.width))
    ro.observe(node)
    return () => ro.disconnect()
  }, [])

  // Pixels per mm: as large as fits the space, readable on small labels.
  const k = Math.max(3, Math.min(16, (wrapWidth - 56) / frame.width, 420 / frame.height))

  const startGesture = (e: ReactPointerEvent, el: LabelElement, mode: Gesture['mode'], handle?: Handle) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    onSelect(el.id)
    const g: Gesture = { mode, handle, start: el, x: e.clientX, y: e.clientY }
    onBegin()
    const move = (ev: PointerEvent) => {
      const { elements: els, frame: fr, onChange: change } = latest.current
      const dx = (ev.clientX - g.x) / k
      const dy = (ev.clientY - g.y) / k
      const free = ev.altKey
      let next: LabelElement
      if (g.mode === 'move') {
        const snapped = snapMove({ ...g.start, xMm: g.start.xMm + dx, yMm: g.start.yMm + dy }, els.filter((o) => o.id !== g.start.id), fr, free)
        next = snapped.el
        setGuides(snapped.guides)
      } else {
        next = resizeElement(g.start, g.handle!, dx, dy, fr, free)
      }
      change(els.map((o) => (o.id === next.id ? next : o)), true)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      setGuides([])
      latest.current.onEnd()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  // Keyboard: arrows nudge, Delete removes, Ctrl+Z / Ctrl+Y undo/redo, Ctrl+D duplicates text.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target instanceof Element ? e.target : null
      if (target?.closest('input, textarea, select, [contenteditable="true"], .ant-select, .ant-modal')) return
      const mod = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()
      if (mod && key === 'z') {
        e.preventDefault()
        if (e.shiftKey) onRedo()
        else onUndo()
        return
      }
      if (mod && key === 'y') {
        e.preventDefault()
        onRedo()
        return
      }
      const sel = elements.find((x) => x.id === selectedId)
      if (!sel) return
      if (e.key === 'Escape') onSelect(null)
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        onChange(elements.filter((x) => x.id !== sel.id))
        onSelect(null)
      } else if (e.key.startsWith('Arrow')) {
        e.preventDefault()
        const step = e.shiftKey ? 2 : GRID_MM
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
        const moved = clampElement({ ...sel, xMm: sel.xMm + dx, yMm: sel.yMm + dy }, frame)
        onChange(elements.map((x) => (x.id === sel.id ? moved : x)))
      } else if (mod && key === 'd' && sel.kind === 'text') {
        e.preventDefault()
        const copy = clampElement({ ...sel, id: newElementId(), xMm: sel.xMm + 2, yMm: sel.yMm + 2 }, frame)
        onChange([...elements, copy])
        onSelect(copy.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [elements, selectedId, frame, onChange, onSelect, onUndo, onRedo])

  const drop = (e: DragEvent) => {
    const kind = e.dataTransfer.getData(DRAG_KIND) as LabelElementKind
    setDropping(false)
    if (!kind || !(kind in ELEMENT_INFO) || !paperRef.current) return
    e.preventDefault()
    const rect = paperRef.current.getBoundingClientRect()
    const el = defaultElement(kind, frame, { xMm: (e.clientX - rect.left) / k, yMm: (e.clientY - rect.top) / k })
    onChange([...elements, el])
    onSelect(el.id)
  }

  return (
    <div
      ref={wrapRef}
      className="relative flex min-h-[340px] flex-col items-center justify-center overflow-auto rounded-xl bg-[#eef1f6] p-7"
      onPointerDown={() => onSelect(null)}
    >
      <div
        ref={paperRef}
        role="application"
        aria-label="Label design canvas"
        className={cx('relative shrink-0 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.12)] transition-shadow', dropping && 'ring-2 ring-brand ring-offset-2')}
        style={{
          width: frame.width * k,
          height: frame.height * k,
          backgroundImage: k >= 6 ? 'radial-gradient(circle, #d5dbe6 0.7px, transparent 0.8px)' : undefined,
          backgroundSize: `${k}px ${k}px`,
        }}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes(DRAG_KIND)) return
          e.preventDefault()
          e.dataTransfer.dropEffect = 'copy'
          setDropping(true)
        }}
        onDragLeave={() => setDropping(false)}
        onDrop={drop}
      >
        {/* Safe print area: the margins around it are shaded (may be cut off when printed);
            elements outside it are outlined in orange. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
          <div
            data-safe-area
            className="absolute border border-dashed border-emerald-600/80"
            style={{
              left: safe.x * k,
              top: safe.y * k,
              width: safe.width * k,
              height: safe.height * k,
              boxShadow: '0 0 0 9999px rgba(100, 116, 139, 0.22)',
            }}
          />
        </div>
        {elements.map((el) => {
          const selected = el.id === selectedId
          return (
            <div
              key={el.id}
              data-element={el.kind}
              className={cx(
                'absolute cursor-move touch-none select-none',
                selected ? 'z-10 outline-2 outline-blue-500 outline-solid' : outside.has(el.id) ? 'outline-2 outline-amber-500 outline-dashed' : 'outline-1 outline-transparent outline-dashed hover:outline-blue-400',
              )}
              style={elementBox(el, k, 'px')}
              onPointerDown={(e) => startGesture(e, el, 'move')}
            >
              <div className="pointer-events-none h-full w-full overflow-hidden">
                <ElementContent el={el} data={data} template={draft} k={k} uom="px" placeholder />
              </div>
              {selected && (
                <>
                  <span className="pointer-events-none absolute -top-5 left-0 rounded bg-blue-500 px-1.5 text-[10px] leading-4 whitespace-nowrap text-white">
                    {ELEMENT_INFO[el.kind].label}
                  </span>
                  {HANDLES.filter((h) => shapeOf(el.kind) === 'text' || h.length === 2).map((h) => (
                    <span
                      key={h}
                      aria-label={`Resize ${h}`}
                      className={cx('absolute size-3 rounded-[3px] border-2 border-blue-500 bg-white', HANDLE_POS[h])}
                      onPointerDown={(e) => startGesture(e, el, 'resize', h)}
                    />
                  ))}
                </>
              )}
            </div>
          )
        })}
        {guides.map((g) => (
          <div
            key={`${g.axis}${g.mm}`}
            className="pointer-events-none absolute z-20 bg-fuchsia-500"
            style={g.axis === 'x' ? { left: g.mm * k, top: -12, bottom: -12, width: 1 } : { top: g.mm * k, left: -12, right: -12, height: 1 }}
          />
        ))}
        {!elements.length && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center p-2 text-center text-[12px] text-muted">
            Drag fields here from the left
          </div>
        )}
      </div>
      <div className="mt-3 text-[12px] text-muted">
        {frame.width} × {frame.height} mm · shaded edge = may be cut off · drag to move · corners resize · Alt = no snapping · arrows nudge
      </div>
    </div>
  )
}
