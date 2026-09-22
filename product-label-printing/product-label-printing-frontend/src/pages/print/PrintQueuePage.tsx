import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { App as AntApp, Button, Card, Empty, InputNumber, Modal, Popconfirm, Select, Table, Tabs, Tag } from 'antd'
import type { TableColumnsType } from 'antd'
import { ClearOutlined, CodeOutlined, DeleteOutlined, DesktopOutlined, EyeOutlined, FilePdfOutlined, PlusOutlined, PrinterOutlined, RedoOutlined } from '@ant-design/icons'
import { useDb } from '../../mock/db'
import { useSession } from '../../hooks/useSession'
import { printerName, printing, queue } from '../../api'
import { PrintSheet } from '../../print/PrintSheet'
import { buildSpec, useLabelOutput } from '../../print/labelOutput'
import { PageSetupControls } from '../../print/PageSetupControls'
import type { PrintSetup } from '../../print/PrintSheet'
import { ExpiryTag, Mono, PageHeader, PrintStateTag } from '../../components/common'
import { JobProgressCard, PrinterTemplatePicker, QueuePreviewModal } from './shared'
import { jobSummary, usePrintSetup } from './printSetup'
import { fmtDateTime, timeAgo } from '../../lib/dates'
import type { PrintJob, QueueEntry } from '../../types'

