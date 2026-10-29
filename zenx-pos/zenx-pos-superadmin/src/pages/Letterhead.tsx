import { useCallback, useEffect, useState, type ChangeEvent, type ReactNode } from 'react'
import { api } from '../api'
import { FieldLabel, Modal, PageHeader } from '../ui'
import { DRAG_KIND } from '../letterhead/canvasMath'
import { LetterheadCanvas } from '../letterhead/LetterheadCanvas'
import { DEFAULT_LETTERHEAD, KIND_INFO, PALETTE, PT_PER_MM, bandFrame, clampElement, defaultElement, outsideBand, shapeOf, type Band, type Company, type ElementKind, type Letterhead, type LetterheadElement } from '../letterhead/model'
import { clearStoredDraft, useLetterheadDraft } from '../letterhead/useDraft'

const errorText = (reason: unknown) => reason instanceof Error ? reason.message : 'Something went wrong.'
const COMPANY_FIELDS: Array<[keyof Company, string, string]> = [['name', 'Company name', 'Slifax Technologies Pvt Ltd'], ['address', 'Address', 'Street, city, state, PIN'], ['gstin', 'GSTIN', '15-character GSTIN'], ['email', 'Email', 'billing@company.com'], ['phone', 'Phone', '+91 90000 00000'], ['website', 'Website', 'www.company.com']]
const PALETTE_GLYPH: Record<ElementKind, string> = { companyName: 'Aa', companyAddress: '⌂', companyGstin: '#', companyEmail: '@', companyPhone: '☎', companyWebsite: '⌘', text: 'T', image: '▣', line: '—', rect: '▭' }

// Logos are stored inside the design, so shrink them in the browser first (max 800 px,
// PNG kept for transparency, otherwise JPEG) to stay well inside the 1 MB request limit.
async function readImage(file: File) {
  if (!['image/png', 'image/jpeg'].includes(file.type)) throw new Error('Choose a PNG or JPEG image.')
  const url = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => { const node = new Image(); node.onload = () => resolve(node); node.onerror = () => reject(new Error('This image could not be read.')); node.src = url })
    for (const max of [800, 600, 400]) {
      const scale = Math.min(1, max / Math.max(image.width, image.height)), canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale))
      canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height)
      const data = file.type === 'image/png' ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.9)
      if (data.length < 650_000) return data
    }
    throw new Error('This image is too detailed. Use a smaller logo file.')
  } finally { URL.revokeObjectURL(url) }
}

function useCompactLayout() {
  const query = '(max-width: 1380px)'
  const [compact, setCompact] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const media = window.matchMedia(query), change = () => setCompact(media.matches)
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])
  return compact
}

function Card({ title, help, children, actions }: { title: string; help?: string; children: ReactNode; actions?: ReactNode }) {
  return <section className="panel lh-card"><div className="lh-card-head"><div><h3>{title}</h3>{help && <p>{help}</p>}</div>{actions}</div>{children}</section>
}

export function LetterheadPage() {
  const [loaded, setLoaded] = useState<{ design: Letterhead; updatedAt: string | null; isDefault: boolean } | null>(null)
  const [error, setError] = useState(''), [savedNotice, setSavedNotice] = useState('')
  useEffect(() => { void api.letterhead().then(setLoaded).catch(reason => setError(errorText(reason))) }, [])
  if (!loaded) return <><PageHeader eyebrow="Platform setup" title="Letterhead Designer" description="The letterhead printed on every invoice and quotation."/>{error ? <div className="alert error">{error}</div> : <div className="loading-bar">Loading letterhead…</div>}</>
  // Saving remounts the designer on the new version, so the confirmation lives here.
  return <Designer key={loaded.updatedAt ?? 'default'} saved={loaded} initialNotice={savedNotice} onSaved={(value, message) => { setSavedNotice(message); setLoaded(value) }}/>
}

