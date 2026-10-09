import { useRef } from 'react'
import { App, Button, Card, Empty, InputNumber, Tag } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
// Hidden for now (Product Search / Label Preview below are commented out):
// import { Input } from 'antd'
// import { PlusOutlined } from '@ant-design/icons'
// import { SharedLayoutEditor } from './SharedLayoutEditor'
// import { LabelRoll } from '../components/LabelPreview'
// import { money } from '../lib/format'
import { useDb } from '../mock/db'
import { useSession } from '../hooks/useSession'
import { queue } from '../api'
import { outsideSafeArea } from '../lib/labelLayout'
import { generatedPrnBytes } from './localAgent'
import { printQueueTo, queueLabel, queuePrn, type StationLanguage } from './station'

/**
 * Direct PRN printing to the Windows printer chosen above. The products are the ones selected
 * in Barcode Printing (its print queue): same quantities and expiry choices, kept in sync.
 * Template, language and resolution come from "Printer setup for this PC".
 */
export function ProductPrnPicker({ target, templateId, language, dpi, busy, setBusy, onSubmitted }: {
  target?: string
  templateId?: string
  language?: StationLanguage
  dpi: 203 | 300
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
  const selected = db.queue.map((q) => queueLabel(db, q)).filter((x): x is NonNullable<typeof x> => !!x)
  const template = db.templates.find((t) => t.id === templateId)
  const totalLabels = selected.reduce((n, s) => n + s.entry.quantity, 0)

  let problem = !can('print') ? 'Your account does not have printing permission.'
    : !target ? 'Connect and select your Windows printer above.'
    : !selected.length ? 'Select products in Barcode Printing first; they appear here.'
    : !template ? 'Choose a label template above.'
    : !language ? 'Choose the command language supported by this printer above.' : ''

  let prn = ''
  if (!problem && template && language) {
    try {
      prn = queuePrn(db, template, { language, dpi })
      generatedPrnBytes(language, prn)
    } catch (e) { problem = (e as Error).message }
  }

  const print = async () => {
    if (submitting.current || busy || problem || !target || !language || !template) return
    submitting.current = true
    setBusy(true)
    try {
      const { job, labels, products } = await printQueueTo({ printerName: target, templateId: template.id, language, dpi })
      onSubmitted(`Submitted ${labels} labels across ${products} products to ${target}. Windows job ${job.spoolJobId}.`)
    } catch (e) { message.error((e as Error).message) }
    finally { submitting.current = false; setBusy(false) }
  }

  return <>
    <p className="mb-4 text-[12px] text-muted">Prints the products selected in Barcode Printing, with the quantities and expiry chosen there, straight to the Windows printer above.</p>

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
      {template && outsideSafeArea(template).length > 0 && <div className="mt-1 text-[12px] text-amber-700">Some fields of {template.name} are outside the safe print area and may be cut off. Fix it in Label templates.</div>}
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