export function PrintQueuePage() {
  const db = useDb()
  const { can } = useSession()
  const navigate = useNavigate()
  const { message } = AntApp.useApp()
  const setup = usePrintSetup()
  const [preview, setPreview] = useState(false)
  const [busy, setBusy] = useState(false)
  const [prnJob, setPrnJob] = useState<PrintJob | null>(null)
  const canPrint = can('print')
  const output = useLabelOutput()
  const [pageSetup, setPageSetup] = useState<PrintSetup>({})

  /** Print through a printer installed on this computer — no backend, no print agent. */
  const printHere = async () => {
    if (!setup.template) return
    output.print(buildSpec(db, setup.template, pageSetup))
    try {
      await printing.recordBrowserPrint(setup.template.id)
    } catch (e) {
      message.error((e as Error).message)
    }
  }

  /** Same labels, saved as an exact-size PDF instead of going to a printer. */
  const savePdf = () => {
    if (!setup.template) return
    output.savePdf(buildSpec(db, setup.template, pageSetup), 'labels', setup.template.name)
  }

  const total = db.queue.reduce((a, q) => a + q.quantity, 0)
  const activeJobs = db.printJobs.filter((j) => !j.finishedAt)
  // Keep jobs that finished since this page opened (or shortly before) visible in "Live jobs"
  const [openedAt] = useState(() => new Date(Date.now() - 10 * 60_000).toISOString())
  const recentFinished = db.printJobs.filter((j) => j.finishedAt && j.finishedAt >= openedAt).slice(0, 3)

  const print = async () => {
    if (!setup.printer || !setup.template) return
    setBusy(true)
    try {
      await printing.printQueue(setup.printer.id, setup.template.id)
      setPreview(false)
      message.success('Print job sent to the print agent')
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const queueColumns: TableColumnsType<QueueEntry> = [
    {
      title: 'Product',
      key: 'p',
      render: (_, q) => {
        const p = db.products.find((x) => x.id === q.productId)
        return (
          <>
            <div className="font-semibold">{p?.name}</div>
            <Mono className="text-muted">{p?.productCode}</Mono>
          </>
        )
      },
    },
    {
      title: 'Batch',
      key: 'b',
      render: (_, q) => (
        <Select
          size="small"
          className="w-40"
          disabled={!canPrint}
          value={q.batchId ?? '__latest'}
          onChange={(v) => queue.setBatch(q.id, v === '__latest' ? null : v)}
          options={[
            { value: '__latest', label: 'Product (latest dates)' },
            ...db.batches.filter((b) => b.productId === q.productId).sort((a, b) => b.packedDate.localeCompare(a.packedDate)).map((b) => ({ value: b.id, label: b.batchCode })),
          ]}
        />
      ),
    },
    {
      title: 'Expiry',
      key: 'e',
      responsive: ['md'],
      render: (_, q) => {
        const b = q.batchId ? db.batches.find((x) => x.id === q.batchId) : null
        return <ExpiryTag date={b ? b.expiryDate : db.products.find((p) => p.id === q.productId)?.expiryDate ?? null} />
      },
    },
    { title: 'Qty', key: 'q', width: 110, render: (_, q) => <InputNumber size="small" min={1} max={1000} value={q.quantity} disabled={!canPrint} onChange={(v) => queue.setQuantity(q.id, v ?? 1)} className="w-20!" /> },
    { title: 'Status', key: 's', responsive: ['sm'], render: () => <Tag color="green" variant="filled">READY</Tag> },
    { title: '', key: 'x', align: 'right', render: (_, q) => canPrint && <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => queue.remove(q.id)} aria-label="Remove" /> },
  ]

  const historyColumns: TableColumnsType<PrintJob> = [
    { title: 'Job', dataIndex: 'id', render: (id: string) => <Mono>{id.slice(0, 16)}</Mono>, responsive: ['lg'] },
    {
      title: 'Products',
      key: 'p',
      render: (_, j) => (
        <span className="line-clamp-1">{j.items.map((i) => `${i.quantity}× ${db.products.find((p) => p.id === i.productId)?.name}`).join(', ')}</span>
      ),
    },
    { title: 'Printer', key: 'pr', responsive: ['md'], render: (_, j) => printerName(db, j.printerId) },
    { title: 'By', dataIndex: 'createdBy', responsive: ['lg'] },
    {
      title: 'Labels',
      key: 'l',
      align: 'right',
      render: (_, j) => {
        const s = jobSummary(j)
        return (
          <span className="tabular-nums">
            {s.printed}/{s.total}
          </span>
        )
      },
    },
    {
      title: 'Status',
      key: 's',
      render: (_, j) => {
        const s = jobSummary(j)
        return !s.done ? <PrintStateTag state="PRINTING" /> : s.failed ? <Tag color="error" variant="filled">{s.printed ? 'Partial' : 'Failed'}</Tag> : <PrintStateTag state="PRINTED" />
      },
    },
    { title: 'When', dataIndex: 'createdAt', render: (t: string) => <span title={fmtDateTime(t)}>{timeAgo(t)}</span> },
    {
      title: '',
      key: 'a',
      align: 'right',
      render: (_, j) => (
        <div className="flex justify-end gap-1">
          {j.prn && <Button size="small" type="text" icon={<CodeOutlined />} onClick={() => setPrnJob(j)} aria-label="View PRN" />}
          {canPrint && j.finishedAt && jobSummary(j).failed > 0 && (
            <Button size="small" type="text" icon={<RedoOutlined />} onClick={() => printing.retryFailed(j.id)}>
              Retry
            </Button>
          )}
          {canPrint && j.finishedAt && (
            <Button
              size="small"
              type="text"
              icon={<PlusOutlined />}
              onClick={async () => {
                await printing.requeue(j.id)
                message.success('Added back to the queue')
              }}
            >
              Reprint
            </Button>
          )}
        </div>
      ),
    },
  ]

  const historyStats = useMemo(() => {
    const done = db.printJobs.filter((j) => j.finishedAt)
    return { jobs: done.length, failed: done.filter((j) => jobSummary(j).failed > 0).length }
  }, [db.printJobs])

  return (
    <>
      <PageHeader
        title="Print queue"
        subtitle="Review, preview and send label batches to a printer. Jobs report live status from the print agent."
        extra={canPrint && <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/labels')}>Add products</Button>}
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card
          title={
            <span className="flex items-center gap-2">
              Ready to print <Tag variant="filled" color="green">{db.queue.length} products · {total} labels</Tag>
            </span>
          }
          extra={
            canPrint &&
            db.queue.length > 0 && (
              <Popconfirm title="Clear the whole queue?" onConfirm={() => queue.clear()} okText="Clear">
                <Button type="text" danger icon={<ClearOutlined />}>
                  Clear
                </Button>
              </Popconfirm>
            )
          }
          styles={{ body: { padding: 0 } }}
        >
          <Table<QueueEntry> rowKey="id" columns={queueColumns} dataSource={db.queue} pagination={false} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Queue is empty" /> }} scroll={{ x: 560 }} />
        </Card>

        <Card title="Send to printer" className="xl:sticky xl:top-[88px] xl:self-start">
          <div className="mb-4 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl bg-canvas p-3">
              <div className="text-[22px] font-bold tabular-nums">{db.queue.length}</div>
              <div className="text-[12px] text-muted">Total products</div>
            </div>
            <div className="rounded-xl bg-brand-soft p-3">
              <div className="text-[22px] font-bold text-brand tabular-nums">{total}</div>
              <div className="text-[12px] text-muted">Total labels</div>
            </div>
          </div>
          <PrinterTemplatePicker setup={setup} />
          {setup.template && <PageSetupControls template={setup.template} setup={pageSetup} onChange={setPageSetup} />}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button icon={<EyeOutlined />} disabled={!db.queue.length} onClick={() => setPreview(true)}>
              Preview all
            </Button>
            <Button type="primary" icon={<PrinterOutlined />} disabled={!canPrint || !db.queue.length} loading={busy} onClick={print}>
              Print batch
            </Button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button icon={<DesktopOutlined />} disabled={!canPrint || !db.queue.length || !setup.template} onClick={printHere}>
              Print here
            </Button>
            <Button icon={<FilePdfOutlined />} loading={output.request?.mode === 'pdf'} disabled={!db.queue.length || !setup.template} onClick={savePdf}>
              Save PDF
            </Button>
          </div>
          <div className="mt-1.5 text-center text-[11px] text-muted">Print here uses a printer installed on this computer — no agent needed</div>
        </Card>
      </div>

      {(activeJobs.length > 0 || recentFinished.length > 0) && (
        <div className="mt-6">
          <h3 className="mb-3 text-[15px] font-semibold">Live jobs</h3>
          <div className="grid gap-3 lg:grid-cols-2">
            {[...activeJobs, ...recentFinished.filter((j) => !activeJobs.includes(j))].map((j) => (
              <JobProgressCard key={j.id} job={j} />
            ))}
          </div>
        </div>
      )}

      <Card className="mt-6" styles={{ body: { padding: 0 } }}>
        <Tabs
          className="px-4"
          items={[
            {
              key: 'history',
              label: `Job history (${historyStats.jobs})`,
              children: (
                <Table<PrintJob>
                  rowKey="id"
                  columns={historyColumns}
                  dataSource={db.printJobs}
                  pagination={{ pageSize: 10, showSizeChanger: false }}
                  className="-mx-4"
                  scroll={{ x: 720 }}
                  expandable={{
                    expandedRowRender: (j) => (
                      <div className="space-y-1.5 py-1">
                        {j.items.map((i) => (
                          <div key={i.id} className="flex flex-wrap items-center gap-3 text-[13px]">
                            <span className="min-w-[220px] font-medium">{db.products.find((p) => p.id === i.productId)?.name}</span>
                            <span className="tabular-nums text-muted">{i.printed}/{i.quantity}</span>
                            <PrintStateTag state={i.state} />
                            {i.attempts > 1 && <Tag variant="filled">{i.attempts} attempts</Tag>}
                            {i.error && <span className="text-red-600">{i.error}</span>}
                          </div>
                        ))}
                      </div>
                    ),
                  }}
                />
              ),
            },
          ]}
        />
      </Card>

      <PrintSheet request={output.request} onDone={output.clear} />
      <QueuePreviewModal open={preview} onClose={() => setPreview(false)} setup={setup} onPrint={canPrint ? print : undefined} printing={busy} />
      <Modal open={!!prnJob} onCancel={() => setPrnJob(null)} footer={null} width={760} title="Generated PRN (retained for audit)">
        <pre className="prn-code m-0">{prnJob?.prn}</pre>
      </Modal>
    </>
  )
}
