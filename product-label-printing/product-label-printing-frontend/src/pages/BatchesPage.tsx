import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { App as AntApp, Button, Card, DatePicker, Form, Input, InputNumber, Modal, Select, Table, Tag } from 'antd'
import type { TableColumnsType } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import { useDb } from '../mock/db'
import { useSession } from '../hooks/useSession'
import { batches as batchesApi } from '../api'
import { ExpiryTag, Mono, PageHeader } from '../components/common'
import { AddToQueueButton } from '../components/AddToQueueButton'
import { computeExpiry, expiryState, fmtDate } from '../lib/dates'
import type { Product, ProductBatch } from '../types'

export function BatchFormModal({ open, productId, onClose }: { open: boolean; productId?: string; onClose: () => void }) {
  const db = useDb()
  const { message } = AntApp.useApp()
  const [form] = Form.useForm<{ productId: string; packedDate: Dayjs; quantity: number }>()
  const [saving, setSaving] = useState(false)
  const pid = Form.useWatch('productId', form)
  const packed = Form.useWatch('packedDate', form)
  const product = db.products.find((p) => p.id === pid)
  const expiry = product && packed ? computeExpiry(packed.format('YYYY-MM-DD'), product.expiryRule, product.shelfLifeMonths) : null

  useEffect(() => {
    if (open) form.setFieldsValue({ productId, packedDate: dayjs(), quantity: 50 })
  }, [open, productId, form])

  const submit = async (v: { productId: string; packedDate: Dayjs; quantity: number }) => {
    setSaving(true)
    try {
      const b = await batchesApi.create(v.productId, v.packedDate.format('YYYY-MM-DD'), v.quantity)
      message.success(`Batch ${b.batchCode} created with its own QR identity`)
      onClose()
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onCancel={onClose} title="New batch" okText="Create batch" confirmLoading={saving} onOk={() => form.submit()} destroyOnHidden>
      <Form form={form} layout="vertical" onFinish={submit} className="mt-4">
        <Form.Item name="productId" label="Product" rules={[{ required: true }]}>
          <Select
            showSearch={{ optionFilterProp: 'label' }}
            disabled={!!productId}
            options={db.products.filter((p) => p.status === 'ACTIVE').map((p) => ({ value: p.id, label: `${p.name} (${p.productCode})` }))}
          />
        </Form.Item>
        <div className="grid grid-cols-2 gap-3">
          <Form.Item name="packedDate" label="Packed date" rules={[{ required: true }]}>
            <DatePicker format="DD-MM-YYYY" className="w-full" />
          </Form.Item>
          <Form.Item name="quantity" label="Units packed" rules={[{ required: true }]}>
            <InputNumber min={1} max={100000} className="w-full!" />
          </Form.Item>
        </div>
        {product && packed && (
          <div className="rounded-lg bg-brand-soft/70 px-3 py-2 text-[13px]">
            Batch <Mono className="font-semibold">B{packed.format('YYYYMMDD')}</Mono> · Expiry <b>{expiry ? fmtDate(expiry) : 'none'}</b>
            <span className="text-muted"> (product rule)</span>
          </div>
        )}
      </Form>
    </Modal>
  )
}

interface Row extends ProductBatch {
  product?: Product
  scans: number
}

export function BatchesPage() {
  const db = useDb()
  const { can } = useSession()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [state, setState] = useState<'all' | 'OK' | 'EXPIRING' | 'EXPIRED'>('all')
  const [open, setOpen] = useState(false)

  const scanMap = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of db.scanEvents) if (s.batchId) m.set(s.batchId, (m.get(s.batchId) ?? 0) + 1)
    return m
  }, [db.scanEvents])

  const rows: Row[] = useMemo(() => {
    const term = q.trim().toLowerCase()
    return db.batches
      .map((b) => ({ ...b, product: db.products.find((p) => p.id === b.productId), scans: scanMap.get(b.id) ?? 0 }))
      .filter((r) => !term || r.batchCode.toLowerCase().includes(term) || r.product?.name.toLowerCase().includes(term) || r.product?.productCode.includes(term))
      .filter((r) => state === 'all' || expiryState(r.expiryDate) === state)
      .sort((a, b) => b.packedDate.localeCompare(a.packedDate))
  }, [db.batches, db.products, scanMap, q, state])

  const columns: TableColumnsType<Row> = [
    { title: 'Batch', dataIndex: 'batchCode', render: (b: string) => <Mono className="font-semibold">{b}</Mono> },
    { title: 'Product', key: 'p', render: (_, r) => <><div className="font-medium">{r.product?.name}</div><Mono className="text-muted">{r.product?.productCode}</Mono></> },
    { title: 'Packed', dataIndex: 'packedDate', sorter: (a, b) => a.packedDate.localeCompare(b.packedDate), render: (d: string) => fmtDate(d) },
    { title: 'Expiry', dataIndex: 'expiryDate', sorter: (a, b) => (a.expiryDate ?? '9').localeCompare(b.expiryDate ?? '9'), render: (d: string | null) => <ExpiryTag date={d} /> },
    { title: 'Units', dataIndex: 'quantity', align: 'right', responsive: ['md'] },
    { title: 'Scans', dataIndex: 'scans', align: 'right', responsive: ['md'] },
    { title: '', key: 'a', align: 'right', render: (_, r) => r.product && <span onClick={(e) => e.stopPropagation()}><AddToQueueButton product={r.product} batchId={r.id} /></span> },
  ]

  return (
    <>
      <PageHeader
        title="Batches"
        subtitle="Product → Batch → Label. Each batch carries its own dates and QR identity for traceability."
        extra={can('batches.manage') && <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>New batch</Button>}
      />
      <Card styles={{ body: { padding: 0 } }}>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
          <Input prefix={<SearchOutlined className="text-muted" />} placeholder="Search batch code or product" allowClear value={q} onChange={(e) => setQ(e.target.value)} className="max-w-[320px]" />
          <Select
            value={state}
            onChange={setState}
            className="w-44"
            options={[
              { value: 'all', label: 'All batches' },
              { value: 'OK', label: 'Fresh' },
              { value: 'EXPIRING', label: 'Expiring ≤ 30 days' },
              { value: 'EXPIRED', label: 'Expired' },
            ]}
          />
          <Tag variant="filled" className="ml-auto!">{rows.length} batches</Tag>
        </div>
        <Table<Row>
          rowKey="id"
          columns={columns}
          dataSource={rows}
          pagination={{ pageSize: 15, showSizeChanger: false }}
          onRow={(r) => ({ onClick: () => navigate(`/products/${r.productId}`), className: 'cursor-pointer' })}
          scroll={{ x: 640 }}
        />
      </Card>
      <BatchFormModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
