import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Card, Col, Row, Segmented, Table, Tabs } from 'antd'
import { useDb } from '../mock/db'
import { printerName as printerLabel } from '../api'
import { KpiCard, PageHeader } from '../components/common'
import { DonutChart, HBarList, PrintActivityChart, ScanActivityChart } from '../components/charts'
import { dailySeries, groupCount, inLastDays, printTotals, today, uniqueVisitors, type Range } from '../lib/analytics'
import { count, pct } from '../lib/format'
import { CHART } from '../theme'

export function AnalyticsPage() {
  const db = useDb()
  const navigate = useNavigate()
  const [range, setRange] = useState<Range>(30)

  const prints = useMemo(() => inLastDays(db.printEvents, range), [db.printEvents, range])
  const scans = useMemo(() => inLastDays(db.scanEvents, range), [db.scanEvents, range])
  const series = useMemo(() => dailySeries(prints, scans, range), [prints, scans, range])
  const totals = printTotals(prints)

  const retries = useMemo(() => {
    const items = db.printJobs.flatMap((j) => j.items)
    return items.length ? items.filter((i) => i.attempts > 1).length / items.length : 0
  }, [db.printJobs])

  const name = (id: string) => db.products.find((p) => p.id === id)?.name ?? '—'
  const printerName = (id: string) => printerLabel(db, id)
  const shopName = (id: string) => db.shops.find((s) => s.id === id)?.location ?? '—'

  const perPrinter = groupCount(prints.filter((e) => e.success), (e) => e.printerId, (e) => e.quantity)
  const perShop = groupCount(prints.filter((e) => e.success), (e) => e.shopId, (e) => e.quantity)
  const busiest = Math.max(1, ...perPrinter.map((p) => p.value))

  const productRows = useMemo(() => {
    const m = new Map<string, { id: string; printed: number; failed: number; scans: number; visitors: Set<string> }>()
    const get = (id: string) => m.get(id) ?? (m.set(id, { id, printed: 0, failed: 0, scans: 0, visitors: new Set() }), m.get(id)!)
    for (const e of prints) {
      const r = get(e.productId)
      if (e.success) r.printed += e.quantity
      else r.failed += e.quantity
    }
    for (const s of scans) {
      const r = get(s.productId)
      r.scans++
      r.visitors.add(s.visitorId)
    }
    return [...m.values()].map((r) => ({ ...r, visitors: r.visitors.size, scanRate: r.printed ? r.scans / r.printed : 0 }))
  }, [prints, scans])

  const rangeSeg = (
    <Segmented<Range> value={range} onChange={setRange} options={[{ label: '7 days', value: 7 }, { label: '30 days', value: 30 }, { label: '60 days', value: 60 }]} />
  )

  return (
    <>
      <PageHeader title="Analytics" subtitle="Printing, scanning and product performance across all shops." extra={rangeSeg} />
      <Tabs
        items={[
          {
            key: 'printing',
            label: 'Printing',
            children: (
              <>
                <Row gutter={[16, 16]} className="stagger">
                  <Col xs={12} lg={6}><KpiCard label="Labels printed" value={count(totals.printed)} hint={`${count(Math.round(totals.printed / range))} / day avg`} /></Col>
                  <Col xs={12} lg={6}><KpiCard label="This week" value={count(printTotals(inLastDays(db.printEvents, 7)).printed)} hint={`${count(printTotals(today(db.printEvents)).printed)} today`} tone="violet" /></Col>
                  <Col xs={12} lg={6}><KpiCard label="Failed labels" value={count(totals.failed)} hint={`${pct(totals.failRate)} failure rate`} tone="red" /></Col>
                  <Col xs={12} lg={6}><KpiCard label="Retry rate" value={pct(retries)} hint="Items needing ≥ 2 attempts" tone="amber" /></Col>
                </Row>
                <Card className="mt-4" title="Labels per day">
                  <PrintActivityChart data={series} height={300} />
                </Card>
                <Row gutter={[16, 16]} className="mt-4">
                  <Col xs={24} lg={12}>
                    <Card title="Printer utilization" className="h-full">
                      <HBarList rows={perPrinter.map((r) => ({ label: `${printerName(r.key)} · ${Math.round((r.value / busiest) * 100)}%`, value: r.value }))} unit="labels" />
                    </Card>
                  </Col>
                  <Col xs={24} lg={12}>
                    <Card title="Labels per shop" className="h-full">
                      <DonutChart data={perShop.map((r) => ({ name: shopName(r.key), value: r.value }))} />
                    </Card>
                  </Col>
                </Row>
              </>
            ),
          },
          {
            key: 'scans',
            label: 'QR scans',
            children: (
              <>
                <Row gutter={[16, 16]} className="stagger">
                  <Col xs={12} lg={6}><KpiCard label="Total scans" value={count(scans.length)} tone="orange" /></Col>
                  <Col xs={12} lg={6}><KpiCard label="Unique visitors" value={count(uniqueVisitors(scans))} tone="amber" /></Col>
                  <Col xs={12} lg={6}><KpiCard label="Today" value={count(today(db.scanEvents).length)} /></Col>
                  <Col xs={12} lg={6}><KpiCard label="This week" value={count(inLastDays(db.scanEvents, 7).length)} tone="violet" /></Col>
                </Row>
                <Card className="mt-4" title="Scans by date">
                  <ScanActivityChart data={series} height={300} />
                </Card>
                <Row gutter={[16, 16]} className="mt-4">
                  <Col xs={24} lg={8}>
                    <Card title="By product" className="h-full">
                      <HBarList rows={groupCount(scans, (s) => s.productId).slice(0, 8).map((r) => ({ label: name(r.key), value: r.value }))} color={CHART.scans} />
                    </Card>
                  </Col>
                  <Col xs={24} lg={8}>
                    <Card title="By location" className="h-full">
                      <HBarList rows={groupCount(scans, (s) => s.location).slice(0, 8).map((r) => ({ label: r.key, value: r.value }))} color="#7C3AED" />
                    </Card>
                  </Col>
                  <Col xs={24} lg={8}>
                    <Card title="By device" className="h-full">
                      <DonutChart data={groupCount(scans, (s) => s.device).map((r) => ({ name: r.key, value: r.value }))} height={170} />
                      <div className="mt-6 mb-3 font-semibold">By shop</div>
                      <HBarList rows={groupCount(scans, (s) => s.shopId).map((r) => ({ label: shopName(r.key), value: r.value }))} color={CHART.visitors} />
                    </Card>
                  </Col>
                </Row>
                <p className="mt-4 text-[12px] text-muted">
                  Location is derived from the shop and coarse network region only; no precise geolocation is collected. Disclose this in your privacy notice.
                </p>
              </>
            ),
          },
          {
            key: 'products',
            label: 'Products',
            children: (
              <Card styles={{ body: { padding: 0 } }}>
                <Table
                  rowKey="id"
                  dataSource={productRows}
                  pagination={{ pageSize: 15, showSizeChanger: false }}
                  onRow={(r) => ({ onClick: () => navigate(`/products/${r.id}`), className: 'cursor-pointer' })}
                  scroll={{ x: 640 }}
                  columns={[
                    { title: 'Product', key: 'n', render: (_, r) => <span className="font-medium">{name(r.id)}</span> },
                    { title: 'Printed', dataIndex: 'printed', align: 'right', defaultSortOrder: 'descend', sorter: (a, b) => a.printed - b.printed, render: (n: number) => count(n) },
                    { title: 'Failed', dataIndex: 'failed', align: 'right', sorter: (a, b) => a.failed - b.failed },
                    { title: 'Scans', dataIndex: 'scans', align: 'right', sorter: (a, b) => a.scans - b.scans, render: (n: number) => count(n) },
                    { title: 'Visitors', dataIndex: 'visitors', align: 'right', sorter: (a, b) => a.visitors - b.visitors },
                    { title: 'Scan / label', dataIndex: 'scanRate', align: 'right', sorter: (a, b) => a.scanRate - b.scanRate, render: (n: number) => pct(n) },
                  ]}
                />
              </Card>
            ),
          },
        ]}
      />
    </>
  )
}
