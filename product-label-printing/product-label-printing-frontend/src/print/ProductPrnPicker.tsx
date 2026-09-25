import { useRef, useState } from 'react'
import { App, Button, Collapse, InputNumber, Select } from 'antd'
import { SharedLayoutEditor } from './SharedLayoutEditor'
import { LabelRoll } from '../components/LabelPreview'
import { useDb, getDb } from '../mock/db'
import { useSession } from '../hooks/useSession'
import { renderPrn } from '../lib/prnRenderer'
import { buildProductSpec } from './labelOutput'
import { generatedPrnBytes, sendRawToQueue } from './localAgent'

type Language = 'TSPL' | 'ZPL'

export function ProductPrnPicker({ target, busy, setBusy, onSubmitted }: {
  target?: string
  busy: boolean
  setBusy: (value: boolean) => void
  onSubmitted: (value: string) => void
}) {
  const db = useDb()
  const { can } = useSession()
  const { message } = App.useApp()
  const submitting = useRef(false)
  const [editing, setEditing] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [productId, setProductId] = useState<string>()
  const [batchId, setBatchId] = useState<string>('')
  const [templateId, setTemplateId] = useState(db.templates[0]?.id)
  const [quantity, setQuantity] = useState<number | null>(1)
  // Settings belong to a Windows queue: switching queues must not reuse another printer's language.
  const [formats, setFormats] = useState<Record<string, { language?: Language; dpi: 203 | 300 }>>({})
  const format = (target && formats[target]) || { dpi: 203 as const }
  const setFormat = (value: Partial<typeof format>) => {
    if (target) setFormats({ ...formats, [target]: { ...format, ...value } })
  }
  const products = db.products.filter((p) => p.status === 'ACTIVE')
  const product = products.find((p) => p.id === productId)
  const batches = db.batches.filter((b) => b.productId === product?.id).sort((a, b) => b.packedDate.localeCompare(a.packedDate))
  const batch = batches.find((b) => b.id === batchId) ?? null
  const template = db.templates.find((t) => t.id === templateId)
  let prn = ''
  let problem = !can('print') ? 'Your account does not have printing permission.'
    : !target ? 'Connect and select your Windows printer above.'
    : productSearch ? 'Select a product from the search results before printing.'
    : !product ? 'Choose a product.'
    : !template ? 'Choose a label template.'
    : !format.language ? 'Choose the command language supported by this printer.'
    : batchId && !batch ? 'Choose an available batch.' : ''
  if (!problem && product && template && format.language) {
    try {
      prn = renderPrn(template, { language: format.language, dpi: format.dpi }, buildProductSpec(db, template, product, batch, quantity ?? 0).items[0])
      generatedPrnBytes(format.language, prn)
    } catch (e) { problem = (e as Error).message }
  }
  const print = async () => {
    if (submitting.current || busy || problem || !target || !format.language || !prn) return
    submitting.current = true
    setBusy(true)
    try {
      // Resolve the current selection and shared template again at submission time.
      const current = getDb()
      const selectedProduct = current.products.find((p) => p.id === productId && p.status === 'ACTIVE')
      const selectedTemplate = current.templates.find((t) => t.id === templateId)
      const selectedBatch = batchId ? current.batches.find((b) => b.id === batchId && b.productId === productId) : null
      if (!selectedProduct || !selectedTemplate || (batchId && !selectedBatch)) throw new Error('The selection changed. Choose an available product, batch, and template.')
      const payload = renderPrn(selectedTemplate, { language: format.language, dpi: format.dpi }, buildProductSpec(current, selectedTemplate, selectedProduct, selectedBatch ?? null, quantity ?? 0).items[0])
      const result = await sendRawToQueue(target, generatedPrnBytes(format.language, payload))
      onSubmitted(`Submitted ${quantity} label(s): ${selectedProduct.name} (${selectedProduct.productCode}) to ${target}. Windows job ${result.spoolJobId}. If a different product comes out, check for older jobs in this Windows printer queue.`)
    } catch (e) { message.error((e as Error).message) }
    finally { submitting.current = false; setBusy(false) }
  }
  return <>
    <p className="text-[12px] text-muted mb-3">Generate PRN from your product details and label template, then send it directly to your Windows printer.</p>
    <div className="grid sm:grid-cols-2 gap-3">
      <label>Product
        <Select className="w-full" aria-label="Product for PRN" showSearch optionFilterProp="label" searchValue={productSearch} onSearch={setProductSearch} placeholder="Search name or product code" value={product?.id} disabled={busy} onChange={(id) => { setProductId(id); setProductSearch(''); setBatchId(''); onSubmitted('') }} options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.productCode})` }))} />
      </label>
      <label>Batch
        <Select className="w-full" aria-label="Batch for PRN" value={batchId} disabled={!product || busy} onChange={setBatchId} options={[{ value: '', label: 'Use product dates (no batch)' }, ...batches.map((b) => ({ value: b.id, label: `${b.batchCode} - packed ${b.packedDate}` }))]} />
      </label>
      <label>Label template
        <Select className="w-full" aria-label="Label template for PRN" value={template?.id} placeholder="Select label template" disabled={busy} onChange={setTemplateId} options={db.templates.map((t) => ({ value: t.id, label: `${t.name} - ${t.widthMm} x ${t.heightMm} mm, ${t.columns} across` }))} />
      </label>
      <label>Number of labels
        <InputNumber className="w-full!" aria-label="Number of product labels" min={1} max={1000} value={quantity} disabled={busy} onChange={setQuantity} />
      </label>
      <label>Printer command language
        <Select className="w-full" aria-label="Printer command language" placeholder="Select supported language" value={format.language} disabled={!target || busy} onChange={(language: Language) => setFormat({ language })} options={[{ value: 'TSPL', label: 'TSPL' }, { value: 'ZPL', label: 'ZPL' }]} />
      </label>
      <label>Printer resolution
        <Select className="w-full" aria-label="Printer resolution" value={format.dpi} disabled={!target || busy} onChange={(dpi: 203 | 300) => setFormat({ dpi })} options={[{ value: 203, label: '203 DPI' }, { value: 300, label: '300 DPI' }]} />
      </label>
    </div>
    {product && template && <div className="mt-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <b>Ready to print: {product.name} ({product.productCode})</b>
        {can('templates.manage') && <Button disabled={busy} onClick={() => setEditing(true)}>Edit layout</Button>}
      </div>
      <p className="text-xs text-muted">Shared layout: {template.name}. Saved layout changes apply to all products using it. Direct PRN uses printer fonts; this visual preview is approximate.</p>
      {!problem && <div className="overflow-x-auto mt-2"><LabelRoll template={template} {...buildProductSpec(db, template, product, batch, quantity ?? 1).items[0]} scale={3.5} /></div>}
      {editing && <SharedLayoutEditor key={template.id} template={template} {...buildProductSpec(db, template, product, batch, quantity ?? 1).items[0]} onClose={() => setEditing(false)} />}
    </div>}
    {template && quantity !== null && quantity > 0 && quantity % template.columns !== 0 && <p className="mt-2 text-xs text-muted">The last row uses {quantity % template.columns} of {template.columns} stickers. Each new job starts a new row; unused stickers on the last row stay blank.</p>}
    {prn && !problem && <Collapse className="mt-3!" items={[{ key: 'prn', label: 'View generated PRN', children: <pre className="max-h-48 overflow-auto text-xs">{prn}</pre> }]} />}
    <div className="mt-3 flex items-center gap-3">
      <Button type="primary" loading={busy} disabled={busy || !!problem || !prn} onClick={print}>Print product</Button>
      <span className="text-[12px] text-muted" role="status">{problem}</span>
    </div>
  </>
}
