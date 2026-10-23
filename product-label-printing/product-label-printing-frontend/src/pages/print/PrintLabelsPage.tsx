import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { App as AntApp, Button, Card, Checkbox, DatePicker, Empty, Input, InputNumber, Select, Tag } from 'antd'
import dayjs from 'dayjs'
import type { InputRef } from 'antd'
import { DeleteOutlined, PlusOutlined, PrinterOutlined, ScanOutlined } from '@ant-design/icons'
import { useDb } from '../../mock/db'
import { useSession } from '../../hooks/useSession'
import { printing, queue, searchProducts } from '../../api'
import { matchesProductCode } from '../../lib/productCodes'
import { ExpiryTag, Mono, PageHeader } from '../../components/common'
import { JobProgressCard } from './shared'
import { usePrintSetup } from './printSetup'
import { cx, money } from '../../lib/format'
import type { ExpiryChoice, Product } from '../../types'
import { defaultExpiry, isAllowedExpiryDate, isAllowedPackedDate, ownPackedDate, packedDateFor } from '../../lib/labelData'
import { outsideSafeArea } from '../../lib/labelLayout'
import { agentSettings } from '../../print/localAgent'
import { printQueueTo, stationSetup } from '../../print/station'
import { fmtDate, todayIso } from '../../lib/dates'

