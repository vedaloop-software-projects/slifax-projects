import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { App as AntApp, Breadcrumb, Button, Card, Col, Descriptions, Empty, Result, Row, Segmented, Table, Tabs, Tag, Timeline, Typography } from 'antd'
import { CopyOutlined, EditOutlined, ExportOutlined, InboxOutlined, PrinterOutlined } from '@ant-design/icons'
import { QRCodeSVG } from 'qrcode.react'
import { useDb } from '../../mock/db'
import { useSession } from '../../hooks/useSession'
import { productQr, qrUrl } from '../../api'
import { ExpiryTag, KpiCard, Mono, PageHeader, ProductStatusTag } from '../../components/common'
import { AddToQueueButton } from '../../components/AddToQueueButton'
import { LabelRoll } from '../../components/LabelPreview'
import { Barcode } from '../../components/Barcode'
import { PrintActivityChart, ScanActivityChart, DonutChart } from '../../components/charts'
import { ProductFormDrawer } from './ProductFormDrawer'
import { LabelOutputModal } from '../../print/LabelOutputModal'
import { BatchFormModal } from '../BatchesPage'
import { dailySeries, groupCount, inLastDays, printTotals, uniqueVisitors, type Range } from '../../lib/analytics'
import { EXPIRY_RULES, fmtDate, fmtDateTime } from '../../lib/dates'
import { count, money } from '../../lib/format'
import type { ProductBatch } from '../../types'

