import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { App as AntApp, Button, Card, Checkbox, DatePicker, Empty, Input, InputNumber, Tag } from 'antd'
import dayjs from 'dayjs'
import type { InputRef } from 'antd'
import { DeleteOutlined, DesktopOutlined, PlusOutlined, PrinterOutlined, ScanOutlined } from '@ant-design/icons'
import { useDb } from '../../mock/db'
import { useSession } from '../../hooks/useSession'
import { printing, queue } from '../../api'
import { PrintSheet } from '../../print/PrintSheet'
import { buildSpec, useLabelOutput } from '../../print/labelOutput'
import { ExpiryTag, Mono, PageHeader } from '../../components/common'
import { JobProgressCard } from './shared'
import { usePrintSetup } from './printSetup'
import { cx, money } from '../../lib/format'
import type { Product } from '../../types'
import { defaultExpiry } from '../../lib/labelData'
import { fmtDate, todayIso } from '../../lib/dates'

/** The golden path (§27): Search → select → quantity → add → preview → print → status. */
export function PrintLabelsPage() {
  const db = useDb()
  const navigate = useNavigate()
  const { message } = AntApp.useApp()
  const { can } = useSession()
  // Regular users only choose whether the expiry prints; admins can also change the date.
  const canEditExpiry = can('templates.manage')
  // Printer and label layout are chosen by the admin on the Printers page.
  const setup = usePrintSetup()
  const searchRef = useRef<InputRef>(null)
  const [term, setTerm] = useState('')
  const [active, setActive] = useState(0)
  const [qty, setQty] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const output = useLabelOutput()

  /** Print through a printer installed on this computer — no backend, no print agent. */
  const printHere = () => {
    if (!setup.template || !db.queue.length) return
    output.print(buildSpec(db, setup.template, {}))
  }

  useEffect(() => searchRef.current?.focus(), [])

  const results = useMemo(() => {
    const t = term.trim().toLowerCase()
    const list = db.products.filter((p) => p.status === 'ACTIVE')
    if (!t) return list.slice(0, 8)
    // exact barcode/code scan wins
    const exact = list.filter((p) => p.productCode === t || p.eanCode === t || p.pluCode === t)
    if (exact.length) return exact
    return list.filter((p) => p.name.toLowerCase().includes(t) || p.productCode.includes(t) || p.category.toLowerCase().includes(t)).slice(0, 12)
  }, [db.products, term])

  const total = db.queue.reduce((a, q) => a + q.quantity, 0)
  const job = db.printJobs.find((j) => j.id === jobId)

  const add = async (p: Product) => {
    const n = qty[p.id] ?? 1
    try {
      await queue.add(p.id, n)
      message.success({ content: `${n} × ${p.name} queued`, duration: 1.4 })
      setQty((s) => ({ ...s, [p.id]: 1 }))
      setTerm('')
      setActive(0)
      searchRef.current?.focus()
    } catch (e) {
      message.error((e as Error).message)
    }
  }

  const print = async () => {
    if (!setup.printer || !setup.template) {
      if (can('printers.manage')) navigate('/printers')
      else message.warning('No label printer is set up yet. Ask your admin to add one.')
      return
    }
    setBusy(true)
    try {
      const j = await printing.printQueue(setup.printer.id, setup.template.id)
      setJobId(j.id)
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(results.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault()
      void add(results[active])
    }
  }

  return (
    <>
      <PageHeader title="Barcode Printing" subtitle="Search or scan a product, set quantity, add to the print list, then print. ↑ ↓ to move · Enter to add." />

      <div className="grid gap-4 xl:grid-cols-[1fr_400px]">
        <Card styles={{ body: { padding: 0 } }}>
          <div className="border-b border-line p-4">
            <Input
              ref={searchRef}
              size="large"
              prefix={<ScanOutlined className="text-brand" />}
              placeholder="Type “toor dal” or scan a barcode…"
              value={term}
              onChange={(e) => {
                setTerm(e.target.value)
                setActive(0)
              }}
              onKeyDown={onKey}
              allowClear
            />
          </div>
          {results.length === 0 ? (
            <Empty className="py-12" description="No active products match" />
          ) : (
            <div className="divide-y divide-line">
              {results.map((p, i) => (
                <div
                  key={p.id}
                  onMouseEnter={() => setActive(i)}
                  className={cx('flex flex-wrap items-center gap-4 px-4 py-3 transition-colors duration-150', i === active && 'bg-brand-soft/60')}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{p.name}</div>
                    <div className="flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
                      <Mono>{p.productCode}</Mono>
                      <span>·</span>
                      <span>
                        {money(p.salePrice)} <s>{money(p.mrp)}</s>
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">Expiry <ExpiryTag date={p.expiryDate} /></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <InputNumber min={1} max={1000} value={qty[p.id] ?? 1} onChange={(v) => setQty((s) => ({ ...s, [p.id]: v ?? 1 }))} className="w-20!" aria-label={`Quantity for ${p.name}`} />
                    <Button type={i === active ? 'primary' : 'default'} icon={<PlusOutlined />} onClick={() => add(p)}>
                      Add
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-4 xl:sticky xl:top-[88px] xl:self-start">
          <Card
            title={
              <span className="flex items-center gap-2">
                Queue <Tag variant="filled" color="green">{total} labels</Tag>
              </span>
            }
            extra={<Button type="link" onClick={() => navigate('/print-history')}>Print history</Button>}
            styles={{ body: { paddingTop: 8 } }}
          >
            {db.queue.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nothing queued yet" />
            ) : (
              <div className="max-h-[360px] divide-y divide-line overflow-y-auto">
                {db.queue.map((q) => {
                  const p = db.products.find((x) => x.id === q.productId)
                  const batch = q.batchId ? db.batches.find((b) => b.id === q.batchId) ?? null : null
                  const own = p ? defaultExpiry(p, batch) : null
                  const expiry = q.expiryDate ?? own
                  const showExpiry = q.showExpiry !== false
                  return (
                    <div key={q.id} className="py-2">
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium" title={p?.name}>{p?.name}</span>
                        <InputNumber size="small" min={1} max={1000} value={q.quantity} onChange={(v) => queue.setQuantity(q.id, v ?? 1)} className="w-16!" aria-label={`Quantity for ${p?.name}`} />
                        <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => queue.remove(q.id)} aria-label="Remove" />
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
                        <Checkbox
                          checked={showExpiry}
                          onChange={(e) => queue.setShowExpiry(q.id, e.target.checked)}
                          aria-label={`Print expiry date for ${p?.name}`}
                          className="text-[12px]!"
                        >
                          Expiry
                        </Checkbox>
                        {canEditExpiry ? (
                          <DatePicker
                            disabled={!showExpiry}
                            size="small"
                            format="DD-MM-YYYY"
                            className="w-[130px]!"
                            aria-label={`Expiry date for ${p?.name}`}
                            placeholder="No expiry"
                            allowClear={false}
                            value={expiry ? dayjs(expiry) : null}
                            onChange={(d) => d && queue.setExpiry(q.id, d.format('YYYY-MM-DD'))}
                          />
                        ) : (
                          showExpiry && <span className="font-medium text-ink">{expiry ? fmtDate(expiry) : 'No expiry'}</span>
                        )}
                        {!showExpiry && <span>Not printed</span>}
                        {canEditExpiry && showExpiry && q.expiryDate && (
                          <Button size="small" type="link" className="h-auto! px-1!" onClick={() => queue.setExpiry(q.id, null)}>
                            Reset
                          </Button>
                        )}
                        {showExpiry && expiry && expiry < todayIso() && <Tag color="red" variant="filled" className="m-0!">Expired</Tag>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-4">
              <Button type="primary" size="large" icon={<PrinterOutlined />} disabled={!db.queue.length} loading={busy} onClick={print}>
                Print{total ? ` ${total}` : ''}
              </Button>
              <Button size="large" icon={<DesktopOutlined />} disabled={!db.queue.length || !setup.template} onClick={printHere}>
                Browser print
              </Button>
            </div>
          </Card>

          {job && <JobProgressCard job={job} />}
        </div>
      </div>

      <PrintSheet request={output.request} onDone={output.clear} />
    </>
  )
}
