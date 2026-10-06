import { useMemo, useRef, useState } from 'react'
import { Alert, App as AntApp, Button, Card, Checkbox, Collapse, Input, InputNumber, Popconfirm, Radio, Segmented, Select, Tag, Tooltip } from 'antd'
import {
  AppstoreAddOutlined,
  BarcodeOutlined,
  CheckOutlined,
  CopyOutlined,
  DeleteOutlined,
  FontColorsOutlined,
  HolderOutlined,
  PlusOutlined,
  QrcodeOutlined,
  RedoOutlined,
  SaveOutlined,
  UndoOutlined,
} from '@ant-design/icons'
import { useDb } from '../mock/db'
import { templates as templatesApi, productQr, qrUrl, type TemplateInput } from '../api'
import { PageHeader } from '../components/common'
import { LabelRoll } from '../components/LabelPreview'
import { DEFAULT_FIELDS } from '../mock/seed'
import { renderPrn } from '../lib/prnRenderer'
import { labelContentBox } from '../lib/labelLayout'
import { ELEMENT_INFO, FIELD_ORDER, autoLayout, clampElement, defaultElement, labelFrame, newElementId, scaleElements, shapeOf, validateElements, type ElementData } from '../lib/freeLayout'
import { cx } from '../lib/format'
import { fmtDateTime } from '../lib/dates'
import { sheetGeometry, type PageMode, type Rotation } from '../print/geometry'
import type { LabelElement, LabelElementKind, LabelTemplate, Printer, Product } from '../types'
import { LabelCanvas } from './templates/LabelCanvas'
import { DRAG_KIND } from './templates/canvasMath'
import { ElementToolbar } from './templates/ElementToolbar'
import { clearDraft, normalizeInput, readDraft, useTemplateDraft } from './templates/templateDraft'

const SIZES = [
  { w: 38, h: 25 },
  { w: 50, h: 25 },
  { w: 50, h: 30 },
  { w: 50, h: 38 },
  { w: 75, h: 50 },
  { w: 100, h: 50 },
]

const blankTemplate = (): TemplateInput =>
  normalizeInput({ name: '', widthMm: 50, heightMm: 25, columns: 2, gapMm: 2, pageMode: 'ROW', rotate: 0, orientation: 'LANDSCAPE', fields: { ...DEFAULT_FIELDS }, barcodeType: 'CODE128' })

/** Shown in the designer when the shop has no products yet. */
const SAMPLE_PRODUCT: Product = {
  id: 'sample', globalId: 'prd_sample', productCode: '10010415', eanCode: null, pluCode: null, name: 'TOOR DAL 1KG', category: 'Groceries', brand: '', mrp: 195, salePrice: 168,
  taxPercent: 5, unit: 'KG', packedDate: new Date().toISOString().slice(0, 10), expiryRule: 'MONTHS_6', shelfLifeMonths: null, expiryDate: null, shopId: '', status: 'ACTIVE', createdAt: '', updatedAt: '',
}

/** `embedded`: shown as a tab inside Printers, so it skips the page title. */
export function TemplatesPage({ embedded = false }: { embedded?: boolean }) {
  const db = useDb()
  const { message } = AntApp.useApp()
  const [selectedId, setSelectedId] = useState<string>(db.templates[0]?.id ?? 'new')
  const [newSeed, setNewSeed] = useState<{ version: number; input: TemplateInput }>(() => ({ version: 0, input: blankTemplate() }))
  const selected = db.templates.find((t) => t.id === selectedId)
  const editingNew = !selected

  const startNew = (input: TemplateInput = blankTemplate()) => {
    clearDraft('new')
    setNewSeed((s) => ({ version: s.version + 1, input }))
    setSelectedId('new')
  }

  const header = embedded ? null : <PageHeader title="Label templates" subtitle="Design labels on the canvas. Printed PRN and browser print follow the same layout." />

  return (
    <>
      {header}
      <TemplateEditor
        // Remount per template (and after each save) so the draft and undo history belong to it.
        key={selected ? `${selected.id}:${selected.updatedAt}` : `new:${newSeed.version}`}
        template={selected ?? null}
        seed={newSeed.input}
        templates={db.templates}
        onSelect={setSelectedId}
        onNew={() => startNew()}
        onDuplicate={(input) => startNew({ ...input, name: `${input.name} copy`, elements: input.elements?.map((e) => ({ ...e, id: newElementId() })) })}
        onCreated={(id) => {
          setSelectedId(id)
          message.success('Template created')
        }}
        editingNew={editingNew}
      />
    </>
  )
}

