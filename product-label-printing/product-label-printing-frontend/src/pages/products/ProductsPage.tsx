import { useEffect, useMemo, useState } from 'react'
import { getProducts } from '../../api'
import { useNavigate, useSearchParams } from 'react-router'
import { Button, Card, Dropdown, Input, Select, Table, Tag } from 'antd'
import type { TableColumnsType } from 'antd'
import { DownloadOutlined, EditOutlined, EyeOutlined, MoreOutlined, PlusOutlined, PrinterOutlined, SearchOutlined } from '@ant-design/icons'
import type { Product } from '../../types'
import { useDb } from '../../mock/db'
import { useSession } from '../../hooks/useSession'
import { ExpiryTag, Mono, PageHeader, ProductStatusTag } from '../../components/common'
import { AddToQueueButton } from '../../components/AddToQueueButton'
import { ProductFormDrawer } from './ProductFormDrawer'
import { LabelOutputModal } from '../../print/LabelOutputModal'
import { expiryState } from '../../lib/dates'
import { money } from '../../lib/format'


type ExpiryFilter = 'all' | 'EXPIRING' | 'EXPIRED' | 'NONE'

export function ProductsPage() {
  const db = useDb()
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getProducts()
      .then(setAllProducts)
      .catch(() => setAllProducts([]))
      .finally(() => setLoading(false))
  }, [])
  const { can } = useSession()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [category, setCategory] = useState<string | undefined>()
  const [status, setStatus] = useState<Product['status'] | undefined>('ACTIVE')
  const [expiry, setExpiry] = useState<ExpiryFilter>((params.get('expiry') as ExpiryFilter) ?? 'all')
  const [editing, setEditing] = useState<Product | null>(null)
  const [drawer, setDrawer] = useState(params.get('new') === '1')
  const [printing, setPrinting] = useState<Product | null>(null)

  const categories = useMemo(() => [...new Set(allProducts.map((p) => p.category))].sort(), [allProducts])

  const printedByProduct = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of db.printEvents) if (e.success) m.set(e.productId, (m.get(e.productId) ?? 0) + e.quantity)
    return m
  }, [db.printEvents])
  const scansByProduct = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of db.scanEvents) m.set(s.productId, (m.get(s.productId) ?? 0) + 1)
    return m
  }, [db.scanEvents])

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    return allProducts
      .filter((p) => !term || p.name.toLowerCase().includes(term) || p.productCode.toLowerCase().includes(term) || p.variantCode?.toLowerCase().includes(term) || p.eanCode?.includes(term) || p.pluCode === term || p.globalId.toLowerCase().includes(term))
      .filter((p) => !category || p.category === category)
      .filter((p) => !status || p.status === status)
      .filter((p) => expiry === 'all' || expiryState(p.expiryDate) === expiry)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [allProducts, q, category, status, expiry])

  const exportCsv = () => {
    const head = ['globalId', 'productCode', 'variantCode', 'eanCode', 'pluCode', 'name', 'category', 'brand', 'mrp', 'salePrice', 'unit', 'packedDate', 'expiryDate', 'status']
    const csv = [head.join(','), ...rows.map((p) => head.map((h) => JSON.stringify(p[h as keyof Product] ?? '')).join(','))].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `products-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const columns: TableColumnsType<Product> = [
    {
      title: 'Product',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (_, p) => (
        <div className="min-w-0">
          <div className="font-semibold text-ink">{p.name}</div>
          <div className="flex items-center gap-2 text-[12px] text-muted">
            <Mono>{p.productCode}</Mono>
            {p.variantCode && p.variantCode !== p.productCode && <span>· Variant {p.variantCode}</span>}
            {p.eanCode && <span>· EAN {p.eanCode}</span>}
            {p.pluCode && <span>· PLU {p.pluCode}</span>}
          </div>
        </div>
      ),
    },
    { title: 'Category', dataIndex: 'category', key: 'category', responsive: ['md'], render: (c: string, p) => <><div>{c}</div><div className="text-[12px] text-muted">{p.brand}</div></> },
    {
      title: 'Price',
      key: 'price',
      align: 'right',
      sorter: (a, b) => a.salePrice - b.salePrice,
      render: (_, p) => (
        <div className="tabular-nums">
          <div className="font-semibold">{money(p.salePrice)}</div>
          <div className="text-[12px] text-muted line-through">{money(p.mrp)}</div>
        </div>
      ),
    },
    { title: 'Expiry', key: 'expiry', sorter: (a, b) => (a.expiryDate ?? '9999').localeCompare(b.expiryDate ?? '9999'), render: (_, p) => <ExpiryTag date={p.expiryDate} />, responsive: ['sm'] },
    { title: 'Printed', key: 'printed', align: 'right', responsive: ['lg'], sorter: (a, b) => (printedByProduct.get(a.id) ?? 0) - (printedByProduct.get(b.id) ?? 0), render: (_, p) => <span className="tabular-nums">{(printedByProduct.get(p.id) ?? 0).toLocaleString('en-IN')}</span> },
    { title: 'Scans', key: 'scans', align: 'right', responsive: ['lg'], sorter: (a, b) => (scansByProduct.get(a.id) ?? 0) - (scansByProduct.get(b.id) ?? 0), render: (_, p) => <span className="tabular-nums">{(scansByProduct.get(p.id) ?? 0).toLocaleString('en-IN')}</span> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: Product['status']) => <ProductStatusTag status={s} />, responsive: ['md'] },
    {
      title: '',
      key: 'actions',
      align: 'right',
      width: 140,
      render: (_, p) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <AddToQueueButton product={p} />
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                { key: 'view', icon: <EyeOutlined />, label: 'View details', onClick: () => navigate(`/products/${p.id}`) },
                { key: 'print', icon: <PrinterOutlined />, label: 'Print / PDF', onClick: () => setPrinting(p) },
                ...(can('products.manage') ? [{ key: 'edit', icon: <EditOutlined />, label: 'Edit', onClick: () => { setEditing(p); setDrawer(true) } }] : []),
              ],
            }}
          >
            <Button size="small" type="text" icon={<MoreOutlined />} aria-label="More actions" />
          </Dropdown>
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Products"
        subtitle="Product master — the source of truth for every label and QR."
        extra={
          <>
            <Button icon={<DownloadOutlined />} onClick={exportCsv}>
              Export CSV
            </Button>
            {can('products.manage') && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setDrawer(true) }}>
                New product
              </Button>
            )}
          </>
        }
      />

      <Card styles={{ body: { padding: 0 } }}>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
          <Input prefix={<SearchOutlined className="text-muted" />} placeholder="Search name, SKU, EAN, PLU, global ID" allowClear value={q} onChange={(e) => setQ(e.target.value)} className="max-w-[340px]" />
          <Select allowClear placeholder="Category" value={category} onChange={setCategory} options={categories.map((c) => ({ value: c }))} className="w-40" />
          <Select allowClear placeholder="Status" value={status} onChange={setStatus} className="w-36" options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }, { value: 'ARCHIVED', label: 'Archived' }]} />
          <Select<ExpiryFilter>
            value={expiry}
            onChange={(v) => {
              setExpiry(v)
              setParams(v === 'all' ? {} : { expiry: v }, { replace: true })
            }}
            className="w-44"
            options={[
              { value: 'all', label: 'Any expiry' },
              { value: 'EXPIRING', label: 'Expiring ≤ 30 days' },
              { value: 'EXPIRED', label: 'Expired' },
              { value: 'NONE', label: 'No expiry' },
            ]}
          />
          <Tag variant="filled" className="ml-auto!">{rows.length} products</Tag>
        </div>
        <Table<Product>
          rowKey="id"
          columns={columns}
          dataSource={rows}
          loading={loading}
          pagination={{ pageSize: 12, showSizeChanger: false, hideOnSinglePage: true }}
          onRow={(p) => ({ onClick: () => navigate(`/products/${p.id}`), className: 'cursor-pointer' })}
           scroll={{ x: 720 }}
        />
      </Card>

      <LabelOutputModal open={!!printing} product={printing} onClose={() => setPrinting(null)} />
      <ProductFormDrawer
        open={drawer}
        product={editing}
        onClose={() => {
          setDrawer(false)
          if (params.get('new')) setParams({}, { replace: true })
        }}
        onSaved={(p) => !editing && navigate(`/products/${p.id}`)}
      />
    </>
  )
}
