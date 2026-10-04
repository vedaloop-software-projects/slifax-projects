import { useMemo, useRef, useState } from 'react'
import { App, Button, Card, Empty, Input, InputNumber, Select, Tag } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { SharedLayoutEditor } from './SharedLayoutEditor'
import { LabelRoll } from '../components/LabelPreview'
import { useDb, getDb } from '../mock/db'
import { useSession } from '../hooks/useSession'
import { printing } from '../api'
import { renderPrn } from '../lib/prnRenderer'
import { buildProductSpec } from './labelOutput'
import { agentSettings, generatedPrnBytes, sendRawToQueue } from './localAgent'
import { money } from '../lib/format'
import type { Product } from '../types'

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
  const [productIds, setProductIds] = useState<string[]>([])
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [templateId, setTemplateId] = useState(db.templates[0]?.id)
  const [formats, setFormats] = useState<Record<string, { language?: Language; dpi: 203 | 300 }>>({})
  const format = (target && formats[target]) || { dpi: 203 as const }
  const setFormat = (value: Partial<typeof format>) => {
    if (target) setFormats({ ...formats, [target]: { ...format, ...value } })
  }
  const products = db.products.filter((p) => p.status === 'ACTIVE')
  const selectedProducts = productIds.map((id) => products.find((p) => p.id === id)).filter((p): p is Product => !!p)
  const template = db.templates.find((t) => t.id === templateId)
  const results = useMemo(() => {
    const q = productSearch.trim().toLowerCase()
    return products.filter((p) => !productIds.includes(p.id) && (!q || p.name.toLowerCase().includes(q) || p.productCode.toLowerCase().includes(q) || p.eanCode?.includes(q) || p.pluCode?.includes(q))).slice(0, 8)
  }, [products, productIds, productSearch])
  const totalLabels = selectedProducts.reduce((n, p) => n + (quantities[p.id] ?? 1), 0)
  const addProduct = (p: Product) => {
    setProductIds((ids) => [...ids, p.id])
    setQuantities((values) => ({ ...values, [p.id]: values[p.id] ?? 1 }))
    onSubmitted('')
  }
  const removeProduct = (id: string) => setProductIds((ids) => ids.filter((value) => value !== id))

  let problem = !can('print') ? 'Your account does not have printing permission.'
    : !target ? 'Connect and select your Windows printer above.'
    : !selectedProducts.length ? 'Search for products and add them to the selected list.'
    : !template ? 'Choose a label template.'
    : !format.language ? 'Choose the command language supported by this printer.' : ''

  let prn = ''
  if (!problem && template && format.language) {
    try {
      prn = selectedProducts.map((p) => renderPrn(template, { language: format.language!, dpi: format.dpi }, buildProductSpec(db, template, p, null, quantities[p.id] ?? 1).items[0])).join('\n')
      generatedPrnBytes(format.language, prn)
    } catch (e) { problem = (e as Error).message }
  }

  const print = async () => {
    if (submitting.current || busy || problem || !target || !format.language || !template) return
    submitting.current = true
    setBusy(true)
    try {
      const current = getDb()
      const selected = productIds.map((id) => current.products.find((p) => p.id === id && p.status === 'ACTIVE'))
      const selectedTemplate = current.templates.find((t) => t.id === templateId)
      if (selected.some((p) => !p) || !selectedTemplate) throw new Error('The selection changed. Choose available products and a template.')
      const payload = selected.map((product) => {
        const p = product!
        return renderPrn(selectedTemplate, { language: format.language!, dpi: format.dpi }, buildProductSpec(current, selectedTemplate, p, null, quantities[p.id] ?? 1).items[0])
      }).join('\n')
      const result = await sendRawToQueue(target, generatedPrnBytes(format.language, payload))
      const profile = current.printers.find((p) => agentSettings().printers[p.id] === target)
      await printing.recordDirectPrn(profile?.id ?? `windows:${target}`, selectedTemplate.id, selected.map((product) => ({ productId: product!.id, quantity: quantities[product!.id] ?? 1 })), result.spoolJobId, payload, target)
      onSubmitted(`Submitted ${totalLabels} labels across ${selected.length} products to ${target}. Windows job ${result.spoolJobId}.`)
    } catch (e) { message.error((e as Error).message) }
    finally { submitting.current = false; setBusy(false) }
  }

  return <>
    <p className="mb-4 text-[12px] text-muted">Search products, add each one to the print list, set quantities, then print them together.</p>
    <div className="mb-4 grid gap-3 sm:grid-cols-3">
      <label className="text-[13px] font-medium">Label template<Select className="mt-1 w-full" aria-label="Label template" value={template?.id} placeholder="Select label template" disabled={busy} onChange={setTemplateId} options={db.templates.map((t) => ({ value: t.id, label: `${t.name} - ${t.widthMm} × ${t.heightMm} mm, ${t.columns} across` }))} /></label>
      <label className="text-[13px] font-medium">Printer command language<Select className="mt-1 w-full" aria-label="Printer command language" placeholder="Select supported language" value={format.language} disabled={!target || busy} onChange={(language: Language) => setFormat({ language })} options={[{ value: 'TSPL' }, { value: 'ZPL' }]} /></label>
      <label className="text-[13px] font-medium">Printer resolution<Select className="mt-1 w-full" aria-label="Printer resolution" value={format.dpi} disabled={!target || busy} onChange={(dpi: 203 | 300) => setFormat({ dpi })} options={[{ value: 203, label: '203 DPI' }, { value: 300, label: '300 DPI' }]} /></label>
    </div>

    <div className="grid items-stretch gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <Card title="Product Search" styles={{ body: { paddingTop: 8 } }}>
        <Input.Search aria-label="Search product, barcode, or SKU" placeholder="Search product, barcode, SKU..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} enterButton="Search" allowClear />
        <div className="mt-4 divide-y divide-line">
          {results.length ? results.map((p) => <div key={p.id} className="flex items-center gap-3 px-2 py-3">
            <div className="min-w-0 flex-1"><div className="font-semibold">{p.name}</div><div className="text-[12px] text-muted">{p.eanCode || p.productCode}</div></div>
            <span className="shrink-0 text-[13px] font-semibold">{money(p.salePrice)}</span>
            <Button type="primary" icon={<PlusOutlined />} disabled={busy} onClick={() => addProduct(p)}>Add</Button>
          </div>) : <Empty className="py-8" image={Empty.PRESENTED_IMAGE_SIMPLE} description={productSearch ? 'No matching products' : 'All matching products have been added'} />}
        </div>
      </Card>

      <Card title={<span>Selected Products <Tag className="ml-1">{selectedProducts.length}</Tag></span>} styles={{ body: { paddingTop: 8 } }}>
        {!selectedProducts.length ? <Empty className="py-8" image={Empty.PRESENTED_IMAGE_SIMPLE} description="Search and add products from the left." /> : <div className="divide-y divide-line">
          {selectedProducts.map((p) => <div key={p.id} className="flex flex-wrap items-center gap-2 py-3">
            <div className="min-w-0 flex-1"><div className="truncate font-semibold">{p.name}</div><div className="text-[12px] text-muted">{p.productCode}</div></div>
            <InputNumber min={1} max={1000} value={quantities[p.id] ?? 1} disabled={busy} onChange={(value) => setQuantities((values) => ({ ...values, [p.id]: value ?? 1 }))} aria-label={`Number of labels for ${p.name}`} className="w-24!" />
            <Button type="text" danger icon={<DeleteOutlined />} disabled={busy} aria-label={`Remove ${p.name}`} onClick={() => removeProduct(p.id)} />
          </div>)}
        </div>}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <span className="text-[13px] text-muted">{totalLabels} label(s) across {selectedProducts.length} product(s)</span>
          <Button type="primary" loading={busy} disabled={busy || !!problem || !prn} onClick={print}>Print selected products</Button>
        </div>
        <div className="mt-2 text-[12px] text-muted" role="status">{problem}</div>
      </Card>
    </div>

    {selectedProducts.length > 0 && template && <div className="mt-4">
      <div className="mb-2 flex items-center justify-between gap-2"><b>Label preview ({selectedProducts.length} products)</b>{can('templates.manage') && <Button disabled={busy} onClick={() => setEditing(true)}>Edit shared layout</Button>}</div>
      <div className="flex flex-wrap gap-3">{selectedProducts.map((p) => <div key={p.id}><div className="mb-1 text-xs font-medium">{p.name}</div><div className="overflow-x-auto rounded-lg bg-white p-2"><LabelRoll template={template} {...buildProductSpec(db, template, p, null, quantities[p.id] ?? 1).items[0]} scale={3.5} /></div></div>)}</div>
      {editing && <SharedLayoutEditor key={template.id} template={template} {...buildProductSpec(db, template, selectedProducts[0], null, quantities[selectedProducts[0].id] ?? 1).items[0]} onClose={() => setEditing(false)} />}
    </div>}
  </>
}
