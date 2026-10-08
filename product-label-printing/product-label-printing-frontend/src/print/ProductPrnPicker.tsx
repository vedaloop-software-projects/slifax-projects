import { useRef, useState } from 'react'
import { App, Button, Card, Empty, InputNumber, Select, Tag } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
// Hidden for now (Product Search / Label Preview below are commented out):
// import { Input } from 'antd'
// import { PlusOutlined } from '@ant-design/icons'
// import { SharedLayoutEditor } from './SharedLayoutEditor'
// import { LabelRoll } from '../components/LabelPreview'
// import { money } from '../lib/format'
import { useDb, getDb } from '../mock/db'
import { useSession } from '../hooks/useSession'
import { printing, queue } from '../api'
import { renderPrn } from '../lib/prnRenderer'
import { withExpiryOverride } from '../lib/labelData'
import { buildProductSpec } from './labelOutput'
import { agentSettings, generatedPrnBytes, sendRawToQueue } from './localAgent'
import type { Db, QueueEntry } from '../types'

type Language = 'TSPL' | 'ZPL'

/** A queue entry from Barcode Printing, with the expiry choice made there applied. */
function labelFor(db: Db, q: QueueEntry) {
  const product = db.products.find((p) => p.id === q.productId && p.status === 'ACTIVE')
  if (!product) return null
  const batch = q.batchId ? db.batches.find((b) => b.id === q.batchId) ?? null : null
  return { entry: q, ...withExpiryOverride(product, batch, q.expiryDate, q.showExpiry !== false) }
}

