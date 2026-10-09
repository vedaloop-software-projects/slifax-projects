import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { App as AntApp, Button, Modal, Progress, Select, Tabs, Tag, Tooltip } from 'antd'
import { CheckCircleFilled, CloseCircleFilled, LoadingOutlined, RedoOutlined } from '@ant-design/icons'
import { useDb } from '../../mock/db'
import { printerName, printing, productQr, qrUrl } from '../../api'
import { LabelRoll } from '../../components/LabelPreview'
import { PrintStateTag, PrinterStatusBadge } from '../../components/common'
import { renderPrnBatch } from '../../lib/prnRenderer'
import { labelShop } from '../../print/stationStore'
import { withExpiryOverride } from '../../lib/labelData'
import { fmtDate } from '../../lib/dates'
import type { PrintJob, PrintState } from '../../types'
import { jobSummary, type PrintSetup } from './printSetup'

export function PrinterTemplatePicker({ setup }: { setup: PrintSetup }) {
  const db = useDb()
  return (
    <div className="grid gap-3">
      <div>
        <div className="mb-1 text-[12px] font-medium text-muted">Printer</div>
        <Select
          className="w-full"
          placeholder="Add your printer on the Printers page"
          value={setup.printer?.id}
          onChange={setup.setPrinterId}
          options={db.printers.map((p) => ({
            value: p.id,
            label: (
              <div className="flex items-center justify-between gap-2">
                <span className="truncate">{p.name}</span>
                <PrinterStatusBadge status={p.status} />
              </div>
            ),
          }))}
        />
      </div>
      <div>
        <div className="mb-1 text-[12px] font-medium text-muted">Label template</div>
        <Select
          className="w-full"
          value={setup.template?.id}
          onChange={setup.setTemplateId}
          options={db.templates.map((t) => ({ value: t.id, label: `${t.name} · ${t.widthMm}×${t.heightMm}mm · ${t.columns}UP` }))}
        />
      </div>

    </div>
  )
}

/** Visual + PRN preview of everything currently in the queue. */
export function QueuePreviewModal({ open, onClose, setup, onPrint, printing: busy }: { open: boolean; onClose: () => void; setup: PrintSetup; onPrint?: () => void; printing?: boolean }) {
  const db = useDb()
  const navigate = useNavigate()
  const { printer, template } = setup
  const entries = db.queue
  const total = entries.reduce((a, q) => a + q.quantity, 0)

  const prn = useMemo(() => {
    if (!printer || !template) return ''
    try {
      return renderPrnBatch(template, printer, entries
      .map((q) => {
        const { product, batch } = withExpiryOverride(db.products.find((p) => p.id === q.productId)!, q.batchId ? db.batches.find((b) => b.id === q.batchId) ?? null : null, q.expiryDate, q.showExpiry !== false, q.packedDate)
        const qr = batch ? db.qrCodes.find((x) => x.entityId === batch.id) : productQr(db, product.id)
        return { product, batch, shop: labelShop(db), qrUrl: qr ? qrUrl(qr.id) : '', quantity: q.quantity }
      }))
    } catch (e) { return (e as Error).message }
  }, [db, entries, printer, template])

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={880}
      title={`Preview · ${total} labels`}
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] text-muted">
            {printer?.name} · {template?.name} · {printer?.language}
          </span>
          <div className="flex gap-2">
            <Button onClick={onClose}>Close</Button>
            {onPrint && (
              <Button type="primary" loading={busy} disabled={!entries.length} onClick={printer ? onPrint : () => { onClose(); navigate('/printers') }}>
                {printer ? `Print PRN ${total}` : 'Set up PRN'}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <Tabs
        items={[
          {
            key: 'visual',
            label: 'Labels',
            children: (
              <div className="max-h-[520px] space-y-5 overflow-y-auto pr-1">
                {template &&
                  entries.map((q) => {
                    const { product, batch } = withExpiryOverride(db.products.find((p) => p.id === q.productId)!, q.batchId ? db.batches.find((b) => b.id === q.batchId) ?? null : null, q.expiryDate, q.showExpiry !== false, q.packedDate)
                    const qr = batch ? db.qrCodes.find((x) => x.entityId === batch.id) : productQr(db, product.id)
                    return (
                      <div key={q.id}>
                        <div className="mb-2 flex items-center gap-2 text-[13px]">
                          <b>{q.quantity} × {product.name}</b>
                          {batch && <Tag variant="filled">{batch.batchCode}</Tag>}
                          <span className="text-muted">Expiry {fmtDate(batch?.expiryDate ?? product.expiryDate)}</span>
                        </div>
                        <div className="overflow-x-auto">
                          <LabelRoll template={template} product={product} batch={batch} shop={labelShop(db)} qrUrl={qr ? qrUrl(qr.id) : undefined} scale={3.6} />
                        </div>
                      </div>
                    )
                  })}
              </div>
            ),
          },
          {
            key: 'prn',
            label: `PRN (${printer?.language ?? '—'})`,
            children: <pre className="prn-code m-0">{prn || '; queue is empty'}</pre>,
          },
        ]}
      />
    </Modal>
  )
}