function TemplateEditor({
  template,
  seed,
  templates,
  editingNew,
  onSelect,
  onNew,
  onDuplicate,
  onCreated,
}: {
  template: LabelTemplate | null
  seed: TemplateInput
  templates: LabelTemplate[]
  editingNew: boolean
  onSelect: (id: string) => void
  onNew: () => void
  onDuplicate: (input: TemplateInput) => void
  onCreated: (id: string) => void
}) {
  const db = useDb()
  const { message } = AntApp.useApp()
  const storageKey = template?.id ?? 'new'
  const base = useMemo(() => (template ? normalizeInput(template) : seed), [template, seed])
  const history = useTemplateDraft(storageKey, base)
  const { draft, update } = history
  const [selectedEl, setSelectedEl] = useState<string | null>(null)
  /** Fields unticked in this session, so ticking them again restores their position. */
  const hiddenElements = useRef(new Map<LabelElementKind, LabelElement>())
  const [sampleId, setSampleId] = useState(db.products[0]?.id)
  const [lang, setLang] = useState<Printer['language']>('TSPL')
  const [saving, setSaving] = useState(false)

  const frame = labelFrame(draft)
  const elements = draft.elements ?? []
  const sel = elements.find((e) => e.id === selectedEl) ?? null
  const usedBy = template ? db.printers.filter((p) => p.templateId === template.id) : []

  const sample = db.products.find((p) => p.id === sampleId) ?? db.products[0] ?? SAMPLE_PRODUCT
  const sampleBatch = db.batches.filter((b) => b.productId === sample.id).sort((a, b) => b.packedDate.localeCompare(a.packedDate))[0] ?? null
  const qr = productQr(db, sample.id)
  const shop = db.shops.find((s) => s.id === sample.shopId) ?? db.shops[0]
  const data: ElementData = { product: sample, batch: sampleBatch, shop, qrUrl: qr ? qrUrl(qr.id) : 'https://example.com/q/sample' }

  let layoutError = ''
  try {
    labelContentBox(draft)
    validateElements(draft)
  } catch (e) {
    layoutError = (e as Error).message
  }

  const prn = useMemo(() => {
    const printer: Printer = { id: 'x', name: 'Preview', manufacturer: 'Other', model: '', language: lang, connectionType: 'USB', address: '', dpi: 203, templateId: '', status: 'CONNECTED', lastSeenAt: '', shopId: '' }
    try {
      return renderPrn({ ...draft, id: 'draft', createdAt: '', updatedAt: '' }, printer, { product: sample, batch: sampleBatch, shop, qrUrl: data.qrUrl ?? '', quantity: draft.columns * 2 })
    } catch (e) {
      return `; ${(e as Error).message}`
    }
  }, [draft, sample, sampleBatch, shop, data.qrUrl, lang])

  const setElements = (next: LabelElement[], transient = false) => update((d) => ({ ...d, elements: next }), transient)
  const replaceEl = (el: LabelElement) => setElements(elements.map((e) => (e.id === el.id ? el : e)))
  const addElement = (kind: LabelElementKind) => {
    // Below the lowest element, so new fields do not pile up on each other.
    const bottom = elements.reduce((y, e) => Math.max(y, e.yMm + e.hMm), 0)
    const el = defaultElement(kind, frame)
    const placed = clampElement({ ...el, xMm: 1, yMm: bottom + el.hMm <= frame.height ? bottom : el.yMm }, frame)
    setElements([...elements, placed])
    setSelectedEl(placed.id)
  }
  /** Size or orientation change: the design scales with the label. */
  const resizeLabel = (patch: Partial<TemplateInput>) =>
    update((d) => {
      const next = { ...d, ...patch }
      return { ...next, elements: scaleElements(d.elements ?? [], labelFrame(d), labelFrame(next)) }
    })

  const save = async () => {
    if (layoutError) return message.error(layoutError)
    if (!draft.name.trim()) return message.error('Give the template a name')
    setSaving(true)
    try {
      if (template) {
        await templatesApi.update(template.id, draft)
        clearDraft(template.id)
        message.success('Template saved. Every product printed with it uses the new design.')
      } else {
        const t = await templatesApi.create(draft)
        clearDraft('new')
        onCreated(t.id)
      }
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const placed = new Set(elements.map((e) => e.kind))
  const rowWidthMm = frame.width * draft.columns + (draft.gapMm ?? 2) * (draft.columns - 1)
  const previewScale = Math.min(4.4, 300 / rowWidthMm)
  const paper = sheetGeometry({ ...draft, id: 'd', createdAt: '', updatedAt: '' } as LabelTemplate, draft)

  return (
    <div className="space-y-3">
      {/* Top bar: pick a template, name it, undo/redo, save. */}
      <Card styles={{ body: { padding: 12 } }}>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Template"
            className="w-[300px]"
            value={editingNew ? 'new' : template?.id}
            onChange={(id: string) => (id === 'new' ? onNew() : onSelect(id))}
            options={[
              ...templates.map((t) => {
                const n = db.printers.filter((p) => p.templateId === t.id).length
                const hasDraft = !!readDraft(t.id)
                return {
                  value: t.id,
                  label: (
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate">{t.name}</span>
                      <span className="shrink-0 text-[11px] text-muted">
                        {t.widthMm}×{t.heightMm} · {t.columns}UP{n ? ` · ${n} printer${n === 1 ? '' : 's'}` : ''}
                        {hasDraft && <Tag color="orange" variant="filled" className="ml-1! mr-0! text-[10px]! leading-4!">draft</Tag>}
                      </span>
                    </span>
                  ),
                }
              }),
              ...(editingNew ? [{ value: 'new', label: <span className="font-medium">New template…</span> }] : []),
            ]}
          />
          <Button icon={<PlusOutlined />} onClick={onNew}>New</Button>
          <Input aria-label="Template name" className="w-[220px]!" placeholder="Template name, e.g. Grocery-50x25" value={draft.name} onChange={(e) => update((d) => ({ ...d, name: e.target.value }))} />
          <div className="mx-1 flex items-center gap-1">
            <Tooltip title="Undo (Ctrl+Z)"><Button aria-label="Undo" icon={<UndoOutlined />} disabled={!history.canUndo} onClick={history.undo} /></Tooltip>
            <Tooltip title="Redo (Ctrl+Y)"><Button aria-label="Redo" icon={<RedoOutlined />} disabled={!history.canRedo} onClick={history.redo} /></Tooltip>
          </div>
          <span className="text-[12px] text-muted" role="status">
            {history.dirty
              ? history.savedLocallyAt
                ? <>Draft kept on this device · {fmtDateTime(history.savedLocallyAt)}</>
                : 'Unsaved changes'
              : <><CheckOutlined className="mr-1 text-green-600" />{template ? 'Saved' : 'Not created yet'}</>}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {history.dirty && template && (
              <Popconfirm title="Discard the unsaved changes?" description="The template goes back to its last saved design." okText="Discard" okButtonProps={{ danger: true }} onConfirm={history.discard}>
                <Button type="text">Discard</Button>
              </Popconfirm>
            )}
            {template && <Tooltip title="Duplicate"><Button aria-label="Duplicate template" icon={<CopyOutlined />} onClick={() => onDuplicate(draft)} /></Tooltip>}
            {template && (
              <Popconfirm
                title="Delete this template?"
                description={usedBy.length ? `Used by ${usedBy.map((p) => p.name).join(', ')}. Pick another template for those printers first.` : undefined}
                okButtonProps={{ danger: true, disabled: usedBy.length > 0 }}
                onConfirm={async () => {
                  try {
                    await templatesApi.remove(template.id)
                    clearDraft(template.id)
                    const next = templates.find((t) => t.id !== template.id)
                    if (next) onSelect(next.id)
                    else onNew()
                    message.success('Template deleted')
                  } catch (e) {
                    message.error((e as Error).message)
                  }
                }}
              >
                <Tooltip title="Delete"><Button aria-label="Delete template" danger icon={<DeleteOutlined />} /></Tooltip>
              </Popconfirm>
            )}
            <Button type="primary" icon={<SaveOutlined />} loading={saving} disabled={(!history.dirty && !!template) || !!layoutError} onClick={save}>
              {template ? 'Save template' : 'Create template'}
            </Button>
          </div>
        </div>
        {history.restoredAt && (
          <Alert
            className="mt-2!"
            type="info"
            showIcon
            closable={{ onClose: history.dismissRestored }}
            title={`Restored your unsaved design from ${fmtDateTime(history.restoredAt)}.`}
            action={template ? <Button size="small" onClick={history.discard}>Discard it</Button> : undefined}
          />
        )}
      </Card>

      <div className="grid gap-3 xl:grid-cols-[250px_minmax(0,1fr)] 2xl:grid-cols-[250px_minmax(0,1fr)_340px]">
        {/* Left: palette + label settings */}
        <Card styles={{ body: { padding: 0 } }} className="xl:self-start">
          <Collapse
            ghost
            size="small"
            defaultActiveKey={['elements']}
            items={[
              {
                key: 'elements',
                label: <b>Add to label</b>,
                children: (
                  <div className="space-y-1">
                    <p className="mt-0 mb-2 text-[12px] text-muted">Tick a field to put it on the label, untick to remove it. You can also drag fields onto the label.</p>
                    {[...FIELD_ORDER, 'text' as const].map((kind) => {
                      const isText = kind === 'text'
                      const on = !isText && placed.has(kind)
                      const shape = shapeOf(kind)
                      const toggle = (checked: boolean) => {
                        const hidden = hiddenElements.current.get(kind)
                        if (checked && hidden) {
                          // Bring it back exactly where it was, with its size and style.
                          setElements([...elements, clampElement(hidden, frame)])
                          hiddenElements.current.delete(kind)
                        } else if (checked) addElement(kind)
                        else {
                          const current = elements.find((x) => x.kind === kind)
                          if (current) hiddenElements.current.set(kind, current)
                          setElements(elements.filter((x) => x.kind !== kind))
                          if (sel?.kind === kind) setSelectedEl(null)
                        }
                      }
                      return (
                        <div
                          key={kind}
                          draggable={!on}
                          onDragStart={(e) => {
                            e.dataTransfer.setData(DRAG_KIND, kind)
                            e.dataTransfer.effectAllowed = 'copy'
                          }}
                          className={cx(
                            'flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[13px] transition-colors',
                            on ? 'border-brand/30 bg-brand-soft/40' : 'border-line bg-white hover:border-brand/50',
                            !on && 'cursor-grab',
                          )}
                        >
                          {isText ? (
                            <PlusOutlined className="text-muted" aria-hidden />
                          ) : (
                            <Checkbox aria-label={`Show ${ELEMENT_INFO[kind].label} on the label`} checked={on} onChange={(e) => toggle(e.target.checked)} />
                          )}
                          <button
                            type="button"
                            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-left"
                            title={on ? 'Select it on the label' : 'Add to the label'}
                            onClick={() => (on ? setSelectedEl(elements.find((x) => x.kind === kind)?.id ?? null) : addElement(kind))}
                          >
                            {shape === 'barcode' ? <BarcodeOutlined /> : shape === 'qr' ? <QrcodeOutlined /> : isText ? <AppstoreAddOutlined /> : <FontColorsOutlined />}
                            <span className={cx('flex-1 truncate', !on && !isText && 'text-muted')}>{ELEMENT_INFO[kind].label}</span>
                          </button>
                          {!on && <HolderOutlined className="text-muted" aria-hidden />}
                        </div>
                      )
                    })}
                    <div className="flex gap-2 pt-2">
                      <Popconfirm title="Re-arrange every element automatically?" onConfirm={() => setElements(autoLayout({ ...draft, fields: { ...draft.fields } }))}>
                        <Button size="small" block>Auto arrange</Button>
                      </Popconfirm>
                      <Popconfirm title="Remove everything from the label?" okButtonProps={{ danger: true }} onConfirm={() => { setElements([]); setSelectedEl(null) }}>
                        <Button size="small" block danger disabled={!elements.length}>Clear</Button>
                      </Popconfirm>
                    </div>
                  </div>
                ),
              },
              {
                key: 'size',
                label: <b>Label size & roll</b>,
                children: (
                  <div className="space-y-3 text-[13px]">
                    <Select
                      aria-label="Label size"
                      className="w-full"
                      value={SIZES.some((s) => s.w === draft.widthMm && s.h === draft.heightMm) ? `${draft.widthMm}x${draft.heightMm}` : 'custom'}
                      onChange={(v: string) => {
                        if (v === 'custom') return
                        const [w, h] = v.split('x').map(Number)
                        resizeLabel({ widthMm: w, heightMm: h })
                      }}
                      options={[...SIZES.map((s) => ({ value: `${s.w}x${s.h}`, label: `${s.w} × ${s.h} mm` })), { value: 'custom', label: 'Custom…' }]}
                    />
                    <div className="flex items-center gap-1.5">
                      <InputNumber aria-label="Label width" min={20} max={120} value={draft.widthMm} onChange={(v) => v && resizeLabel({ widthMm: v })} suffix="mm" className="w-full!" />
                      <span className="text-muted">×</span>
                      <InputNumber aria-label="Label height" min={15} max={120} value={draft.heightMm} onChange={(v) => v && resizeLabel({ heightMm: v })} suffix="mm" className="w-full!" />
                    </div>
                    <Radio.Group block value={draft.orientation} onChange={(e) => resizeLabel({ orientation: e.target.value })} optionType="button" options={[{ value: 'LANDSCAPE', label: 'Landscape' }, { value: 'PORTRAIT', label: 'Portrait' }]} />
                    <div>
                      <div className="mb-1 font-medium">Labels across the roll</div>
                      <Radio.Group block value={draft.columns} onChange={(e) => update((d) => ({ ...d, columns: e.target.value }))} optionType="button" buttonStyle="solid" options={[1, 2, 3].map((c) => ({ value: c, label: `${c} UP` }))} />
                    </div>
                    <label className="block">
                      Gap between columns
                      <InputNumber aria-label="Gap between columns" min={0} max={20} step={0.5} value={draft.gapMm ?? 2} onChange={(v) => update((d) => ({ ...d, gapMm: v ?? 0 }))} suffix="mm" className="w-full!" disabled={draft.columns === 1} />
                    </label>
                    <div className="text-[12px] text-muted">Sheet across the liner: <b className="text-ink">{rowWidthMm.toFixed(1)} × {frame.height} mm</b></div>
                  </div>
                ),
              },
              {
                key: 'print',
                label: <b>Printing</b>,
                children: (
                  <div className="space-y-3 text-[13px]">
                    <div>
                      <div className="mb-1 font-medium">Barcode type</div>
                      <Segmented block value={draft.barcodeType} onChange={(v) => update((d) => ({ ...d, barcodeType: v as TemplateInput['barcodeType'] }))} options={[{ value: 'CODE128', label: 'Code 128' }, { value: 'EAN13', label: 'EAN-13' }]} />
                    </div>
                    <div>
                      <div className="mb-1 font-medium">Roll type (TSPL)</div>
                      <Select aria-label="Media tracking" className="w-full" value={draft.mediaMode ?? 'GAP'} onChange={(v) => update((d) => ({ ...d, mediaMode: v }))} options={[{ value: 'GAP', label: 'Stickers with gaps' }, { value: 'CONTINUOUS', label: 'Continuous roll' }]} />
                    </div>
                    <label className="block">
                      Feed gap between rows
                      <InputNumber aria-label="Feed gap between rows" disabled={draft.mediaMode === 'CONTINUOUS'} min={0} max={25} step={0.1} value={draft.rowGapMm ?? 2} onChange={(v) => update((d) => ({ ...d, rowGapMm: v ?? 0 }))} suffix="mm" className="w-full!" />
                    </label>
                    <div>
                      <div className="mb-1 font-medium">Browser print page</div>
                      <Segmented<PageMode> block value={draft.pageMode ?? 'ROW'} onChange={(v) => update((d) => ({ ...d, pageMode: v }))} options={[{ value: 'SINGLE', label: 'One label' }, { value: 'ROW', label: `Row (${draft.columns}UP)` }]} />
                      <Segmented<Rotation> block className="mt-1.5" value={draft.rotate ?? 0} onChange={(v) => update((d) => ({ ...d, rotate: v }))} options={[0, 90, 180, 270].map((r) => ({ value: r as Rotation, label: `${r}°` }))} />
                      <div className="mt-1 text-[12px] text-muted">Paper size: <b className="text-ink">{paper.pageW.toFixed(1)} × {paper.pageH.toFixed(1)} mm</b></div>
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </Card>

        {/* Centre: the canvas */}
        <div className="min-w-0 space-y-2">
          {sel ? (
            <ElementToolbar
              el={sel}
              frame={frame}
              onChange={replaceEl}
              onDelete={() => {
                setElements(elements.filter((e) => e.id !== sel.id))
                setSelectedEl(null)
              }}
              onDuplicate={() => {
                const copy = clampElement({ ...sel, id: newElementId(), xMm: sel.xMm + 2, yMm: sel.yMm + 2 }, frame)
                setElements([...elements, copy])
                setSelectedEl(copy.id)
              }}
            />
          ) : (
            <div className="flex min-h-[42px] items-center rounded-xl border border-dashed border-line bg-white px-3 py-2 text-[12px] text-muted">
              Click an element to change its text size, bold or alignment. Drag it to move; drag a corner to resize.
            </div>
          )}
          {layoutError && <Alert type="error" showIcon title={layoutError} />}
          <LabelCanvas
            draft={draft}
            data={data}
            selectedId={selectedEl}
            onSelect={setSelectedEl}
            onChange={setElements}
            onBegin={history.begin}
            onEnd={history.end}
            onUndo={history.undo}
            onRedo={history.redo}
          />
        </div>

        {/* Right: live preview + PRN, side by side with the canvas on wide screens */}
        <Card
          className="xl:col-span-2 2xl:col-span-1 2xl:self-start"
          title="Preview"
          styles={{ body: { paddingTop: 12 } }}
          extra={
            <Select
              size="small"
              aria-label="Sample product"
              className="w-44"
              value={db.products.length ? sample.id : undefined}
              placeholder="Sample product"
              onChange={setSampleId}
              showSearch={{ optionFilterProp: 'label' }}
              options={db.products.map((p) => ({ value: p.id, label: p.name }))}
            />
          }
        >
          <div className="overflow-x-auto">
            {!layoutError && <LabelRoll template={draft} product={sample} batch={sampleBatch} shop={shop} qrUrl={data.qrUrl} rows={2} scale={previewScale} />}
          </div>
          <p className="mt-2 mb-3 text-[11px] text-muted">
            {draft.columns} across · actual size {frame.width}×{frame.height} mm. Printer fonts differ slightly from the screen.
          </p>
          <div className="mb-2 flex items-center justify-between gap-2">
            <b className="text-[13px]">PRN output</b>
            <Segmented size="small" value={lang} onChange={(v) => setLang(v as Printer['language'])} options={[{ value: 'TSPL', label: 'TSPL' }, { value: 'ZPL', label: 'ZPL' }, { value: 'ESCPOS', label: 'ESC/POS' }]} />
          </div>
          {lang === 'ESCPOS' && <p className="mt-0 text-[11px] text-muted">ESC/POS receipt printers print fields top to bottom; positions are not supported.</p>}
          <pre className="prn-code m-0 max-h-[320px] overflow-auto">{prn}</pre>
        </Card>
      </div>
    </div>
  )
}