/** The golden path (§27): Search → select → quantity → add → preview → print → status. */
export function PrintLabelsPage() {
  const db = useDb()
  const navigate = useNavigate()
  const { message } = AntApp.useApp()
  const { can } = useSession()
  // Printer and label layout are chosen by the admin on the Printers page.
  const setup = usePrintSetup()
  const searchRef = useRef<InputRef>(null)
  const [term, setTerm] = useState('')
  const [active, setActive] = useState(0)
  const [qty, setQty] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState(false)
  const [remoteResults, setRemoteResults] = useState<Product[]>([])
  const [searching, setSearching] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)

  useEffect(() => searchRef.current?.focus(), [])

  useEffect(() => {
    const searchTerm = term.trim()
    if (!searchTerm) return
    let current = true
    const timer = window.setTimeout(() => {
      setSearching(true)
      void searchProducts(searchTerm)
        .then((products) => { if (current) setRemoteResults(products) })
        .catch((error: Error) => { if (current) message.error(error.message) })
        .finally(() => { if (current) setSearching(false) })
    }, 250)
    return () => { current = false; window.clearTimeout(timer) }
  }, [message, term])

  const results = useMemo(() => {
    const t = term.trim().toLowerCase()
    const list = (t ? remoteResults : db.products).filter((p) => p.status === 'ACTIVE')
    if (!t) return list.slice(0, 8)
    // exact barcode/code scan wins
    const exact = list.filter((p) => matchesProductCode(p.productCode, t) || matchesProductCode(p.variantCode, t) || p.eanCode?.toLowerCase() === t || p.pluCode?.toLowerCase() === t)
    if (exact.length) return exact
    return list.filter((p) => p.name.toLowerCase().includes(t) || p.productCode.includes(t) || p.category.toLowerCase().includes(t)).slice(0, 12)
  }, [db.products, remoteResults, term])

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

  // The printer an admin saved on this PC; users print with it without opening Printers.
  const station = stationSetup()
  const stationTemplate = station ? db.templates.find((t) => t.id === station.templateId) : undefined
  const legacyMapped = !!setup.printer && !!agentSettings().printers[setup.printer.id]
  const labelTemplate = station ? stationTemplate : setup.template

  const print = async () => {
    if (!station && (!setup.printer || !setup.template || !legacyMapped)) {
      if (can('printers.manage')) {
        message.info('Set up the printer for this PC first, then save it.')
        navigate('/printers')
      } else message.warning('This PC is not set up for printing yet. Ask your admin to set up the printer on this PC.')
      return
    }
    setBusy(true)
    try {
      if (station) {
        const { job, labels } = await printQueueTo(station)
        setJobId(job.id)
        message.success(`${labels} labels sent to ${station.printerName}`)
      } else {
        const j = await printing.printQueue(setup.printer!.id, setup.template!.id)
        setJobId(j.id)
      }
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
              suffix={searching ? 'Searching…' : undefined}
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
                      {p.variantCode && <><span>·</span><Mono>{p.variantCode}</Mono></>}
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
                  const packed = p ? packedDateFor(p, batch, q.packedDate) : null
                  // No choice yet: the product's own expiry, or nothing picked when it has none.
                  const choice: ExpiryChoice | undefined = q.expiryChoice ?? (q.expiryDate ? 'CUSTOM' : own ? 'PRODUCT' : undefined)
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
                        {showExpiry ? (
                          <>
                            <Select<ExpiryChoice>
                              size="small"
                              className="w-[132px]!"
                              aria-label={`Expiry option for ${p?.name}`}
                              value={choice}
                              onChange={(c) => queue.setExpiryChoice(q.id, c).catch((e: Error) => message.error(e.message))}
                              popupMatchSelectWidth={false}
                              options={[
                                ...(own ? [{ value: 'PRODUCT' as const, label: 'As per product' }] : []),
                                { value: 'MONTHS_3' as const, label: '3 months' },
                                { value: 'MONTHS_6' as const, label: '6 months' },
                                { value: 'CUSTOM' as const, label: 'Custom date' },
                              ]}
                              placeholder="Choose"
                            />
                            {choice === 'CUSTOM' ? (
                              <DatePicker
                                size="small"
                                format="DD-MM-YYYY"
                                className="w-[130px]!"
                                aria-label={`Custom expiry date for ${p?.name}`}
                                allowClear={false}
                                value={expiry ? dayjs(expiry) : null}
                                // Only later than the product's own expiry (and after today), never before the packed date.
                                disabledDate={(d) => !isAllowedExpiryDate(d.format('YYYY-MM-DD'), packed, own)}
                                onChange={(d) => d && queue.setExpiryChoice(q.id, 'CUSTOM', d.format('YYYY-MM-DD')).catch((e: Error) => message.error(e.message))}
                              />
                            ) : (
                              <span className="font-medium text-ink" title={choice === 'PRODUCT' ? undefined : `From the packed date ${packed ? fmtDate(packed) : ''}`}>
                                {expiry ? fmtDate(expiry) : 'No expiry'}
                              </span>
                            )}
                          </>
                        ) : (
                          <span>Not printed</span>
                        )}
                        {showExpiry && expiry && expiry < todayIso() && <Tag color="red" variant="filled" className="m-0!">Expired</Tag>}
                      </div>
                      {can('print.packedDate') && (
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
                          <span className="w-[70px]">Packed</span>
                          <DatePicker
                            size="small"
                            format="DD-MM-YYYY"
                            className="w-[132px]!"
                            aria-label={`Packed date for ${p?.name}`}
                            allowClear={false}
                            value={packed ? dayjs(packed) : null}
                            // Only earlier than the product's own packed date, and never after today.
                            disabledDate={(d) => !isAllowedPackedDate(d.format('YYYY-MM-DD'), p ? ownPackedDate(p, batch) : null)}
                            onChange={(d) => d && queue.setPackedDate(q.id, d.format('YYYY-MM-DD')).catch((e: Error) => message.error(e.message))}
                          />
                          {q.packedDate && (
                            <Button size="small" type="link" className="px-1!" onClick={() => queue.setPackedDate(q.id, null)}>As per product</Button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            <div className="mt-4 border-t border-line pt-4">
              <Button type="primary" size="large" block icon={<PrinterOutlined />} disabled={!db.queue.length} loading={busy} onClick={print}>
                Print{total ? ` ${total}` : ''}
              </Button>
              <div className="mt-2 text-center text-[12px] text-muted">
                {station
                  ? <>Prints to <b className="text-ink">{station.printerName}</b>{stationTemplate ? ` · ${stationTemplate.name}` : ''}</>
                  : legacyMapped && setup.printer
                    ? <>Prints to <b className="text-ink">{setup.printer.name}</b></>
                    : can('printers.manage')
                      ? <>This PC has no saved printer. <Button type="link" size="small" className="p-0!" onClick={() => navigate('/printers')}>Set it up</Button></>
                      : 'This PC is not set up for printing yet. Ask your admin.'}
              </div>
              {labelTemplate && outsideSafeArea(labelTemplate).length > 0 && (
                <div className="mt-2 text-[12px] text-amber-700">Some fields of {labelTemplate.name} are outside the safe print area and may be cut off. Ask your admin to fix the template.</div>
              )}
            </div>
          </Card>

          {job && <JobProgressCard job={job} />}
        </div>
      </div>
    </>
  )
}
