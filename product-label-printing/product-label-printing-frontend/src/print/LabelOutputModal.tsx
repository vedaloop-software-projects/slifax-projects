import { useMemo, useState } from 'react'
import { Alert, Button, Checkbox, Collapse, InputNumber, Modal, Select, Tag } from 'antd'
import { DesktopOutlined, FilePdfOutlined, RotateRightOutlined } from '@ant-design/icons'
import type { Product, ProductBatch } from '../types'
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
  const { can } = useSession()
  const out = useLabelOutput()
  const [templateId, setTemplateId] = useState<string | undefined>(db.printers[0]?.templateId ?? db.templates[0]?.id)
  const [quantity, setQuantity] = useState(10)
  const [setup, setSetup] = useState<PrintSetup>({})

  const template = db.templates.find((t) => t.id === templateId) ?? db.templates[0]
  const batches = useMemo(() => db.batches.filter((b) => b.productId === product?.id).sort((a, b) => b.packedDate.localeCompare(a.packedDate)), [db.batches, product?.id])
  const effectiveBatch = batch ?? batches[0] ?? null
  const shop = db.shops.find((s) => s.id === product?.shopId)

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

  return (
    <>
      <Modal
        open={open}
        onCancel={close}
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
              <Button onClick={close}>Cancel</Button>
              <Button icon={<FilePdfOutlined />} loading={out.request?.mode === 'pdf'} onClick={() => out.savePdf(spec(), product.name, effectiveBatch?.batchCode)}>
                Save as PDF
              </Button>
              <Button type="primary" icon={<DesktopOutlined />} disabled={!can('print')} onClick={() => out.print(spec())}>
                Print
              </Button>
            </div>
          </div>
        }
      >
        <div className="grid gap-5 sm:grid-cols-[260px_1fr]">
          <div>
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

        <Alert
          className="mt-4"
          type="warning"
          showIcon
          title="Match the paper to one full row of stickers"
          description={
            <ol className="m-0 pl-4 text-[13px]">
              <li>
                Set the printer's paper size to <b>{geo.pageW.toFixed(1)} × {geo.pageH.toFixed(1)} mm</b> — Printers &amp; scanners → your printer → Printing preferences.
              </li>
              <li>
                In the print dialog: <b>Margins</b> None, <b>Scale</b> 100 (never "Fit to page"), untick <b>Headers and footers</b>.
              </li>
              <li>For PDF printing, select "Actual size" and one PDF page per sheet. Disable automatic rotation and multiple-pages-per-sheet printing.</li>
            </ol>
          }
        />
      </Modal>
      <PrintSheet request={out.request} onDone={out.clear} />
    </>
  )
}
