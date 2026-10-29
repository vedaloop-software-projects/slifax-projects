import { useEffect, useRef, useState, type CSSProperties, type DragEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { DRAG_KIND, GRID_MM, resizeElement, snapMove, type Gesture, type Guide, type Handle } from './canvasMath'
import { KIND_INFO, PAGE, bandFrame, clampElement, defaultElement, elementText, newElementId, outsideBand, shapeOf, type Band, type ElementKind, type Letterhead, type LetterheadElement } from './model'

const TEXT_HANDLES: Handle[] = ['nw', 'ne', 'sw', 'se', 'e', 'w']
const BOX_HANDLES: Handle[] = ['nw', 'ne', 'sw', 'se', 'e', 'w', 'n', 's']

/** How an element looks on the canvas; mirrors the PDF renderer on the server. */
export function ElementView({ letterhead, element, k }: { letterhead: Letterhead; element: LetterheadElement; k: number }) {
  const shape = shapeOf(element.kind)
  if (shape === 'image') return element.src ? <img className="lh-image" src={element.src} alt="" style={{ objectPosition: `${element.align ?? 'left'} center` }} draggable={false}/> : <div className="lh-image-empty">Choose an image</div>
  if (shape === 'line') {
    const width = Math.max(1, (element.strokeMm ?? 0.3) * k), horizontal = element.wMm >= element.hMm
    return <div className="lh-line" style={horizontal ? { borderTop: `${width}px solid ${element.stroke ?? letterhead.accent}`, width: '100%' } : { borderLeft: `${width}px solid ${element.stroke ?? letterhead.accent}`, height: '100%' }}/>
  }
  if (shape === 'rect') return <div style={{ width: '100%', height: '100%', background: element.fill ?? 'transparent', border: element.stroke && (element.strokeMm ?? 0) > 0 ? `${Math.max(1, element.strokeMm! * k)}px solid ${element.stroke}` : undefined, borderRadius: (element.radiusMm ?? 0) * k }}/>
  const text = elementText(letterhead, element)
  const style: CSSProperties = { fontSize: (element.fontMm ?? 3.5) * k, fontWeight: element.bold ? 700 : 400, fontStyle: element.italic ? 'italic' : 'normal', color: element.color ?? '#101828', textAlign: element.align ?? 'left', justifyContent: element.align === 'center' ? 'center' : element.align === 'right' ? 'flex-end' : 'flex-start' }
  return <div className="lh-text" style={style}>{text || <span className="lh-placeholder">{KIND_INFO[element.kind].label} (empty)</span>}</div>
}

export function LetterheadCanvas({ draft, selectedId, onSelect, onChange, onBegin, onEnd, onUndo, onRedo }: {
  draft: Letterhead
  selectedId: string | null
  onSelect: (id: string | null) => void
  onChange: (elements: LetterheadElement[], transient?: boolean) => void
  onBegin: () => void
  onEnd: () => void
  onUndo: () => void
  onRedo: () => void
}) {
  const elements = draft.elements
  const outside = new Set(outsideBand(draft).map(element => element.id))
  const wrapRef = useRef<HTMLDivElement>(null)
  const bandRefs = useRef<Record<Band, HTMLDivElement | null>>({ header: null, footer: null })
  const [wrapWidth, setWrapWidth] = useState(720)
  const [guides, setGuides] = useState<Array<Guide & { band: Band }>>([])
  const [dropBand, setDropBand] = useState<Band | null>(null)
  const latest = useRef({ draft, onChange, onEnd })
  useEffect(() => { latest.current = { draft, onChange, onEnd } })

  useEffect(() => {
    const node = wrapRef.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => setWrapWidth(entry!.contentRect.width))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  // Pixels per mm: the A4 width fills the card, readable on laptops and large screens.
  const k = Math.max(2, Math.min(5, (wrapWidth - 48) / PAGE.widthMm))

  const startGesture = (event: ReactPointerEvent, element: LetterheadElement, mode: Gesture['mode'], handle?: Handle) => {
    if (event.button !== 0) return
    event.stopPropagation(); event.preventDefault()
    onSelect(element.id)
    const gesture: Gesture = { mode, handle, start: element, x: event.clientX, y: event.clientY }
    onBegin()
    const move = (moveEvent: PointerEvent) => {
      const { draft: current, onChange: change } = latest.current
      const frame = bandFrame(current, element.band), dx = (moveEvent.clientX - gesture.x) / k, dy = (moveEvent.clientY - gesture.y) / k, free = moveEvent.altKey
      let next: LetterheadElement
      if (gesture.mode === 'move') {
        const snapped = snapMove({ ...gesture.start, xMm: gesture.start.xMm + dx, yMm: gesture.start.yMm + dy }, current.elements.filter(other => other.id !== element.id && other.band === element.band), frame, free)
        next = snapped.element
        setGuides(snapped.guides.map(guide => ({ ...guide, band: element.band })))
      } else next = resizeElement(gesture.start, gesture.handle!, dx, dy, frame, free)
      change(current.elements.map(other => (other.id === next.id ? next : other)), true)
    }
    const up = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up)
      setGuides([]); latest.current.onEnd()
    }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up)
  }

  // Keyboard: arrows nudge, Delete removes, Ctrl+Z / Ctrl+Y undo/redo, Ctrl+D duplicates.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null
      if (target?.closest('input, textarea, select, [contenteditable="true"], .modal')) return
      const mod = event.ctrlKey || event.metaKey, key = event.key.toLowerCase()
      if (mod && key === 'z') { event.preventDefault(); if (event.shiftKey) onRedo(); else onUndo(); return }
      if (mod && key === 'y') { event.preventDefault(); onRedo(); return }
      const selected = elements.find(element => element.id === selectedId)
      if (!selected) return
      const frame = bandFrame(draft, selected.band)
      if (event.key === 'Escape') onSelect(null)
      else if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); onChange(elements.filter(element => element.id !== selected.id)); onSelect(null) }
      else if (event.key.startsWith('Arrow')) {
        event.preventDefault()
        const step = event.shiftKey ? 2 : GRID_MM
        const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0, dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0
        const moved = clampElement({ ...selected, xMm: selected.xMm + dx, yMm: selected.yMm + dy }, frame)
        onChange(elements.map(element => (element.id === selected.id ? moved : element)))
      } else if (mod && key === 'd') {
        event.preventDefault()
        const copy = clampElement({ ...selected, id: newElementId(), xMm: selected.xMm + 3, yMm: selected.yMm + 3 }, frame)
        onChange([...elements, copy]); onSelect(copy.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [draft, elements, selectedId, onChange, onSelect, onUndo, onRedo])

  const drop = (event: DragEvent, band: Band) => {
    const kind = event.dataTransfer.getData(DRAG_KIND) as ElementKind
    setDropBand(null)
    const node = bandRefs.current[band]
    if (!kind || !(kind in KIND_INFO) || !node) return
    event.preventDefault()
    const rect = node.getBoundingClientRect()
    const element = defaultElement(kind, band, bandFrame(draft, band), draft.accent, { xMm: (event.clientX - rect.left) / k, yMm: (event.clientY - rect.top) / k })
    onChange([...elements, element]); onSelect(element.id)
  }

  const renderBand = (band: Band) => {
    const frame = bandFrame(draft, band)
    if (frame.height <= 0) return <div className="lh-band lh-band-off" style={{ height: 0 }}/>
    return <div
      ref={node => { bandRefs.current[band] = node }}
      className={`lh-band${dropBand === band ? ' dropping' : ''}`}
      style={{ height: frame.height * k, backgroundSize: `${k * 5}px ${k * 5}px` }}
      onDragOver={event => { if (!event.dataTransfer.types.includes(DRAG_KIND)) return; event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; setDropBand(band) }}
      onDragLeave={() => setDropBand(null)}
      onDrop={event => drop(event, band)}
    >
      <span className="lh-band-tag">{band === 'header' ? 'Header' : 'Footer'} · {frame.height} mm</span>
      {elements.filter(element => element.band === band).map(element => {
        const selected = element.id === selectedId
        return <div key={element.id} data-kind={element.kind} className={`lh-element${selected ? ' selected' : outside.has(element.id) ? ' outside' : ''}`}
          style={{ left: element.xMm * k, top: element.yMm * k, width: element.wMm * k, height: Math.max(element.hMm * k, 2) }}
          onPointerDown={event => startGesture(event, element, 'move')}>
          <div className="lh-element-body"><ElementView letterhead={draft} element={element} k={k}/></div>
          {selected && <>
            <span className="lh-element-tag">{KIND_INFO[element.kind].label}</span>
            {(shapeOf(element.kind) === 'text' ? TEXT_HANDLES : BOX_HANDLES).map(handle => <span key={handle} aria-label={`Resize ${handle}`} className={`lh-handle ${handle}`} onPointerDown={event => startGesture(event, element, 'resize', handle)}/>)}
          </>}
        </div>
      })}
      {guides.filter(guide => guide.band === band).map(guide => <div key={`${guide.axis}${guide.mm}`} className="lh-guide" style={guide.axis === 'x' ? { left: guide.mm * k, top: 0, bottom: 0, width: 1 } : { top: guide.mm * k, left: 0, right: 0, height: 1 }}/>)}
    </div>
  }

  return <div ref={wrapRef} className="lh-stage" onPointerDown={() => onSelect(null)}>
    <div className="lh-page" style={{ width: PAGE.widthMm * k, height: PAGE.heightMm * k }}>
      {renderBand('header')}
      {/* Where each invoice or quotation prints its own content. Not editable here. */}
      <div className="lh-body" aria-hidden style={{ padding: `${4 * k}px ${15 * k}px` }}>
        <div className="lh-body-title" style={{ height: 5 * k, width: '32%' }}/>
        <div className="lh-body-row" style={{ marginTop: 6 * k }}><div style={{ width: '45%' }}/><div style={{ width: '25%' }}/></div>
        <div className="lh-body-table" style={{ marginTop: 8 * k, height: 7 * k }}/>
        {[0, 1, 2].map(row => <div key={row} className="lh-body-line" style={{ marginTop: 3 * k }}/>)}
        <div className="lh-body-total" style={{ marginTop: 6 * k, height: 5 * k }}/>
        <span className="lh-body-label">Invoice / quotation content prints here</span>
      </div>
      {renderBand('footer')}
    </div>
    <div className="lh-hint">A4 · 210 × 297 mm · drag from Elements onto the header or footer · corners resize · Alt = no snapping · arrows nudge · Ctrl+D duplicates</div>
  </div>
}