function Designer({ saved, initialNotice, onSaved }: { saved: { design: Letterhead; updatedAt: string | null; isDefault: boolean }; initialNotice: string; onSaved: (value: { design: Letterhead; updatedAt: string | null; isDefault: boolean }, message: string) => void }) {
  const history = useLetterheadDraft(saved.design)
  const { draft, update } = history
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState(''), [notice, setNotice] = useState(initialNotice)
  const [saving, setSaving] = useState(false), [previewing, setPreviewing] = useState(false), [preview, setPreview] = useState<string | null>(null)
  const selected = draft.elements.find(element => element.id === selectedId) ?? null
  const compact = useCompactLayout()
  const outside = outsideBand(draft)

  const setElements = useCallback((elements: LetterheadElement[], transient = false) => update(current => ({ ...current, elements }), transient), [update])
  const patch = (changes: Partial<LetterheadElement>) => {
    if (!selected) return
    update(current => ({ ...current, elements: current.elements.map(element => {
      if (element.id !== selected.id) return element
      const next = { ...element, ...changes }
      // A bigger font grows the box so the text keeps fitting.
      if (changes.fontMm !== undefined && next.hMm < changes.fontMm * 1.35) next.hMm = changes.fontMm * 1.35
      return clampElement(next, bandFrame(current, next.band))
    }) }))
  }
  const add = (kind: ElementKind, band: Band = 'header') => {
    const frame = bandFrame(draft, band)
    if (frame.height <= 0) { setError('Give the footer a height before adding elements to it.'); return }
    const element = defaultElement(kind, band, frame, draft.accent)
    setElements([...draft.elements, element]); setSelectedId(element.id)
  }
  const reorder = (direction: 1 | -1) => {
    if (!selected) return
    const list = [...draft.elements], index = list.findIndex(element => element.id === selected.id), target = index + direction
    if (target < 0 || target >= list.length) return
    ;[list[index], list[target]] = [list[target]!, list[index]!]
    setElements(list)
  }

  async function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ''
    if (!file) return
    try { patch({ src: await readImage(file) }); setError('') } catch (reason) { setError(errorText(reason)) }
  }
  // Points at the element to fix instead of only showing the server's message.
  const blocked = () => {
    const missing = draft.elements.find(element => element.kind === 'image' && !element.src)
    if (!missing) return false
    setSelectedId(missing.id); setNotice('')
    setError('A logo / image element has no picture yet. It is selected — choose an image in Properties, or delete it.')
    return true
  }
  async function save() {
    if (blocked()) return
    setSaving(true); setError(''); setNotice('')
    try { const result = await api.saveLetterhead(draft); clearStoredDraft(); onSaved(result.data, result.message) } catch (reason) { setError(errorText(reason)) } finally { setSaving(false) }
  }
  async function showPreview() {
    if (blocked()) return
    setPreviewing(true); setError('')
    try { const blob = await api.letterheadPreview(draft); setPreview(current => { if (current) URL.revokeObjectURL(current); return URL.createObjectURL(blob) }) } catch (reason) { setError(errorText(reason)) } finally { setPreviewing(false) }
  }
  const closePreview = () => setPreview(current => { if (current) URL.revokeObjectURL(current); return null })

  const company = (key: keyof Company, value: string) => update(current => ({ ...current, company: { ...current.company, [key]: value } }))
  const bandHeight = (key: 'headerMm' | 'footerMm', value: number) => update(current => ({ ...current, [key]: Math.max(key === 'headerMm' ? 15 : 0, Math.min(key === 'headerMm' ? 120 : 60, value || 0)) }))
  const shape = selected ? shapeOf(selected.kind) : null

  return <>
    <PageHeader eyebrow="Platform setup" title="Letterhead Designer" description="Design once — the header and footer print on every invoice and quotation, with your company details filled in automatically."
      actions={<div className="header-actions">
        <button className="button ghost" disabled={!history.canUndo} onClick={history.undo} title="Undo (Ctrl+Z)">Undo</button>
        <button className="button ghost" disabled={!history.canRedo} onClick={history.redo} title="Redo (Ctrl+Y)">Redo</button>
        <button className="button ghost" disabled={previewing} onClick={() => void showPreview()}>{previewing ? 'Rendering…' : 'Preview PDF'}</button>
        <button className="button primary" disabled={saving || !history.dirty || outside.length > 0} onClick={() => void save()}>{saving ? 'Saving…' : 'Save letterhead'}</button>
      </div>}/>
    {history.restoredAt && <div className="alert info lh-restored">Restored unsaved changes from {new Date(history.restoredAt).toLocaleString()}.<button className="button ghost" onClick={() => { history.reset(saved.design); history.dismissRestored() }}>Discard them</button><button className="button ghost" onClick={history.dismissRestored}>Keep editing</button></div>}
    {error && <div className="alert error">{error}</div>}{notice && <div className="alert success">{notice}</div>}
    {outside.length > 0 && <div className="alert error">{outside.length} element{outside.length === 1 ? ' is' : 's are'} outside {outside.length === 1 ? 'its' : 'their'} band (outlined in orange). Move or resize {outside.length === 1 ? 'it' : 'them'}, or make the band taller, before saving.</div>}
    <div className="lh-status">{saved.isDefault ? 'Using the built-in letterhead — nothing saved yet.' : `Last saved ${saved.updatedAt ? new Date(saved.updatedAt).toLocaleString() : ''}.`}{history.dirty ? ' · Unsaved changes (kept in this browser until you save).' : ''}</div>

    {/* Wide screens: details and elements | canvas | properties and layers. Narrower
        screens keep Properties beside the canvas so a selected element is editable in place. */}
    {compact ? <div className="lh-layout compact">
      <div className="lh-column">
        <Card title={selected ? KIND_INFO[selected.kind].label : 'Properties'} help={selected ? undefined : 'Select an element on the canvas to edit it.'}
          actions={selected && <div className="lh-mini-actions">
            <button type="button" title="Duplicate (Ctrl+D)" onClick={() => { const copy = clampElement({ ...selected, id: `${selected.id}-copy-${Date.now().toString(36)}`, xMm: selected.xMm + 3, yMm: selected.yMm + 3 }, bandFrame(draft, selected.band)); setElements([...draft.elements, copy]); setSelectedId(copy.id) }}>Duplicate</button>
            <button type="button" className="danger" title="Delete" onClick={() => { setElements(draft.elements.filter(element => element.id !== selected.id)); setSelectedId(null) }}>Delete</button>
          </div>}>
          {selected && <div className="lh-fields">
            {selected.kind === 'text' && <label><span className="lh-label">Text</span><textarea rows={2} value={selected.text ?? ''} onChange={event => patch({ text: event.target.value })}/></label>}
            {KIND_INFO[selected.kind].field && <label><span className="lh-label">Prefix</span><input value={selected.prefix ?? ''} placeholder="e.g. GSTIN: " onChange={event => patch({ prefix: event.target.value })}/></label>}
            {shape === 'text' && <>
              <div className="lh-fields three">
                <label><span className="lh-label">Size (pt)</span><input type="number" min={3} max={70} step={0.5} value={Math.round((selected.fontMm ?? 3.5) * PT_PER_MM * 2) / 2} onChange={event => patch({ fontMm: Number(event.target.value) / PT_PER_MM })}/></label>
                <label><span className="lh-label">Colour</span><input type="color" value={selected.color ?? '#101828'} onChange={event => patch({ color: event.target.value.toUpperCase() })}/></label>
                <label><span className="lh-label">Style</span><div className="lh-toggle"><button type="button" className={selected.bold ? 'on' : ''} onClick={() => patch({ bold: !selected.bold })}><b>B</b></button><button type="button" className={selected.italic ? 'on' : ''} onClick={() => patch({ italic: !selected.italic })}><i>I</i></button></div></label>
              </div>
            </>}
            {(shape === 'text' || shape === 'image') && <label><span className="lh-label">Align</span><div className="lh-toggle wide">{(['left', 'center', 'right'] as const).map(align => <button key={align} type="button" className={(selected.align ?? 'left') === align ? 'on' : ''} onClick={() => patch({ align })}>{align[0]!.toUpperCase() + align.slice(1)}</button>)}</div></label>}
            {shape === 'image' && <label><span className="lh-label">{selected.src ? 'Replace image' : 'Image'}</span><input type="file" accept="image/png,image/jpeg" onChange={event => void chooseImage(event)}/><small className="lh-help">PNG keeps a transparent background. Resized automatically.</small></label>}
            {shape === 'line' && <div className="lh-fields three">
              <label><span className="lh-label">Colour</span><input type="color" value={selected.stroke ?? draft.accent} onChange={event => patch({ stroke: event.target.value.toUpperCase() })}/></label>
              <label><span className="lh-label">Weight (mm)</span><input type="number" min={0.1} max={5} step={0.1} value={selected.strokeMm ?? 0.3} onChange={event => patch({ strokeMm: Number(event.target.value) })}/></label>
            </div>}
            {shape === 'rect' && <div className="lh-fields three">
              <label><span className="lh-label">Fill</span><input type="color" value={selected.fill ?? '#FFFFFF'} onChange={event => patch({ fill: event.target.value.toUpperCase() })}/></label>
              <label><span className="lh-label">Border</span><input type="color" value={selected.stroke ?? '#D0D5DD'} onChange={event => patch({ stroke: event.target.value.toUpperCase(), strokeMm: selected.strokeMm || 0.3 })}/></label>
              <label><span className="lh-label">Border (mm)</span><input type="number" min={0} max={5} step={0.1} value={selected.strokeMm ?? 0} onChange={event => patch({ strokeMm: Number(event.target.value) })}/></label>
              <label><span className="lh-label">Corner (mm)</span><input type="number" min={0} max={20} step={0.5} value={selected.radiusMm ?? 0} onChange={event => patch({ radiusMm: Number(event.target.value) })}/></label>
              <label className="lh-check"><input type="checkbox" checked={!selected.fill} onChange={event => patch({ fill: event.target.checked ? null : draft.accent })}/> No fill</label>
            </div>}
            <div className="lh-fields four">{(['xMm', 'yMm', 'wMm', 'hMm'] as const).map(key => <label key={key}><span className="lh-label">{({ xMm: 'X', yMm: 'Y', wMm: 'W', hMm: 'H' })[key]} (mm)</span><input type="number" step={0.5} value={selected[key]} onChange={event => patch({ [key]: Number(event.target.value) })}/></label>)}</div>
            <label><span className="lh-label">Band</span><select value={selected.band} onChange={event => patch({ band: event.target.value as Band, yMm: 0 })}><option value="header">Header</option><option value="footer" disabled={draft.footerMm <= 0}>Footer</option></select></label>
          </div>}
        </Card>
        <Card title="Elements" help="Drag onto the header or footer, or click to add to the header.">
          <div className="lh-palette">{PALETTE.map(kind => <button key={kind} type="button" className="lh-tile" draggable onDragStart={event => { event.dataTransfer.setData(DRAG_KIND, kind); event.dataTransfer.effectAllowed = 'copy' }} onClick={() => add(kind)}>
            <span className="lh-tile-glyph">{PALETTE_GLYPH[kind]}</span><span><b>{KIND_INFO[kind].label}</b><small>{KIND_INFO[kind].hint}</small></span>
          </button>)}</div>
        </Card>
        <Card title="Layers" help="Later layers print on top. Select to edit.">
          {(['header', 'footer'] as const).map(band => <div key={band} className="lh-layer-group"><span className="lh-layer-band">{band === 'header' ? 'Header' : 'Footer'}</span>
            {draft.elements.filter(element => element.band === band).length === 0 && <small className="lh-help">No elements</small>}
            {draft.elements.filter(element => element.band === band).map(element => <button key={element.id} type="button" className={`lh-layer${element.id === selectedId ? ' on' : ''}${outside.some(item => item.id === element.id) ? ' warn' : ''}`} onClick={() => setSelectedId(element.id)}>
              <span className="lh-tile-glyph small">{PALETTE_GLYPH[element.kind]}</span>{element.kind === 'text' ? (element.text || 'Text').slice(0, 26) : KIND_INFO[element.kind].label}
            </button>)}
          </div>)}
          {selected && <div className="lh-mini-actions"><button type="button" onClick={() => reorder(-1)}>Send backward</button><button type="button" onClick={() => reorder(1)}>Bring forward</button></div>}
        </Card>
        <Card title="Company details" help="Company elements on the letterhead show these values. A GSTIN titles invoices “TAX INVOICE”.">
          <div className="lh-fields">{COMPANY_FIELDS.map(([key, label, placeholder]) => <label key={key}><FieldLabel required={key === 'name'}>{label}</FieldLabel>{key === 'address' ? <textarea rows={2} value={draft.company[key]} placeholder={placeholder} onChange={event => company(key, event.target.value)}/> : <input value={draft.company[key]} placeholder={placeholder} onChange={event => company(key, key === 'gstin' ? event.target.value.toUpperCase() : event.target.value)}/>}</label>)}</div>
        </Card>
        <Card title="Page" help="Band heights in mm. Invoice content prints between them.">
          <div className="lh-fields three">
            <label><span className="lh-label">Header</span><input type="number" min={15} max={120} value={draft.headerMm} onChange={event => bandHeight('headerMm', Number(event.target.value))}/></label>
            <label><span className="lh-label">Footer</span><input type="number" min={0} max={60} value={draft.footerMm} onChange={event => bandHeight('footerMm', Number(event.target.value))}/></label>
            <label><span className="lh-label">Accent</span><input type="color" value={draft.accent} onChange={event => update(current => ({ ...current, accent: event.target.value.toUpperCase() }))}/></label>
          </div>
          <button type="button" className="button ghost lh-reset" onClick={() => { if (confirm('Replace the design with the built-in letterhead? Company details are kept.')) { history.update(current => ({ ...DEFAULT_LETTERHEAD, company: current.company })); setSelectedId(null) } }}>Start from the built-in layout</button>
        </Card>
      </div>
      <Card title="Canvas" help="What prints at the top and bottom of every page.">
        <LetterheadCanvas draft={draft} selectedId={selectedId} onSelect={setSelectedId} onChange={setElements} onBegin={history.begin} onEnd={history.end} onUndo={history.undo} onRedo={history.redo}/>
      </Card>
    </div> : <div className="lh-layout">
      <div className="lh-column">
        <Card title="Company details" help="Company elements on the letterhead show these values. A GSTIN titles invoices “TAX INVOICE”.">
          <div className="lh-fields">{COMPANY_FIELDS.map(([key, label, placeholder]) => <label key={key}><FieldLabel required={key === 'name'}>{label}</FieldLabel>{key === 'address' ? <textarea rows={2} value={draft.company[key]} placeholder={placeholder} onChange={event => company(key, event.target.value)}/> : <input value={draft.company[key]} placeholder={placeholder} onChange={event => company(key, key === 'gstin' ? event.target.value.toUpperCase() : event.target.value)}/>}</label>)}</div>
        </Card>
        <Card title="Elements" help="Drag onto the header or footer, or click to add to the header.">
          <div className="lh-palette">{PALETTE.map(kind => <button key={kind} type="button" className="lh-tile" draggable onDragStart={event => { event.dataTransfer.setData(DRAG_KIND, kind); event.dataTransfer.effectAllowed = 'copy' }} onClick={() => add(kind)}>
            <span className="lh-tile-glyph">{PALETTE_GLYPH[kind]}</span><span><b>{KIND_INFO[kind].label}</b><small>{KIND_INFO[kind].hint}</small></span>
          </button>)}</div>
        </Card>
        <Card title="Page" help="Band heights in mm. Invoice content prints between them.">
          <div className="lh-fields three">
            <label><span className="lh-label">Header</span><input type="number" min={15} max={120} value={draft.headerMm} onChange={event => bandHeight('headerMm', Number(event.target.value))}/></label>
            <label><span className="lh-label">Footer</span><input type="number" min={0} max={60} value={draft.footerMm} onChange={event => bandHeight('footerMm', Number(event.target.value))}/></label>
            <label><span className="lh-label">Accent</span><input type="color" value={draft.accent} onChange={event => update(current => ({ ...current, accent: event.target.value.toUpperCase() }))}/></label>
          </div>
          <button type="button" className="button ghost lh-reset" onClick={() => { if (confirm('Replace the design with the built-in letterhead? Company details are kept.')) { history.update(current => ({ ...DEFAULT_LETTERHEAD, company: current.company })); setSelectedId(null) } }}>Start from the built-in layout</button>
        </Card>
      </div>
      <Card title="Canvas" help="What prints at the top and bottom of every page.">
        <LetterheadCanvas draft={draft} selectedId={selectedId} onSelect={setSelectedId} onChange={setElements} onBegin={history.begin} onEnd={history.end} onUndo={history.undo} onRedo={history.redo}/>
      </Card>
      <div className="lh-column">
        <Card title={selected ? KIND_INFO[selected.kind].label : 'Properties'} help={selected ? undefined : 'Select an element on the canvas to edit it.'}
          actions={selected && <div className="lh-mini-actions">
            <button type="button" title="Duplicate (Ctrl+D)" onClick={() => { const copy = clampElement({ ...selected, id: `${selected.id}-copy-${Date.now().toString(36)}`, xMm: selected.xMm + 3, yMm: selected.yMm + 3 }, bandFrame(draft, selected.band)); setElements([...draft.elements, copy]); setSelectedId(copy.id) }}>Duplicate</button>
            <button type="button" className="danger" title="Delete" onClick={() => { setElements(draft.elements.filter(element => element.id !== selected.id)); setSelectedId(null) }}>Delete</button>
          </div>}>
          {selected && <div className="lh-fields">
            {selected.kind === 'text' && <label><span className="lh-label">Text</span><textarea rows={2} value={selected.text ?? ''} onChange={event => patch({ text: event.target.value })}/></label>}
            {KIND_INFO[selected.kind].field && <label><span className="lh-label">Prefix</span><input value={selected.prefix ?? ''} placeholder="e.g. GSTIN: " onChange={event => patch({ prefix: event.target.value })}/></label>}
            {shape === 'text' && <>
              <div className="lh-fields three">
                <label><span className="lh-label">Size (pt)</span><input type="number" min={3} max={70} step={0.5} value={Math.round((selected.fontMm ?? 3.5) * PT_PER_MM * 2) / 2} onChange={event => patch({ fontMm: Number(event.target.value) / PT_PER_MM })}/></label>
                <label><span className="lh-label">Colour</span><input type="color" value={selected.color ?? '#101828'} onChange={event => patch({ color: event.target.value.toUpperCase() })}/></label>
                <label><span className="lh-label">Style</span><div className="lh-toggle"><button type="button" className={selected.bold ? 'on' : ''} onClick={() => patch({ bold: !selected.bold })}><b>B</b></button><button type="button" className={selected.italic ? 'on' : ''} onClick={() => patch({ italic: !selected.italic })}><i>I</i></button></div></label>
              </div>
            </>}
            {(shape === 'text' || shape === 'image') && <label><span className="lh-label">Align</span><div className="lh-toggle wide">{(['left', 'center', 'right'] as const).map(align => <button key={align} type="button" className={(selected.align ?? 'left') === align ? 'on' : ''} onClick={() => patch({ align })}>{align[0]!.toUpperCase() + align.slice(1)}</button>)}</div></label>}
            {shape === 'image' && <label><span className="lh-label">{selected.src ? 'Replace image' : 'Image'}</span><input type="file" accept="image/png,image/jpeg" onChange={event => void chooseImage(event)}/><small className="lh-help">PNG keeps a transparent background. Resized automatically.</small></label>}
            {shape === 'line' && <div className="lh-fields three">
              <label><span className="lh-label">Colour</span><input type="color" value={selected.stroke ?? draft.accent} onChange={event => patch({ stroke: event.target.value.toUpperCase() })}/></label>
              <label><span className="lh-label">Weight (mm)</span><input type="number" min={0.1} max={5} step={0.1} value={selected.strokeMm ?? 0.3} onChange={event => patch({ strokeMm: Number(event.target.value) })}/></label>
            </div>}
            {shape === 'rect' && <div className="lh-fields three">
              <label><span className="lh-label">Fill</span><input type="color" value={selected.fill ?? '#FFFFFF'} onChange={event => patch({ fill: event.target.value.toUpperCase() })}/></label>
              <label><span className="lh-label">Border</span><input type="color" value={selected.stroke ?? '#D0D5DD'} onChange={event => patch({ stroke: event.target.value.toUpperCase(), strokeMm: selected.strokeMm || 0.3 })}/></label>
              <label><span className="lh-label">Border (mm)</span><input type="number" min={0} max={5} step={0.1} value={selected.strokeMm ?? 0} onChange={event => patch({ strokeMm: Number(event.target.value) })}/></label>
              <label><span className="lh-label">Corner (mm)</span><input type="number" min={0} max={20} step={0.5} value={selected.radiusMm ?? 0} onChange={event => patch({ radiusMm: Number(event.target.value) })}/></label>
              <label className="lh-check"><input type="checkbox" checked={!selected.fill} onChange={event => patch({ fill: event.target.checked ? null : draft.accent })}/> No fill</label>
            </div>}
            <div className="lh-fields four">{(['xMm', 'yMm', 'wMm', 'hMm'] as const).map(key => <label key={key}><span className="lh-label">{({ xMm: 'X', yMm: 'Y', wMm: 'W', hMm: 'H' })[key]} (mm)</span><input type="number" step={0.5} value={selected[key]} onChange={event => patch({ [key]: Number(event.target.value) })}/></label>)}</div>
            <label><span className="lh-label">Band</span><select value={selected.band} onChange={event => patch({ band: event.target.value as Band, yMm: 0 })}><option value="header">Header</option><option value="footer" disabled={draft.footerMm <= 0}>Footer</option></select></label>
          </div>}
        </Card>
        <Card title="Layers" help="Later layers print on top. Select to edit.">
          {(['header', 'footer'] as const).map(band => <div key={band} className="lh-layer-group"><span className="lh-layer-band">{band === 'header' ? 'Header' : 'Footer'}</span>
            {draft.elements.filter(element => element.band === band).length === 0 && <small className="lh-help">No elements</small>}
            {draft.elements.filter(element => element.band === band).map(element => <button key={element.id} type="button" className={`lh-layer${element.id === selectedId ? ' on' : ''}${outside.some(item => item.id === element.id) ? ' warn' : ''}`} onClick={() => setSelectedId(element.id)}>
              <span className="lh-tile-glyph small">{PALETTE_GLYPH[element.kind]}</span>{element.kind === 'text' ? (element.text || 'Text').slice(0, 26) : KIND_INFO[element.kind].label}
            </button>)}
          </div>)}
          {selected && <div className="lh-mini-actions"><button type="button" onClick={() => reorder(-1)}>Send backward</button><button type="button" onClick={() => reorder(1)}>Bring forward</button></div>}
        </Card>
      </div>
    </div>}
    {preview && <Modal title="Letterhead preview — sample invoice" wide onClose={closePreview}><iframe className="lh-preview" src={preview} title="Letterhead preview PDF"/><p className="lh-help">This is the real PDF your clients receive, using the unsaved design. Save to apply it.</p></Modal>}
  </>
}
