import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { App as AntApp, Button, Card, Col, Drawer, Input, Popconfirm, Row, Segmented, Table, Tag } from 'antd'
import type { TableColumnsType } from 'antd'
import { CopyOutlined, DownloadOutlined, ExportOutlined, LinkOutlined, SafetyCertificateOutlined, SearchOutlined, StopOutlined, UndoOutlined } from '@ant-design/icons'
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react'
import { useDb } from '../mock/db'
import { useSession } from '../hooks/useSession'
import { identity, qrUrl } from '../api'
import { KpiCard, Mono, PageHeader } from '../components/common'
import { Barcode } from '../components/Barcode'
import { fmtDateTime, timeAgo } from '../lib/dates'
import { count } from '../lib/format'
import type { Product, ProductBatch, QrCode } from '../types'

interface Row extends QrCode {
  product?: Product
  batch?: ProductBatch
  scans: number
  lastScan: string | null
}

export function IdentityPage() {
  const db = useDb()
  const { can } = useSession()
  const { message } = AntApp.useApp()
  const [q, setQ] = useState('')
  const [type, setType] = useState<'ALL' | QrCode['entityType']>('ALL')
  const [open, setOpen] = useState<Row | null>(null)

  const scanStats = useMemo(() => {
    const m = new Map<string, { n: number; last: string }>()
    for (const s of db.scanEvents) {
      const cur = m.get(s.qrId)
      m.set(s.qrId, { n: (cur?.n ?? 0) + 1, last: !cur || s.at > cur.last ? s.at : cur.last })
    }
    return m
  }, [db.scanEvents])

  const rows: Row[] = useMemo(() => {
    const t = q.trim().toLowerCase()
    return db.qrCodes
      .map((qr) => {
        const batch = qr.entityType === 'PRODUCT_BATCH' ? db.batches.find((b) => b.id === qr.entityId) : undefined
        const product = db.products.find((p) => p.id === (batch ? batch.productId : qr.entityId))
        const st = scanStats.get(qr.id)
        return { ...qr, product, batch, scans: st?.n ?? 0, lastScan: st?.last ?? null }
      })
      .filter((r) => type === 'ALL' || r.entityType === type)
      .filter((r) => !t || r.id.toLowerCase().includes(t) || r.product?.name.toLowerCase().includes(t) || r.batch?.batchCode.toLowerCase().includes(t) || r.product?.productCode.includes(t))
      .sort((a, b) => b.scans - a.scans)
  }, [db.qrCodes, db.batches, db.products, scanStats, q, type])

  const ids = new Set(db.qrCodes.map((x) => x.id))
  const copy = (s: string) => {
    void navigator.clipboard?.writeText(s)
    message.success('Copied')
  }

  const download = (id: string) => {
    const canvas = document.getElementById(`qr-dl-${id}`) as HTMLCanvasElement | null
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `${id}.png`
    a.click()
  }

  const columns: TableColumnsType<Row> = [
    { title: '', key: 'qr', width: 56, render: (_, r) => <QRCodeSVG value={qrUrl(r.id, db.settings)} size={36} marginSize={0} /> },
    { title: 'Global ID', dataIndex: 'id', render: (id: string) => <Mono>{id}</Mono> },
    {
      title: 'Resolves to',
      key: 'e',
      render: (_, r) => (
        <div>
          <div className="font-medium">{r.product?.name ?? '—'}</div>
          <div className="text-[12px] text-muted">
            <Tag variant="filled" className="mr-1!" color={r.entityType === 'PRODUCT' ? 'green' : 'purple'}>
              {r.entityType === 'PRODUCT' ? 'Product' : 'Batch'}
            </Tag>
            {r.batch?.batchCode}
          </div>
        </div>
      ),
    },
    { title: 'Scans', dataIndex: 'scans', align: 'right', sorter: (a, b) => a.scans - b.scans, render: (n: number) => <span className="tabular-nums">{count(n)}</span> },
    { title: 'Last scan', dataIndex: 'lastScan', responsive: ['lg'], render: (t: string | null) => (t ? timeAgo(t) : '—') },
    { title: 'Status', dataIndex: 'status', render: (s: QrCode['status']) => <Tag color={s === 'ACTIVE' ? 'green' : 'red'} variant="filled">{s}</Tag> },
  ]

  return (
    <>
      <PageHeader title="QR / Barcodes" subtitle="Immutable identities. The QR carries only a stable ID; the public resolver looks up current data on every scan." />

      <Row gutter={[16, 16]} className="stagger mb-4">
        <Col xs={12} lg={6}><KpiCard label="QR identities" value={count(db.qrCodes.length)} icon={<SafetyCertificateOutlined />} /></Col>
        <Col xs={12} lg={6}><KpiCard label="Active" value={count(db.qrCodes.filter((x) => x.status === 'ACTIVE').length)} tone="violet" /></Col>
        <Col xs={12} lg={6}><KpiCard label="Duplicate IDs" value={db.qrCodes.length - ids.size} hint="Target: 0" tone={db.qrCodes.length - ids.size ? 'red' : 'brand'} /></Col>
        <Col xs={12} lg={6}>
          <KpiCard label="Resolver" value={<span className="text-[15px]">{new URL(db.settings.resolverBaseUrl).host}</span>} hint={<Mono>{new URL(db.settings.resolverBaseUrl).pathname}/{'{id}'}</Mono>} icon={<LinkOutlined />} tone="orange" />
        </Col>
      </Row>

      <Card styles={{ body: { padding: 0 } }}>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
          <Input prefix={<SearchOutlined className="text-muted" />} placeholder="Search ID, product, batch" allowClear value={q} onChange={(e) => setQ(e.target.value)} className="max-w-[320px]" />
          <Segmented value={type} onChange={(v) => setType(v as typeof type)} options={[{ value: 'ALL', label: 'All' }, { value: 'PRODUCT', label: 'Products' }, { value: 'PRODUCT_BATCH', label: 'Batches' }]} />
        </div>
        <Table<Row> rowKey="id" columns={columns} dataSource={rows} pagination={{ pageSize: 12, showSizeChanger: false }} onRow={(r) => ({ onClick: () => setOpen(r), className: 'cursor-pointer' })} scroll={{ x: 640 }} />
      </Card>

      <Drawer open={!!open} onClose={() => setOpen(null)} size={440} title="QR identity">
        {open && (
          <div className="space-y-5">
            <div className="flex justify-center rounded-2xl bg-canvas p-6">
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <QRCodeSVG value={qrUrl(open.id, db.settings)} size={200} level="M" marginSize={0} />
              </div>
              <QRCodeCanvas id={`qr-dl-${open.id}`} value={qrUrl(open.id, db.settings)} size={600} marginSize={4} className="hidden" />
            </div>
            <div>
              <div className="text-[12px] text-muted">Global ID</div>
              <div className="flex items-center gap-2">
                <Mono className="break-all">{open.id}</Mono>
                <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => copy(open.id)} />
              </div>
            </div>
            <div>
              <div className="text-[12px] text-muted">Public URL (encoded in QR)</div>
              <div className="flex items-center gap-2">
                <Mono className="break-all">{qrUrl(open.id, db.settings)}</Mono>
                <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => copy(qrUrl(open.id, db.settings))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-[13px]">
              <div><div className="text-[12px] text-muted">Entity</div>{open.entityType}</div>
              <div><div className="text-[12px] text-muted">Created</div>{fmtDateTime(open.createdAt)}</div>
              <div><div className="text-[12px] text-muted">Scans</div>{count(open.scans)}</div>
              <div><div className="text-[12px] text-muted">Product</div>{open.product ? <Link to={`/products/${open.product.id}`}>{open.product.name}</Link> : '—'}</div>
            </div>
            {open.product && (
              <div>
                <div className="mb-2 text-[12px] text-muted">Barcode</div>
                <Barcode value={open.product.eanCode ?? open.product.variantCode ?? open.product.productCode} format={open.product.eanCode ? 'EAN13' : 'CODE128'} height={50} width={1.6} />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button icon={<DownloadOutlined />} onClick={() => download(open.id)}>PNG</Button>
              <Button icon={<ExportOutlined />} href={`/q/${open.id}`} target="_blank">Open public page</Button>
              {can('identity.manage') &&
                (open.status === 'ACTIVE' ? (
                  <Popconfirm
                    title="Revoke this QR?"
                    description="Scans will show “not valid”. The ID is never reused."
                    okButtonProps={{ danger: true }}
                    onConfirm={async () => {
                      await identity.setStatus(open.id, 'REVOKED')
                      setOpen({ ...open, status: 'REVOKED' })
                    }}
                  >
                    <Button danger icon={<StopOutlined />}>Revoke</Button>
                  </Popconfirm>
                ) : (
                  <Button
                    icon={<UndoOutlined />}
                    onClick={async () => {
                      await identity.setStatus(open.id, 'ACTIVE')
                      setOpen({ ...open, status: 'ACTIVE' })
                    }}
                  >
                    Reactivate
                  </Button>
                ))}
            </div>
          </div>
        )}
      </Drawer>
    </>
  )
}
