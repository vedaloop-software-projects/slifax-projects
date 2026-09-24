import { useEffect, useMemo, useState } from 'react'
import { App as AntApp, Button, Card, Checkbox, Empty, Input, InputNumber, Popconfirm, Radio, Segmented, Select, Tabs, Tag } from 'antd'
import { CopyOutlined, DeleteOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons'
import { useDb } from '../mock/db'
import { templates as templatesApi, productQr, qrUrl, type TemplateInput } from '../api'
import { PageHeader } from '../components/common'
import { LabelRoll } from '../components/LabelPreview'
import { DEFAULT_FIELDS } from '../mock/seed'
import { renderPrn } from '../lib/prnRenderer'
import { cx } from '../lib/format'
import { sheetGeometry, type PageMode, type Rotation } from '../print/geometry'
import type { LabelField, Printer } from '../types'

const SIZES = [
  { w: 38, h: 25 },
  { w: 50, h: 25 },
  { w: 50, h: 30 },
  { w: 50, h: 38 },
  { w: 75, h: 50 },
  { w: 100, h: 50 },
]

const FIELD_LABELS: [LabelField, string][] = [
  ['shopName', 'Shop name'],
  ['address', 'Address / location'],
  ['productName', 'Product name'],
  ['mrp', 'MRP'],
  ['salePrice', 'Sale price'],
  ['barcode', 'Barcode'],
  ['productCode', 'Product code'],
  ['packedDate', 'Packed date'],
  ['expiryDate', 'Expiry date'],
  ['batchCode', 'Batch code'],
  ['qr', 'QR code'],
]

const BLANK: TemplateInput = { name: '', widthMm: 50, heightMm: 25, columns: 2, gapMm: 2, pageMode: 'SINGLE', rotate: 0, orientation: 'LANDSCAPE', fields: { ...DEFAULT_FIELDS }, barcodeType: 'CODE128' }

export function TemplatesPage() {
  const db = useDb()
  const { message } = AntApp.useApp()
  const [selectedId, setSelectedId] = useState<string | 'new'>(db.templates[0]?.id ?? 'new')
  const selected = db.templates.find((t) => t.id === selectedId)
  const [draft, setDraft] = useState<TemplateInput>(selected ?? BLANK)
  const [sampleId, setSampleId] = useState(db.products[0]?.id)
  const [lang, setLang] = useState<Printer['language']>('ZPL')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const t = db.templates.find((x) => x.id === selectedId)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(t ? { name: t.name, widthMm: t.widthMm, heightMm: t.heightMm, columns: t.columns, gapMm: t.gapMm ?? 2, pageMode: t.pageMode ?? 'SINGLE', rotate: t.rotate ?? 0, offsetXMm: t.offsetXMm ?? 0, offsetYMm: t.offsetYMm ?? 0, orientation: t.orientation, fields: { ...t.fields }, barcodeType: t.barcodeType } : { ...BLANK, fields: { ...DEFAULT_FIELDS } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  const sample = db.products.find((p) => p.id === sampleId) ?? db.products[0]
  const sampleBatch = db.batches.filter((b) => b.productId === sample?.id).sort((a, b) => b.packedDate.localeCompare(a.packedDate))[0] ?? null
  const qr = sample ? productQr(db, sample.id) : undefined
  const shop = db.shops.find((s) => s.id === sample?.shopId)
  const usedBy = selected ? db.printers.filter((p) => p.templateId === selected.id) : []
  const dirty = selected ? JSON.stringify({ ...draft }) !== JSON.stringify({ name: selected.name, widthMm: selected.widthMm, heightMm: selected.heightMm, columns: selected.columns, gapMm: selected.gapMm ?? 2, pageMode: selected.pageMode ?? 'SINGLE', rotate: selected.rotate ?? 0, offsetXMm: selected.offsetXMm ?? 0, offsetYMm: selected.offsetYMm ?? 0, orientation: selected.orientation, fields: selected.fields, barcodeType: selected.barcodeType }) : true

  const prn = useMemo(() => {
    if (!sample) return ''
    const fakePrinter: Printer = { id: 'x', name: 'Preview', manufacturer: 'Other', model: '', language: lang, connectionType: 'USB', address: '', dpi: 203, templateId: '', status: 'CONNECTED', lastSeenAt: '', shopId: '' }
    return renderPrn({ ...draft, id: 'draft', createdAt: '', updatedAt: '' }, fakePrinter, { product: sample, batch: sampleBatch, shop, qrUrl: qr ? qrUrl(qr.id) : '', quantity: draft.columns * 2 })
  }, [draft, sample, sampleBatch, shop, qr, lang])

  const set = <K extends keyof TemplateInput>(k: K, v: TemplateInput[K]) => setDraft((d) => ({ ...d, [k]: v }))
  const setField = (f: LabelField, on: boolean) => setDraft((d) => ({ ...d, fields: { ...d.fields, [f]: on } }))

  const save = async () => {
    if (!draft.name.trim()) return message.error('Give the template a name')
    setSaving(true)
    try {
      if (selected) {
        await templatesApi.update(selected.id, draft)
        message.success('Template saved')
      } else {
        const t = await templatesApi.create(draft)
        setSelectedId(t.id)
        message.success('Template created')
      }
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Label templates"
        subtitle="Design once, print anywhere — templates are printer-independent and rendered to ZPL / TSPL / ESC-POS at print time."
        extra={
          <Button icon={<PlusOutlined />} onClick={() => setSelectedId('new')}>
            New template
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[240px_360px_1fr]">
        <Card title="Templates" styles={{ body: { padding: 8 } }} className="xl:self-start">
          {db.templates.map((t) => {
            const n = db.printers.filter((p) => p.templateId === t.id).length
            return (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={cx(
                  'mb-1 block w-full cursor-pointer rounded-lg border-0 px-3 py-2.5 text-left transition-colors duration-200',
                  selectedId === t.id ? 'bg-brand-soft text-brand-dark' : 'bg-transparent hover:bg-canvas',
                )}
              >
                <div className="font-semibold">{t.name}</div>
                <div className="text-[12px] text-muted">
                  {t.widthMm}×{t.heightMm}mm · {t.columns}UP · {n} printer{n === 1 ? '' : 's'}
                </div>
              </button>
            )
          })}
          {selectedId === 'new' && (
            <div className="mb-1 rounded-lg bg-brand-soft px-3 py-2.5 font-semibold text-brand-dark">New template…</div>
          )}
        </Card>

        <Card
          title="Label designer"
          extra={dirty && selected && <Tag color="orange" variant="filled">Unsaved</Tag>}
          actions={[
            <Button key="save" type="primary" icon={<SaveOutlined />} loading={saving} onClick={save} disabled={!dirty}>
              {selected ? 'Save' : 'Create'}
            </Button>,
            selected ? (
              <Button key="dup" icon={<CopyOutlined />} onClick={() => { setSelectedId('new'); setTimeout(() => setDraft({ ...draft, name: `${draft.name} copy` })) }}>
                Duplicate
              </Button>
            ) : null,
            selected ? (
              <Popconfirm
                key="del"
                title="Delete this template?"
                description={usedBy.length ? `Used by ${usedBy.map((p) => p.name).join(', ')}` : undefined}
                okButtonProps={{ danger: true, disabled: usedBy.length > 0 }}
                onConfirm={async () => {
                  try {
                    await templatesApi.remove(selected.id)
                    setSelectedId(db.templates.find((t) => t.id !== selected.id)?.id ?? 'new')
                    message.success('Template deleted')
                  } catch (e) {
                    message.error((e as Error).message)
                  }
                }}
              >
                <Button danger type="text" icon={<DeleteOutlined />}>Delete</Button>
              </Popconfirm>
            ) : null,
          ].filter(Boolean)}
        >
          <div className="space-y-5">
            <div>
              <div className="mb-1.5 text-[13px] font-medium">Name</div>
              <Input value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="Grocery-50x25" />
            </div>
            <div>
              <div className="mb-1.5 text-[13px] font-medium">Label size</div>
              <Select
                className="w-full"
                value={SIZES.some((s) => s.w === draft.widthMm && s.h === draft.heightMm) ? `${draft.widthMm}x${draft.heightMm}` : 'custom'}
                onChange={(v: string) => {
                  if (v === 'custom') return
                  const [w, h] = v.split('x').map(Number)
                  setDraft((d) => ({ ...d, widthMm: w, heightMm: h }))
                }}
                options={[...SIZES.map((s) => ({ value: `${s.w}x${s.h}`, label: `${s.w} × ${s.h} mm` })), { value: 'custom', label: 'Custom…' }]}
              />
              <div className="mt-1 text-[12px] text-muted">
                Sheet across the liner: <b>{(draft.widthMm * draft.columns + (draft.gapMm ?? 2) * (draft.columns - 1)).toFixed(1)} × {draft.heightMm} mm</b> — set this as the paper size when printing
              </div>
              <div className="mt-2 flex items-center gap-2">
                <InputNumber min={20} max={120} value={draft.widthMm} onChange={(v) => set('widthMm', v ?? 50)} suffix="mm" className="w-full!" />
                <span className="text-muted">×</span>
                <InputNumber min={15} max={120} value={draft.heightMm} onChange={(v) => set('heightMm', v ?? 25)} suffix="mm" className="w-full!" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="mb-1.5 text-[13px] font-medium">Columns</div>
                <Radio.Group value={draft.columns} onChange={(e) => set('columns', e.target.value)} optionType="button" buttonStyle="solid" options={[1, 2, 3].map((c) => ({ value: c, label: `${c} UP` }))} />
              </div>
              <div>
                <div className="mb-1.5 text-[13px] font-medium">Gap between labels</div>
                <InputNumber min={0} max={20} step={0.5} value={draft.gapMm ?? 2} onChange={(v) => set('gapMm', v ?? 0)} suffix="mm" className="w-full!" disabled={draft.columns === 1} />
              </div>
              <div>
                <div className="mb-1.5 text-[13px] font-medium">Orientation</div>
                <Radio.Group value={draft.orientation} onChange={(e) => set('orientation', e.target.value)} optionType="button" options={[{ value: 'PORTRAIT', label: 'Portrait' }, { value: 'LANDSCAPE', label: 'Landscape' }]} />
              </div>
            </div>
            <div>
              <div className="mb-1.5 text-[13px] font-medium">Barcode symbology</div>
              <Segmented value={draft.barcodeType} onChange={(v) => set('barcodeType', v as TemplateInput['barcodeType'])} options={[{ value: 'CODE128', label: 'Code 128' }, { value: 'EAN13', label: 'EAN-13 (if set)' }]} />
            </div>
            <div>
              <div className="mb-1.5 text-[13px] font-medium">Printed page</div>
              <Segmented<PageMode>
                block
                value={draft.pageMode ?? 'SINGLE'}
                onChange={(v) => set('pageMode', v)}
                options={[
                  { value: 'SINGLE', label: 'One label per page' },
                  { value: 'ROW', label: `Row (${draft.columns}UP)` },
                ]}
              />
              <Segmented<Rotation>
                block
                className="mt-1.5"
                value={draft.rotate ?? 0}
                onChange={(v) => set('rotate', v)}
                options={[0, 90, 180, 270].map((r) => ({ value: r as Rotation, label: `${r}°` }))}
              />
              <div className="mt-1.5 text-[12px] text-muted">
                Printer paper size must be{' '}
                <b className="text-ink">
                  {sheetGeometry({ ...draft, id: 'd', createdAt: '', updatedAt: '' }, draft).pageW.toFixed(1)} ×{' '}
                  {sheetGeometry({ ...draft, id: 'd', createdAt: '', updatedAt: '' }, draft).pageH.toFixed(1)} mm
                </b>
              </div>
            </div>
            <div>
              <div className="mb-2 text-[13px] font-medium">Fields</div>
              <div className="grid grid-cols-2 gap-y-2">
                {FIELD_LABELS.map(([f, l]) => (
                  <Checkbox key={f} checked={draft.fields[f]} onChange={(e) => setField(f, e.target.checked)}>
                    {l}
                  </Checkbox>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card
          title="Preview"
          extra={
            <Select
              size="small"
              className="w-52"
              value={sampleId}
              onChange={setSampleId}
              showSearch={{ optionFilterProp: 'label' }}
              options={db.products.map((p) => ({ value: p.id, label: p.name }))}
            />
          }
        >
          {sample ? (
            <Tabs
              items={[
                {
                  key: 'visual',
                  label: 'Visual',
                  children: (
                    <div className="overflow-x-auto">
                      <LabelRoll template={draft} product={sample} batch={sampleBatch} shop={shop} qrUrl={qr ? qrUrl(qr.id) : undefined} rows={2} scale={draft.widthMm * draft.columns > 120 ? 3 : 4.4} />
                      <div className="mt-3 text-[12px] text-muted">
                        Actual size {draft.widthMm}×{draft.heightMm} mm · {draft.columns} across the liner · shown at ~{draft.widthMm * draft.columns > 120 ? '3' : '4.4'}× scale
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'prn',
                  label: 'PRN output',
                  children: (
                    <>
                      <Segmented className="mb-3" value={lang} onChange={(v) => setLang(v as Printer['language'])} options={[{ value: 'ZPL', label: 'ZPL · Zebra' }, { value: 'TSPL', label: 'TSPL · TSC/TVS' }, { value: 'ESCPOS', label: 'ESC/POS' }]} />
                      <pre className="prn-code m-0">{prn}</pre>
                    </>
                  ),
                },
              ]}
            />
          ) : (
            <Empty />
          )}
        </Card>
      </div>
    </>
  )
}