const STEPS: PrintState[] = ['QUEUED', 'VALIDATING', 'GENERATING', 'SENT_TO_PRINTER', 'PRINTING', 'PRINTED']

/** Live job card: lifecycle per item, progress, retry. */
export function JobProgressCard({ job, compact }: { job: PrintJob; compact?: boolean }) {
  const db = useDb()
  const { message } = AntApp.useApp()
  const s = jobSummary(job)
  const percent = Math.round((s.printed / Math.max(1, s.total)) * 100)

  const retry = async (itemId?: string) => {
    try {
      if (itemId) await printing.retryItem(job.id, itemId)
      else await printing.retryFailed(job.id)
      message.info('Retrying…')
    } catch (e) {
      message.error((e as Error).message)
    }
  }

  if (job.delivery === 'RAW') return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="font-semibold">{job.submissionError ? 'Submission not confirmed' : job.spoolJobId ? 'Sent to Windows print queue' : 'Submitting PRN...'}</div>
      <div className="text-[13px] mt-2">{s.total} labels ? {printerName(db, job.printerId)}{job.spoolJobId ? ` ? Windows job ${job.spoolJobId}` : ''}</div>
      <p className="text-[12px] text-muted mb-0">{job.submissionError ?? 'Windows manages this job. Physical printing and label counts are not confirmed by the app.'}</p>
      {job.submissionError && <p className="text-[12px] text-muted mb-0">Check the Windows queue and printed stock before requeueing. Do not retry blindly.</p>}
    </div>
  )

  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold">
            {s.done ? (s.failed ? `${s.printed}/${s.total} printed` : `✓ ${s.printed}/${s.total} printed`) : `Printing ${s.total} labels`}
          </div>
          <div className="text-[12px] text-muted">
            {printerName(db, job.printerId)} · {job.createdBy}
          </div>
        </div>
        <div className="flex items-center gap-3 text-[12px]">
          <span className="flex items-center gap-1 text-green-700"><CheckCircleFilled /> {s.printed}</span>
          {s.failed > 0 && <span className="flex items-center gap-1 text-red-600"><CloseCircleFilled /> {s.failed}</span>}
          {s.printing > 0 && <span className="flex items-center gap-1 text-muted"><LoadingOutlined /> {s.printing}</span>}
          {s.done && s.failed > 0 && <Button size="small" icon={<RedoOutlined />} onClick={() => retry()}>Retry failed</Button>}
        </div>
      </div>
      <Progress percent={percent} status={s.done ? (s.failed ? 'exception' : 'success') : 'active'} className="mt-2! mb-0!" strokeColor={s.failed ? undefined : '#0E8A5F'} />
      {!compact && (
        <div className="mt-3 divide-y divide-line">
          {job.items.map((i) => {
            const product = db.products.find((p) => p.id === i.productId)
            const stepIdx = STEPS.indexOf(i.state)
            return (
              <div key={i.id} className="flex flex-wrap items-center gap-3 py-2.5 text-[13px]">
                <span className="min-w-0 flex-1 truncate font-medium">
                  {i.quantity} × {product?.name}
                </span>
                <div className="hidden items-center gap-1 md:flex" aria-hidden>
                  {STEPS.map((st, idx) => (
                    <Tooltip key={st} title={st.replaceAll('_', ' ').toLowerCase()}>
                      <span
                        className={`h-1.5 w-5 rounded-full transition-colors duration-300 ${
                          i.state === 'FAILED' ? (idx <= 4 ? 'bg-red-300' : 'bg-line') : idx <= stepIdx ? 'bg-brand' : 'bg-line'
                        }`}
                      />
                    </Tooltip>
                  ))}
                </div>
                <span className="w-14 text-right text-muted tabular-nums">
                  {i.printed}/{i.quantity}
                </span>
                <PrintStateTag state={i.state} />
                {i.state === 'FAILED' && (
                  <Tooltip title={i.error}>
                    <Button size="small" type="link" icon={<RedoOutlined />} onClick={() => retry(i.id)}>
                      Retry
                    </Button>
                  </Tooltip>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
