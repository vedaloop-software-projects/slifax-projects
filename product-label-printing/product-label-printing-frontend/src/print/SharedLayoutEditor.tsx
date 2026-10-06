import { useState } from 'react'
import { Alert, App, Checkbox, InputNumber, Modal, Select } from 'antd'
import { templates } from '../api'
import type { LabelField, LabelTemplate, Product, ProductBatch, Shop } from '../types'
import { LabelRoll } from '../components/LabelPreview'
import { labelContentBox } from '../lib/labelLayout'

/** Edits a shared template; the selected product is only a live sample. */
export function SharedLayoutEditor({ template, product, batch, shop, qrUrl, onClose }: {
  template: LabelTemplate; product: Product; batch: ProductBatch | null; shop?: Shop; qrUrl: string; onClose: () => void
}) {
  const [draft, setDraft] = useState(template)
  const [saving, setSaving] = useState(false)
  const { message } = App.useApp()
  let error = ''
  try { labelContentBox(draft) } catch (e) { error = (e as Error).message }
  const inset = (draft.orientation === 'PORTRAIT' ? Math.max(draft.widthMm, draft.heightMm) : Math.min(draft.widthMm, draft.heightMm)) / 25 * 1.1
  const margins = draft.marginsMm ?? { top: inset, right: inset, bottom: inset, left: inset }
  const save = async () => {
    if (error || saving) return
    setSaving(true)
    try {
      const { id, ...input } = draft
      await templates.update(id, input)
      message.success('Layout saved for all products using this template')
      onClose()
    } catch (e) { message.error((e as Error).message) }
    finally { setSaving(false) }
  }
  return <Modal open width={900} title={`Edit shared layout - ${template.name}`} okText="Save for all products" onOk={save} onCancel={saving ? undefined : onClose} confirmLoading={saving} okButtonProps={{ disabled: !!error }} cancelButtonProps={{ disabled: saving }}>
    <p className="mb-4">Changes apply to every product printed with <b>{template.name}</b>. The feed gap is the measured gap between successive rows on the roll. Previewing {product.name} does not put its name or barcode into the template.</p>
    <div className="grid md:grid-cols-2 gap-5">
      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2">Media tracking (TSPL)
          <Select aria-label="Media tracking" className="w-full" disabled={saving} value={draft.mediaMode ?? 'GAP'} onChange={(mediaMode) => setDraft({ ...draft, mediaMode })} options={[{ value: 'GAP', label: 'Stickers with gaps between rows' }, { value: 'CONTINUOUS', label: 'Continuous uncut roll (no gaps)' }]} />
        </label>
        {draft.elements && <Alert className="col-span-2" type="info" showIcon title="This template is designed on the canvas. Move fields, text size and spacing in Printers & Templates → Label templates." />}
        {(draft.elements ? (['gapMm', 'rowGapMm'] as const) : (['widthMm', 'heightMm', 'gapMm', 'rowGapMm', 'fieldGapMm'] as const)).map((key) => <label key={key}>
          {{ widthMm: 'Label width', heightMm: 'Label height', gapMm: 'Horizontal gap between columns', rowGapMm: 'Feed gap between rows (TSPL)', fieldGapMm: 'Spacing between fields' }[key]}
          <InputNumber aria-label={key} className="w-full!" min={key === 'widthMm' || key === 'heightMm' ? 5 : 0} max={key === 'rowGapMm' ? 25 : 120} step={0.1} suffix="mm" value={draft[key] ?? (key === 'gapMm' || key === 'rowGapMm' ? 2 : 0)} disabled={saving || (key === 'rowGapMm' && draft.mediaMode === 'CONTINUOUS')} onChange={(value) => setDraft({ ...draft, [key]: value ?? 0 })} />
        </label>)}
        <label>Labels across<Select className="w-full" aria-label="Labels across" value={draft.columns} disabled={saving} onChange={(columns) => setDraft({ ...draft, columns })} options={[1, 2, 3].map((n) => ({ value: n, label: `${n} across` }))} /></label>
        {!draft.elements && <label>Orientation<Select className="w-full" aria-label="Layout orientation" value={draft.orientation} disabled={saving} onChange={(orientation) => setDraft({ ...draft, orientation })} options={[{ value: 'LANDSCAPE', label: 'Landscape' }, { value: 'PORTRAIT', label: 'Portrait' }]} /></label>}
        {!draft.elements && (['top', 'right', 'bottom', 'left'] as const).map((side) => <label key={side} className="capitalize">{side} margin
          <InputNumber aria-label={`${side} margin`} className="w-full!" min={0} step={0.1} suffix="mm" value={margins[side]} disabled={saving} onChange={(value) => setDraft({ ...draft, marginsMm: { ...margins, [side]: value ?? 0 } })} />
        </label>)}
        {!draft.elements && (Object.keys(draft.fields) as LabelField[]).map((field) => <Checkbox key={field} disabled={saving} checked={draft.fields[field]} onChange={(e) => setDraft({ ...draft, fields: { ...draft.fields, [field]: e.target.checked } })}>{field.replace(/([A-Z])/g, ' $1')}</Checkbox>)}
      </div>
      <div className="overflow-x-auto"><p className="text-xs text-muted mb-2">Approximate visual preview. Direct PRN uses printer fonts and different line positions.</p>
        {error ? <Alert type="error" title={error} /> : <LabelRoll template={draft} product={product} batch={batch} shop={shop} qrUrl={qrUrl} scale={3.5} showMargins />}
      </div>
    </div>
  </Modal>
}
