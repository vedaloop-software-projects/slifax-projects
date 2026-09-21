import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button, Card, Col, Empty, Row, Segmented, Tag } from 'antd'
import {
  AlertOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FieldTimeOutlined,
  PrinterOutlined,
  QrcodeOutlined,
  TagsOutlined,
} from '@ant-design/icons'
import { useDb } from '../mock/db'
import { printerName } from '../api'
import { useSession } from '../hooks/useSession'
import { KpiCard, PageHeader, PrinterStatusBadge } from '../components/common'
import { HBarList, PrintActivityChart, ScanActivityChart } from '../components/charts'
import { dailySeries, groupCount, inLastDays, printTotals, today, topProducts, type Range } from '../lib/analytics'
import { expiryState, fmtDate, timeAgo } from '../lib/dates'
import { count, pct } from '../lib/format'
import { CHART } from '../theme'

export function DashboardPage() {
  const db = useDb()
  const { user, can } = useSession()
  const navigate = useNavigate()
  const [range, setRange] = useState<Range>(30)

  const k = useMemo(() => {
    const month = inLastDays(db.printEvents, 30)
    const expiring = db.products.filter((p) => p.status === 'ACTIVE' && expiryState(p.expiryDate) === 'EXPIRING')
    const expired = db.products.filter((p) => p.status === 'ACTIVE' && expiryState(p.expiryDate) === 'EXPIRED')
    return {
      products: db.products.length,
      active: db.products.filter((p) => p.status === 'ACTIVE').length,
      printedToday: printTotals(today(db.printEvents)).printed,
      month: printTotals(month),
      failedToday: printTotals(today(db.printEvents)).failed,
      scansToday: today(db.scanEvents).length,
      scansMonth: inLastDays(db.scanEvents, 30).length,
      online: db.printers.filter((p) => p.status === 'CONNECTED' || p.status === 'BUSY').length,
      offline: db.printers.filter((p) => p.status === 'OFFLINE' || p.status === 'ERROR').length,
      expiring,
      expired,
    }
  }, [db])

  const series = useMemo(() => dailySeries(inLastDays(db.printEvents, range), inLastDays(db.scanEvents, range), range), [db.printEvents, db.scanEvents, range])
  const topPrinted = useMemo(() => topProducts(db, 'prints', range), [db, range])
  const topScanned = useMemo(() => topProducts(db, 'scans', range), [db, range])
  const topLocations = useMemo(() => groupCount(inLastDays(db.scanEvents, range), (s) => s.location).slice(0, 5), [db.scanEvents, range])
  const recentJobs = db.printJobs.slice(0, 5)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <>
      <PageHeader
        title={`${greeting}, ${user?.name.split(' ')[0]}`}
        subtitle={`Here’s what’s happening across ${db.shops.length} shops today.`}
        extra={
          <>
            <Segmented<Range>
              value={range}
              onChange={setRange}
              options={[
                { label: '7 days', value: 7 },
                { label: '30 days', value: 30 },
                { label: '60 days', value: 60 },
              ]}
            />
            {can('print') && (
              <Button type="primary" icon={<TagsOutlined />} onClick={() => navigate('/labels')}>
                Print labels
              </Button>
            )}
          </>
        }
      />

      <Row gutter={[16, 16]} className="stagger">
        <Col xs={12} md={8} xl={6}>
          <KpiCard label="Products" value={count(k.products)} hint={`${count(k.active)} active`} icon={<AppstoreOutlined />} onClick={() => navigate('/products')} />
        </Col>
        <Col xs={12} md={8} xl={6}>
          <KpiCard label="Labels printed today" value={count(k.printedToday)} hint={`${count(k.month.printed)} this month`} icon={<TagsOutlined />} tone="violet" />
        </Col>
        <Col xs={12} md={8} xl={6}>
          <KpiCard label="QR scans today" value={count(k.scansToday)} hint={`${count(k.scansMonth)} this month`} icon={<QrcodeOutlined />} tone="orange" />
        </Col>
        <Col xs={12} md={8} xl={6}>
          <KpiCard
            label="Active printers"
            value={
              <>
                {k.online}
                <span className="text-[16px] font-semibold text-muted"> / {db.printers.length}</span>
              </>
            }
            hint={k.offline ? <span className="text-red-600">{k.offline} offline</span> : 'All online'}
            icon={<PrinterOutlined />}
            tone="slate"
            onClick={() => navigate('/printers')}
          />
        </Col>
        <Col xs={12} md={8} xl={6}>
          <KpiCard label="Print success (30d)" value={pct(k.month.successRate)} hint={`${count(k.month.printed)} printed`} icon={<CheckCircleOutlined />} />
        </Col>
        <Col xs={12} md={8} xl={6}>
          <KpiCard label="Print failed (30d)" value={pct(k.month.failRate)} hint={`${count(k.failedToday)} failed today`} icon={<CloseCircleOutlined />} tone="red" />
        </Col>
        <Col xs={12} md={8} xl={6}>
          <KpiCard label="Expiring ≤ 30 days" value={count(k.expiring.length)} hint="Active products" icon={<FieldTimeOutlined />} tone="amber" />
        </Col>
        <Col xs={12} md={8} xl={6}>
          <KpiCard label="Expired" value={count(k.expired.length)} hint={k.expired.length ? 'Reprint or archive' : 'Nothing expired'} icon={<AlertOutlined />} tone="red" />
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mt-4">
        <Col xs={24} xl={12}>
          <Card title="Printing activity" extra={<Legend items={[['Printed', CHART.printed], ['Failed', CHART.failed]]} />} className="h-full">
            <PrintActivityChart data={series} />
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title="QR scan activity" extra={<Legend items={[['Scans', CHART.scans], ['Unique visitors', CHART.visitors]]} />} className="h-full">
            <ScanActivityChart data={series} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mt-4">
        <Col xs={24} md={12} xl={8}>
          <Card title="Most printed products" className="h-full">
            <HBarList rows={topPrinted.map((r) => ({ label: r.product?.name ?? '—', value: r.value }))} unit="labels" />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={8}>
          <Card title="Most scanned products" className="h-full">
            <HBarList rows={topScanned.map((r) => ({ label: r.product?.name ?? '—', value: r.value }))} color={CHART.scans} unit="scans" />
          </Card>
        </Col>
        <Col xs={24} md={24} xl={8}>
          <Card title="Top scan locations" className="h-full">
            <HBarList rows={topLocations.map((r) => ({ label: r.key, value: r.value }))} color="#7C3AED" unit="scans" />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mt-4">
        <Col xs={24} xl={10}>
          <Card title="Expiry watch" extra={<Tag color="orange" variant="filled">{k.expiring.length + k.expired.length}</Tag>} className="h-full" styles={{ body: { paddingTop: 8 } }}>
            {k.expiring.length + k.expired.length === 0 ? (
              <Empty description="No products near expiry" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div className="divide-y divide-line">
                {[...k.expired, ...k.expiring].slice(0, 6).map((p) => {
                  const st = expiryState(p.expiryDate)
                  return (
                    <div key={p.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-brand-soft/60" onClick={() => navigate(`/products/${p.id}`)}>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{p.name}</div>
                        <div className="text-[12px] text-muted">Packed {fmtDate(p.packedDate)}</div>
                      </div>
                      <Tag color={st === 'EXPIRED' ? 'red' : 'orange'} variant="filled">
                        {st === 'EXPIRED' ? 'Expired' : 'Expires'} {fmtDate(p.expiryDate)}
                      </Tag>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} xl={14}>
          <Card
            title="Recent print jobs"
            extra={<Button type="link" onClick={() => navigate('/queue')}>View all</Button>}
            className="h-full"
            styles={{ body: { paddingTop: 8 } }}
          >
            {recentJobs.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No print jobs yet" />}
            <div className="divide-y divide-line">
              {recentJobs.map((j) => {
                const total = j.items.reduce((a, i) => a + i.quantity, 0)
                const printed = j.items.reduce((a, i) => a + i.printed, 0)
                const failed = j.items.some((i) => i.state === 'FAILED')
                const names = j.items.map((i) => db.products.find((p) => p.id === i.productId)?.name).join(', ')
                return (
                  <div key={j.id} className="flex items-center justify-between gap-3 px-2 py-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{names}</div>
                      <div className="text-[12px] text-muted">
                        {printerName(db, j.printerId)} · {j.createdBy} · {timeAgo(j.createdAt)}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-[13px] text-muted tabular-nums">
                        {printed}/{total}
                      </span>
                      {!j.finishedAt ? <Tag color="processing" variant="filled">Printing</Tag> : failed ? <Tag color="error" variant="filled">Failed</Tag> : <Tag color="success" variant="filled">Printed</Tag>}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </Col>
      </Row>

      <Card className="mt-4" title="Printers" extra={<Button type="link" onClick={() => navigate('/printers')}>Manage</Button>}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {db.printers.map((p) => (
            <div key={p.id} className="rounded-xl border border-line p-3 transition-colors hover:border-brand/30">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-semibold">{p.name}</span>
                <Tag className="m-0!" variant="filled">{p.language}</Tag>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[12px] text-muted">
                <PrinterStatusBadge status={p.status} />
                <span>{db.shops.find((s) => s.id === p.shopId)?.location}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}

function Legend({ items }: { items: [string, string][] }) {
  return (
    <div className="flex gap-3 text-[12px] text-muted">
      {items.map(([l, c]) => (
        <span key={l} className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: c }} />
          {l}
        </span>
      ))}
    </div>
  )
}

