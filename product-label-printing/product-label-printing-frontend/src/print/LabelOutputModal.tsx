import { useMemo, useState } from 'react'
import { App as AntApp, Button, Checkbox, Collapse, InputNumber, Modal, Select, Tag } from 'antd'
import { DesktopOutlined, FilePdfOutlined, RotateRightOutlined } from '@ant-design/icons'
import type { Product, ProductBatch } from '../types'
import { useNavigate } from 'react-router'
import { selectedPrinter } from '../lib/printerProfiles'
import { renderPrn } from '../lib/prnRenderer'
import { labelShop } from './stationStore'
import { sendPrn } from './localAgent'
import { useDb } from '../mock/db'
import { useSession } from '../hooks/useSession'
import { LabelRoll } from '../components/LabelPreview'
import { PrintSheet } from './PrintSheet'
import { PageSetupControls } from './PageSetupControls'
import { sheetGeometry, type PrintSetup } from './geometry'
import { buildProductSpec, templateSetup, useLabelOutput } from './labelOutput'

/** Print or export labels for one product — opened from the product page or list. */
export function LabelOutputModal({ open, product, batch = null, onClose }: { open: boolean; product: Product | null; batch?: ProductBatch | null; onClose: () => void }) {
  const db = useDb()
  const navigate = useNavigate()
  const { can } = useSession()
  const out = useLabelOutput()
  const { message } = AntApp.useApp()
  const [rawBusy, setRawBusy] = useState(false)
  const [printerId, setPrinterId] = useState(db.printers[0]?.id)
  const [templateId, setTemplateId] = useState<string | undefined>(db.printers[0]?.templateId ?? db.templates[0]?.id)
  const [quantity, setQuantity] = useState(10)
  const [setup, setSetup] = useState<PrintSetup>({})

  const printer = selectedPrinter(db.printers, printerId)
  const template = db.templates.find((t) => t.id === templateId) ?? db.templates[0]
  const batches = useMemo(() => db.batches.filter((b) => b.productId === product?.id).sort((a, b) => b.packedDate.localeCompare(a.packedDate)), [db.batches, product?.id])
  const effectiveBatch = batch ?? batches[0] ?? null
  const shop = labelShop(db)

  // Reset on close rather than in an effect, so reopening always starts fresh.
  const close = () => {
    setQuantity(10)
    setSetup({})
    onClose()
  }

  if (!product || !template) return null

  const merged = templateSetup(template, setup)
  const geo = sheetGeometry(template, merged)
  const pages = Math.ceil(quantity / geo.perPage)
  const spec = () => buildProductSpec(db, template, product, effectiveBatch, quantity, setup)
  const set = <K extends keyof PrintSetup>(k: K, v: PrintSetup[K]) => setSetup((s) => ({ ...s, [k]: v }))

  const printDirect = async () => {
    if (!printer || !can('print')) return
    setRawBusy(true)
    try {
      const item = spec().items[0]
      const prn = renderPrn(template, printer, item)
      const result = await sendPrn(printer, prn)
      message.success(`Sent to Windows queue (job ${result.spoolJobId}). Check the printer for completion.`)
    } catch (e) { message.error((e as Error).message) }
    finally { setRawBusy(false) }
  }

  return (
    <>
      <Modal
        open={open}
        onCancel={rawBusy ? undefined : close}
        width={720}
        title={`Print labels — ${product.name}`}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[12px] text-muted">
              {quantity} label{quantity === 1 ? '' : 's'} · {pages} page{pages === 1 ? '' : 's'} of{' '}
              <b className="text-ink">
                {geo.pageW.toFixed(1)} × {geo.pageH.toFixed(1)} mm
              </b>
            </span>
            <div className="flex gap-2">
              <Button disabled={rawBusy} onClick={close}>Cancel</Button>
              <Button icon={<FilePdfOutlined />} loading={out.request?.mode === 'pdf'} onClick={() => out.savePdf(spec(), product.name, effectiveBatch?.batchCode)}>
                Save as PDF
              </Button>
              <Button icon={<DesktopOutlined />} disabled={!can('print') || rawBusy} onClick={() => out.print(spec())}>
                Browser print
              </Button>
              <Button type="primary" loading={rawBusy} disabled={!can('print')} onClick={printer ? printDirect : () => { close(); navigate('/printers') }}>{printer ? 'Print PRN' : 'Set up PRN'}</Button>
            </div>
          </div>
        }
      >
        <div className="grid gap-5 sm:grid-cols-[260px_1fr]">
          <div>
            <div className="mb-1.5 text-[13px] font-medium">Printer for direct PRN</div>
            <Select className="w-full mb-3!" value={printer?.id} placeholder="Add a printer to enable PRN" onChange={(id) => { setPrinterId(id); setTemplateId(db.printers.find((p) => p.id === id)?.templateId) }} options={db.printers.map((p) => ({ value: p.id, label: p.name }))} />
            <p className="text-[12px] text-muted">Select a printer configured on the Printers page. PRN uses its saved template.</p>
            <div className="mb-1.5 text-[13px] font-medium">Label template</div>
            <Select className="w-full" value={template.id} onChange={setTemplateId} options={db.templates.map((t) => ({ value: t.id, label: `${t.name} · ${t.widthMm}×${t.heightMm}mm · ${t.columns}UP` }))} />

            <div className="mt-3 mb-1.5 text-[13px] font-medium">How many labels</div>
            <InputNumber className="w-full!" min={1} max={1000} value={quantity} onChange={(v) => setQuantity(v ?? 1)} />

            <PageSetupControls template={template} setup={setup} onChange={setSetup} />
          </div>

          <div className="min-w-0">
            <div className="mb-1.5 flex items-center justify-between text-[13px] font-medium">
              <span>Preview</span>
              <Tag variant="filled" color="green" className="m-0!">
                page {geo.pageW.toFixed(1)} × {geo.pageH.toFixed(1)} mm
              </Tag>
            </div>
            <div className="overflow-x-auto">
              <LabelRoll
                template={{ ...template, columns: geo.perPage as 1 | 2 | 3, gapMm: geo.gap }}
                product={product}
                batch={effectiveBatch}
                shop={shop}
                qrUrl={spec().items[0].qrUrl}
                scale={3.4}
                outline={merged.outline}
                textScale={merged.textScale ?? 1}
              />
            </div>

            <Collapse
              className="mt-3"
              size="small"
              items={[
                {
                  key: 'fine',
                  label: (
                    <span className="flex items-center gap-2 text-[13px]">
                      <RotateRightOutlined /> Fine alignment
                    </span>
                  ),
                  children: (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="mb-1 text-[12px] text-muted">Gap between labels</div>
                        <InputNumber className="w-full!" min={0} max={20} step={0.5} suffix="mm" value={merged.gapMm} onChange={(v) => set('gapMm', v ?? 0)} disabled={geo.perPage === 1} />
                      </div>
                      <div>
                        <div className="mb-1 text-[12px] text-muted">Text size</div>
                        <InputNumber className="w-full!" min={0.6} max={1.6} step={0.05} suffix="×" value={merged.textScale ?? 1} onChange={(v) => set('textScale', v ?? 1)} />
                      </div>
                      <div>
                        <div className="mb-1 text-[12px] text-muted">Nudge across</div>
                        <InputNumber className="w-full!" min={-20} max={20} step={0.5} suffix="mm" value={merged.offsetXMm} onChange={(v) => set('offsetXMm', v ?? 0)} />
                      </div>
                      <div>
                        <div className="mb-1 text-[12px] text-muted">Nudge down</div>
                        <InputNumber className="w-full!" min={-20} max={20} step={0.5} suffix="mm" value={merged.offsetYMm} onChange={(v) => set('offsetYMm', v ?? 0)} />
                      </div>
                      <div className="flex items-end pb-1">
                        <Checkbox checked={!!merged.outline} onChange={(e) => set('outline', e.target.checked)}>
                          Print outline (test)
                        </Checkbox>
                      </div>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </div>


      </Modal>
      <PrintSheet request={out.request} onDone={out.clear} />
    </>
  )
}