export function ProductDetailPage() {
  const { id } = useParams()
  const db = useDb()
  const { can } = useSession()
  const navigate = useNavigate()
  const { message } = AntApp.useApp()
  const [editOpen, setEditOpen] = useState(false)
  const [batchOpen, setBatchOpen] = useState(false)
  const [outputOpen, setOutputOpen] = useState(false)
  const [range, setRange] = useState<Range>(30)

  const product = db.products.find((p) => p.id === id)
  const shop = db.shops.find((s) => s.id === product?.shopId)
  const qr = product ? productQr(db, product.id) : undefined
  const batches = useMemo(() => db.batches.filter((b) => b.productId === id).sort((a, b) => b.packedDate.localeCompare(a.packedDate)), [db.batches, id])
  const prints = useMemo(() => db.printEvents.filter((e) => e.productId === id), [db.printEvents, id])
  const scans = useMemo(() => db.scanEvents.filter((e) => e.productId === id), [db.scanEvents, id])
  const series = useMemo(() => dailySeries(inLastDays(prints, range), inLastDays(scans, range), range), [prints, scans, range])
  const logs = useMemo(() => {
    const related = new Set([id, qr?.id, ...batches.map((b) => b.id), ...db.qrCodes.filter((q) => batches.some((b) => b.id === q.entityId)).map((q) => q.id)])
    const jobIds = new Set(db.printJobs.filter((j) => j.items.some((i) => i.productId === id)).map((j) => j.id))
    return db.auditLogs.filter((l) => (l.entityId && related.has(l.entityId)) || (l.entityId && jobIds.has(l.entityId))).slice(0, 40)
  }, [db.auditLogs, db.qrCodes, db.printJobs, batches, id, qr?.id])

  if (!product) {
    return <Result status="404" title="Product not found" extra={<Button onClick={() => navigate('/products')}>Back to products</Button>} />
  }

  const url = qr ? qrUrl(qr.id) : ''
  const totals = printTotals(prints)
  const tpl = db.templates.find((t) => t.id === db.printers[0]?.templateId) ?? db.templates[0]
  const copy = (text: string) => {
    void navigator.clipboard?.writeText(text)
    message.success('Copied')
  }

  const batchScans = (b: ProductBatch) => scans.filter((s) => s.batchId === b.id).length

  return (
    <>
      <Breadcrumb className="mb-3" items={[{ title: <Link to="/products">Products</Link> }, { title: product.name }]} />
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {product.name} <ProductStatusTag status={product.status} />
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              Code <Mono className="text-ink">{product.productCode}</Mono>
            </span>
            <span>·</span>
            <span>
              {product.category} · {product.brand}
            </span>
            <span>·</span>
            <span>{shop?.location}</span>
          </span>
        }
        extra={
          <>
            {can('products.manage') && (
              <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>
                Edit
              </Button>
            )}
            <AddToQueueButton product={product} size="middle" />
            <Button type="primary" icon={<PrinterOutlined />} onClick={() => setOutputOpen(true)}>
              Print / PDF
            </Button>
          </>
        }
      />

      <Row gutter={[16, 16]} className="stagger">
        <Col xs={12} lg={6}><KpiCard label="Labels printed" value={count(totals.printed)} hint={`${count(totals.failed)} failed`} /></Col>
        <Col xs={12} lg={6}><KpiCard label="QR scans" value={count(scans.length)} hint={`${count(uniqueVisitors(scans))} unique visitors`} tone="orange" /></Col>
        <Col xs={12} lg={6}><KpiCard label="Batches" value={batches.length} hint={batches[0] ? `Latest ${batches[0].batchCode}` : '—'} tone="violet" /></Col>
        <Col xs={12} lg={6}><KpiCard label="Current stock*" value="—" hint="*Inventory integration (Phase 5)" tone="slate" /></Col>
      </Row>

      <Card className="mt-4" styles={{ body: { paddingTop: 4 } }}>
        <Tabs
          items={[
            {
              key: 'overview',
              label: 'Overview',
              children: (
                <Row gutter={[24, 24]}>
                  <Col xs={24} xl={14}>
                    <Descriptions
                      column={{ xs: 1, sm: 2 }}
                      size="small"
                      bordered
                      items={[
                        { label: 'Global ID', span: 'filled', children: <span className="flex items-center gap-2"><Mono>{product.globalId}</Mono><Button size="small" type="text" icon={<CopyOutlined />} onClick={() => copy(product.globalId)} /></span> },
                        { label: 'SKU / Code', children: <Mono>{product.productCode}</Mono> },
                        { label: 'EAN / UPC', children: product.eanCode ? <Mono>{product.eanCode}</Mono> : '—' },
                        { label: 'PLU', children: product.pluCode ?? '—' },
                        { label: 'Unit', children: product.unit },
                        { label: 'MRP', children: money(product.mrp) },
                        { label: 'Sale price', children: <b>{money(product.salePrice)}</b> },
                        { label: 'Tax', children: `${product.taxPercent}% GST` },
                        { label: 'Discount', children: `${Math.round((1 - product.salePrice / product.mrp) * 100)}%` },
                        { label: 'Packed', children: fmtDate(product.packedDate) },
                        { label: 'Expiry', children: <ExpiryTag date={product.expiryDate} /> },
                        { label: 'Shelf life', children: product.expiryRule === 'CUSTOM' ? `${product.shelfLifeMonths} months` : EXPIRY_RULES.find((r) => r.value === product.expiryRule)?.label },
                        { label: 'Shop', children: shop ? `${shop.location}` : '—' },
                        { label: 'Created', children: fmtDateTime(product.createdAt) },
                        { label: 'Updated', children: fmtDateTime(product.updatedAt) },
                      ]}
                    />
                    <div className="mt-6">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="text-[12px] font-semibold tracking-wide text-muted uppercase">Label preview · {tpl.name}</div>
                        <div className="flex gap-2">
                          <Button size="small" icon={<PrinterOutlined />} onClick={() => setOutputOpen(true)}>
                            Print
                          </Button>
                          <Button size="small" icon={<ExportOutlined />} onClick={() => setOutputOpen(true)}>
                            Save as PDF
                          </Button>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <LabelRoll template={tpl} product={product} batch={batches[0]} shop={shop} qrUrl={url} scale={4.2} />
                      </div>
                    </div>
                  </Col>
                  <Col xs={24} xl={10}>
                    <div className="rounded-2xl border border-line p-5">
                      <div className="flex items-start gap-5">
                        <div className="rounded-xl border border-line bg-white p-3">
                          {qr && <QRCodeSVG value={url} size={132} level="M" marginSize={0} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] font-semibold tracking-wide text-muted uppercase">QR identity</div>
                          <Mono className="mt-1 block break-all text-ink">{qr?.id}</Mono>
                          <Tag className="mt-2" color={qr?.status === 'ACTIVE' ? 'green' : 'red'} variant="filled">{qr?.status}</Tag>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button size="small" icon={<CopyOutlined />} onClick={() => copy(url)}>Copy URL</Button>
                            <Button size="small" icon={<ExportOutlined />} href={`/q/${qr?.id}`} target="_blank">Open public page</Button>
                          </div>
                        </div>
                      </div>
                      <Typography.Paragraph type="secondary" className="mt-4 mb-0! text-[12px]">
                        Resolver URL: <Mono className="break-all">{url}</Mono>
                        <br />
                        The QR holds only a stable ID. Scanning resolves current product data through the public resolver, so prices and dates can change without reprinting.
                      </Typography.Paragraph>
                      <div className="mt-5 border-t border-line pt-4">
                        <div className="mb-2 text-[12px] font-semibold tracking-wide text-muted uppercase">Barcode ({product.eanCode ? 'EAN-13' : 'Code 128'})</div>
                        <Barcode value={product.eanCode ?? product.productCode} format={product.eanCode ? 'EAN13' : 'CODE128'} height={56} width={1.8} fontSize={13} />
                      </div>
                    </div>
                  </Col>
                </Row>
              ),
            },
            {
              key: 'batches',
              label: `Batches (${batches.length})`,
              children: (
                <>
                  {can('batches.manage') && (
                    <div className="mb-3 flex justify-end">
                      <Button icon={<InboxOutlined />} onClick={() => setBatchOpen(true)}>New batch</Button>
                    </div>
                  )}
                  <Table<ProductBatch>
                    rowKey="id"
                    dataSource={batches}
                    pagination={false}
                    size="middle"
                    columns={[
                      { title: 'Batch', dataIndex: 'batchCode', render: (b: string) => <Mono className="font-semibold">{b}</Mono> },
                      { title: 'Packed', dataIndex: 'packedDate', render: (d: string) => fmtDate(d) },
                      { title: 'Expiry', dataIndex: 'expiryDate', render: (d: string | null) => <ExpiryTag date={d} /> },
                      { title: 'Units', dataIndex: 'quantity', align: 'right' },
                      { title: 'Scans', key: 'scans', align: 'right', render: (_, b) => batchScans(b) },
                      { title: '', key: 'a', align: 'right', render: (_, b) => <AddToQueueButton product={product} batchId={b.id} /> },
                    ]}
                  />
                </>
              ),
            },
            {
              key: 'analytics',
              label: 'Analytics',
              children: (
                <>
                  <div className="mb-4 flex justify-end">
                    <Segmented<Range> value={range} onChange={setRange} options={[{ label: '7 days', value: 7 }, { label: '30 days', value: 30 }, { label: '60 days', value: 60 }]} />
                  </div>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} xl={12}>
                      <div className="mb-2 font-semibold">Print history</div>
                      <PrintActivityChart data={series} height={220} />
                    </Col>
                    <Col xs={24} xl={12}>
                      <div className="mb-2 font-semibold">QR activity</div>
                      <ScanActivityChart data={series} height={220} />
                    </Col>
                    <Col xs={24} md={12}>
                      <div className="mb-3 font-semibold">Scans by device</div>
                      <DonutChart data={groupCount(inLastDays(scans, range), (s) => s.device).map((r) => ({ name: r.key, value: r.value }))} height={160} />
                    </Col>
                    <Col xs={24} md={12}>
                      <div className="mb-3 font-semibold">Scans by location</div>
                      <DonutChart data={groupCount(inLastDays(scans, range), (s) => s.location).slice(0, 6).map((r) => ({ name: r.key, value: r.value }))} height={160} />
                    </Col>
                  </Row>
                  <div className="mt-6 grid gap-6 md:grid-cols-2">
                    <DayList title="Recent print days" rows={[...series].reverse().filter((d) => d.printed).slice(0, 7).map((d) => [d.label, d.printed])} />
                    <DayList title="Recent scan days" rows={[...series].reverse().filter((d) => d.scans).slice(0, 7).map((d) => [d.label, d.scans])} />
                  </div>
                </>
              ),
            },
            {
              key: 'audit',
              label: 'History',
              children: logs.length ? (
                <Timeline
                  className="mt-4"
                  items={logs.map((l) => ({
                    color: l.action.includes('FAIL') ? 'red' : l.action.includes('SCAN') ? 'orange' : 'green',
                    content: (
                      <div>
                        <div className="text-[13px]">
                          <b>{l.actor}</b> · <Mono>{l.action}</Mono>
                        </div>
                        <div className="text-[13px] text-muted">{l.detail}</div>
                        <div className="text-[11px] text-muted">{fmtDateTime(l.at)}</div>
                      </div>
                    ),
                  }))}
                />
              ) : (
                <Empty description="No history yet" />
              ),
            },
          ]}
        />
      </Card>

      <ProductFormDrawer open={editOpen} product={product} onClose={() => setEditOpen(false)} />
      <BatchFormModal open={batchOpen} productId={product.id} onClose={() => setBatchOpen(false)} />
      <LabelOutputModal open={outputOpen} product={product} batch={batches[0] ?? null} onClose={() => setOutputOpen(false)} />
    </>
  )
}

function DayList({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <div>
      <div className="mb-2 font-semibold">{title}</div>
      {rows.length ? (
        <div className="divide-y divide-line rounded-xl border border-line">
          {rows.map(([d, v]) => (
            <div key={d} className="flex justify-between px-4 py-2 text-[13px]">
              <span className="text-muted">{d}</span>
              <b className="tabular-nums">{count(v)}</b>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[13px] text-muted">No activity in this range</div>
      )}
    </div>
  )
}