/**
 * Direct PRN printing to a chosen Windows printer. The products are the ones selected in
 * Barcode Printing (its print queue): same quantities and expiry choices, kept in sync.
 */
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
  // const [editing, setEditing] = useState(false)
  // const [productSearch, setProductSearch] = useState('')
  const [templateId, setTemplateId] = useState(db.templates[0]?.id)
  const [formats, setFormats] = useState<Record<string, { language?: Language; dpi: 203 | 300 }>>({})
  const format = (target && formats[target]) || { dpi: 203 as const }
  const setFormat = (value: Partial<typeof format>) => {
    if (target) setFormats({ ...formats, [target]: { ...format, ...value } })
  }
  const selected = db.queue.map((q) => labelFor(db, q)).filter((x): x is NonNullable<typeof x> => !!x)
  const template = db.templates.find((t) => t.id === templateId)
  const totalLabels = selected.reduce((n, s) => n + s.entry.quantity, 0)

  let problem = !can('print') ? 'Your account does not have printing permission.'
    : !target ? 'Connect and select your Windows printer above.'
    : !selected.length ? 'Select products in Barcode Printing first; they appear here.'
    : !template ? 'Choose a label template.'
    : !format.language ? 'Choose the command language supported by this printer.' : ''

  let prn = ''
  if (!problem && template && format.language) {
    try {
      prn = selected.map((s) => renderPrn(template, { language: format.language!, dpi: format.dpi }, buildProductSpec(db, template, s.product, s.batch, s.entry.quantity).items[0])).join('\n')
      generatedPrnBytes(format.language, prn)
    } catch (e) { problem = (e as Error).message }
  }

  const print = async () => {
    if (submitting.current || busy || problem || !target || !format.language || !template) return
    submitting.current = true
    setBusy(true)
    try {
      const current = getDb()
      const items = current.queue.map((q) => labelFor(current, q))
      const selectedTemplate = current.templates.find((t) => t.id === templateId)
      if (!items.length || items.some((s) => !s) || !selectedTemplate) throw new Error('The selection changed. Check the products in Barcode Printing and the template.')
      const ready = items as NonNullable<(typeof items)[number]>[]
      const payload = ready.map((s) => renderPrn(selectedTemplate, { language: format.language!, dpi: format.dpi }, buildProductSpec(current, selectedTemplate, s.product, s.batch, s.entry.quantity).items[0])).join('\n')
      const result = await sendRawToQueue(target, generatedPrnBytes(format.language, payload))
      const profile = current.printers.find((p) => agentSettings().printers[p.id] === target)
      await printing.recordDirectPrn(profile?.id ?? `windows:${target}`, selectedTemplate.id, ready.map((s) => ({ productId: s.product.id, quantity: s.entry.quantity, expiryDate: s.product.expiryDate })), result.spoolJobId, payload, target)
      // Printed: they leave the Barcode Printing queue, as when printing from there.
      for (const s of ready) await queue.remove(s.entry.id)
      onSubmitted(`Submitted ${ready.reduce((n, s) => n + s.entry.quantity, 0)} labels across ${ready.length} products to ${target}. Windows job ${result.spoolJobId}.`)
    } catch (e) { message.error((e as Error).message) }
    finally { submitting.current = false; setBusy(false) }
  }

  return <>
    <p className="mb-4 text-[12px] text-muted">Prints the products selected in Barcode Printing, with the quantities and expiry chosen there, straight to the Windows printer above.</p>
    <div className="mb-4 grid gap-3 sm:grid-cols-3">
      <label className="text-[13px] font-medium">Label template<Select className="mt-1 w-full" aria-label="Label template" value={template?.id} placeholder="Select label template" disabled={busy} onChange={setTemplateId} options={db.templates.map((t) => ({ value: t.id, label: `${t.name} - ${t.widthMm} × ${t.heightMm} mm, ${t.columns} across` }))} /></label>
      <label className="text-[13px] font-medium">Printer command language<Select className="mt-1 w-full" aria-label="Printer command language" placeholder="Select supported language" value={format.language} disabled={!target || busy} onChange={(language: Language) => setFormat({ language })} options={[{ value: 'TSPL' }, { value: 'ZPL' }]} /></label>
      <label className="text-[13px] font-medium">Printer resolution<Select className="mt-1 w-full" aria-label="Printer resolution" value={format.dpi} disabled={!target || busy} onChange={(dpi: 203 | 300) => setFormat({ dpi })} options={[{ value: 203, label: '203 DPI' }, { value: 300, label: '300 DPI' }]} /></label>
    </div>

    {/* Hidden for now: products come from Barcode Printing instead of a separate search.
    <Card title="Product Search" styles={{ body: { paddingTop: 8 } }}>
      <Input.Search aria-label="Search product, barcode, or SKU" placeholder="Search product, barcode, SKU..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} enterButton="Search" allowClear />
      …search results with an Add button per product…
    </Card>
    */}

    <Card title={<span>Selected Products <Tag className="ml-1">{selected.length}</Tag></span>} styles={{ body: { paddingTop: 8 } }}>
      {!selected.length ? <Empty className="py-8" image={Empty.PRESENTED_IMAGE_SIMPLE} description="No products selected. Add them in Barcode Printing." /> : <div className="divide-y divide-line">
        {selected.map(({ entry, product }) => <div key={entry.id} className="flex flex-wrap items-center gap-2 py-3">
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{product.name}</div>
            <div className="text-[12px] text-muted">{product.productCode}{entry.showExpiry === false ? ' · no expiry' : product.expiryDate ? ` · expiry ${product.expiryDate.split('-').reverse().join('-')}` : ''}</div>
          </div>
          <InputNumber min={1} max={1000} value={entry.quantity} disabled={busy} onChange={(value) => queue.setQuantity(entry.id, value ?? 1)} aria-label={`Number of labels for ${product.name}`} className="w-24!" />
          <Button type="text" danger icon={<DeleteOutlined />} disabled={busy} aria-label={`Remove ${product.name}`} onClick={() => queue.remove(entry.id)} />
        </div>)}
      </div>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <span className="text-[13px] text-muted">{totalLabels} label(s) across {selected.length} product(s)</span>
        <Button type="primary" loading={busy} disabled={busy || !!problem || !prn} onClick={print}>Print selected products</Button>
      </div>
      <div className="mt-2 text-[12px] text-muted" role="status">{problem}</div>
    </Card>

    {/* Hidden for now: label preview and "Edit shared layout" (layouts are edited in Label templates).
    {selected.length > 0 && template && <div className="mt-4">
      <b>Label preview ({selected.length} products)</b>
      {can('templates.manage') && <Button onClick={() => setEditing(true)}>Edit shared layout</Button>}
      …one <LabelRoll> per selected product…
      {editing && <SharedLayoutEditor … onClose={() => setEditing(false)} />}
    </div>}
    */}
  </>
}
