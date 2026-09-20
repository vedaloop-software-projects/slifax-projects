import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { App as AntApp, Button, Card, Empty, Input, InputNumber, Tag } from 'antd'
import type { InputRef } from 'antd'
import { DeleteOutlined, EyeOutlined, PlusOutlined, PrinterOutlined, ScanOutlined } from '@ant-design/icons'
import { useDb } from '../../mock/db'
import { printing, queue } from '../../api'
import { ExpiryTag, Mono, PageHeader } from '../../components/common'
import { JobProgressCard, PrinterTemplatePicker, QueuePreviewModal } from './shared'
import { usePrintSetup } from './printSetup'
import { cx, money } from '../../lib/format'
import type { Product } from '../../types'

/** The golden path (§27): Search → select → quantity → add → preview → print → status. */
export function PrintLabelsPage() {
  const db = useDb()
  const navigate = useNavigate()
  const { message } = AntApp.useApp()
  const setup = usePrintSetup()
  const searchRef = useRef<InputRef>(null)
  const [term, setTerm] = useState('')
  const [active, setActive] = useState(0)
  const [qty, setQty] = useState<Record<string, number>>({})
  const [preview, setPreview] = useState(false)
  const [busy, setBusy] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)

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
    if (!setup.printer || !setup.template) return
    setBusy(true)
    try {
      const j = await printing.printQueue(setup.printer.id, setup.template.id)
      setJobId(j.id)
      setPreview(false)
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
      <PageHeader title="Print labels" subtitle="Search or scan a product, set quantity, add to queue, print. ↑ ↓ to move · Enter to add." />

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
            extra={<Button type="link" onClick={() => navigate('/queue')}>Manage</Button>}
            styles={{ body: { paddingTop: 8 } }}
          >
            {db.queue.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nothing queued yet" />
            ) : (
              <div className="max-h-[260px] divide-y divide-line overflow-y-auto">
                {db.queue.map((q) => {
                  const p = db.products.find((x) => x.id === q.productId)
                  return (
                    <div key={q.id} className="flex items-center gap-2 py-2">
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{p?.name}</span>
                      <InputNumber size="small" min={1} max={1000} value={q.quantity} onChange={(v) => queue.setQuantity(q.id, v ?? 1)} className="w-16!" />
                      <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => queue.remove(q.id)} aria-label="Remove" />
                    </div>
                  )
                })}
              </div>
            )}
            <div className="mt-4 border-t border-line pt-4">
              <PrinterTemplatePicker setup={setup} />
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button icon={<EyeOutlined />} disabled={!db.queue.length} onClick={() => setPreview(true)}>
                  Preview
                </Button>
                <Button type="primary" icon={<PrinterOutlined />} disabled={!db.queue.length || !setup.printer} loading={busy} onClick={print}>
                  Print {total || ''}
                </Button>
              </div>
            </div>
          </Card>

          {job && <JobProgressCard job={job} />}
        </div>
      </div>

      <QueuePreviewModal open={preview} onClose={() => setPreview(false)} setup={setup} onPrint={print} printing={busy} />
    </>
  )
}
