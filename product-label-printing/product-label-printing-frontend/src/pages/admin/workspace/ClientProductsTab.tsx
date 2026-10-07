import { useCallback, useEffect, useState } from 'react'
import { Alert, App as AntApp, Button, Card, Divider, Drawer, Form, Input, InputNumber, Select, Switch, Table, Tooltip } from 'antd'
import { DeleteOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { FieldError, clientWorkspace, type ClientMasters, type Flag, type MasterType, type NewProductInput, type WorkspaceProduct } from '../../../api'
import { money } from '../../../lib/format'
import { MasterFormModal } from './MasterFormModal'

export function ClientProductsTab({ clientId, masters, onMastersChanged }: { clientId: number; masters: ClientMasters | null; onMastersChanged: () => void }) {
  const { message } = AntApp.useApp()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<{ rows: WorkspaceProduct[]; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await clientWorkspace(clientId).products(q.trim(), page)
      setData({ rows: res.data, total: res.pagination.total })
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [clientId, q, page])

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0)
    return () => clearTimeout(t)
  }, [load, q])

  const ready = !!masters && masters.categories.some((c) => c.status === 1) && masters.taxes.some((t) => t.status === 1)

  return (
    <>
      {error && <Alert className="mb-3!" type="error" showIcon title="Could not load products" description={error} />}
      {masters && !ready && <Alert className="mb-3!" type="warning" showIcon title="This client has no active category or tax yet. Add them in Master data (or from the product form) first." />}
      <Card styles={{ body: { padding: 0 } }}>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <Input allowClear className="max-w-[320px]" prefix={<SearchOutlined className="text-muted" />} placeholder="Code, name or EAN" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
          <Button className="ml-auto" type="primary" icon={<PlusOutlined />} disabled={!masters} onClick={() => setAdding(true)}>Add product</Button>
        </div>
        <Table<WorkspaceProduct>
          rowKey="id"
          loading={!data && !error}
          dataSource={data?.rows ?? []}
          scroll={{ x: 900 }}
          pagination={{ current: page, pageSize: 20, total: data?.total ?? 0, onChange: setPage, showSizeChanger: false }}
          columns={[
            { title: 'Code', dataIndex: 'productCode', render: (v: string) => <span className="font-mono">{v}</span> },
            { title: 'Product', key: 'name', render: (_, p) => <div><div className="font-medium">{p.productFullName}</div><div className="text-[12px] text-muted">{p.productShortName}{p.eanCode ? ` · EAN ${p.eanCode}` : ''}</div></div> },
            { title: 'Category', key: 'cat', render: (_, p) => [p.categoryName, p.subCategoryName].filter(Boolean).join(' › ') || '—' },
            { title: 'Variants', key: 'v', render: (_, p) => p.variants.length ? p.variants.map((v) => <div key={v.id} className="text-[12px] whitespace-nowrap">{v.packSize} · MRP {money(v.mrp)} · {money(v.salePrice)}</div>) : '—' },
            { title: 'Tax', key: 'tax', render: (_, p) => p.taxName ? `${p.taxName}` : '—' },
            { title: 'HSN', dataIndex: 'hsnCode' },
            {
              title: 'Status',
              key: 'status',
              render: (_, p) => (
                <Tooltip title={p.status === 1 ? 'Click to deactivate' : 'Click to activate'}>
                  <Switch
                    size="small"
                    checked={p.status === 1}
                    onChange={async (on) => {
                      try {
                        await clientWorkspace(clientId).setProductStatus(p.id, on ? 1 : 0)
                        await load()
                      } catch (e) {
                        message.error((e as Error).message)
                      }
                    }}
                  />
                </Tooltip>
              ),
            },
          ]}
        />
      </Card>
      {masters && (
        <ProductDrawer
          open={adding}
          clientId={clientId}
          masters={masters}
          onMastersChanged={onMastersChanged}
          onClose={() => setAdding(false)}
          onCreated={async (p) => {
            setAdding(false)
            message.success(`${p.productFullName} added`)
            setPage(1)
            await load()
          }}
        />
      )}
    </>
  )
}

interface VariantForm {
  packSize: string
  sizeId?: number
  colourId?: number
  basicCost?: number
  costPrice?: number
  mrp?: number
  salePrice?: number
  wholeSalePrice?: number
  dineInPrice?: number
  takeAwayPrice?: number
  salonDuration?: number
  priority: number
  status: boolean
}
interface ProductForm {
  productCode: string
  productShortName: string
  productFullName: string
  eanCode?: string
  categoryId: number
  subCategoryId?: number
  brandId?: number
  unitTypeId?: number
  hsnCode: string
  taxId: number
  status: boolean
  variants: VariantForm[]
  controls: Record<keyof NewProductInput['productControl'], boolean>
}

const CONTROLS: [keyof NewProductInput['productControl'], string][] = [
  ['allowWeighingScale', 'Allow weighing scale'],
  ['allowDecimals', 'Allow decimals'],
  ['allowDiscount', 'Allow discount'],
  ['allowPriceOverride', 'Allow price override'],
  ['kotRequired', 'KOT required'],
  ['kit', 'Kit'],
]
const PRICES: [keyof VariantForm, string][] = [
  ['basicCost', 'Basic cost'],
  ['costPrice', 'Cost price'],
  ['mrp', 'MRP'],
  ['salePrice', 'Sale price'],
  ['wholeSalePrice', 'Wholesale price'],
  ['dineInPrice', 'Dine-in price'],
  ['takeAwayPrice', 'Take-away price'],
]
const DETAIL_FIELDS = new Set(['productCode', 'productShortName', 'productFullName', 'eanCode', 'categoryId', 'subCategoryId', 'brandId', 'unitTypeId', 'hsnCode', 'taxId'])
const flag = (b: boolean | undefined): Flag => (b ? 1 : 0)
const blankVariant = (priority: number): VariantForm => ({ packSize: '', priority, status: true })

/** zenx-pos Products::addProduct, field for field. */
function ProductDrawer({ open, clientId, masters, onMastersChanged, onClose, onCreated }: {
  open: boolean
  clientId: number
  masters: ClientMasters
  onMastersChanged: () => void
  onClose: () => void
  onCreated: (p: WorkspaceProduct) => void
}) {
  const { message } = AntApp.useApp()
  const [form] = Form.useForm<ProductForm>()
  const [saving, setSaving] = useState(false)
  const [quickAdd, setQuickAdd] = useState<MasterType | null>(null)
  const categoryId = Form.useWatch('categoryId', form)
  const kit = Form.useWatch(['controls', 'kit'], form)

  useEffect(() => {
    if (open) form.resetFields()
  }, [open, form])

  const active = (list: { id: number; name: string; status: number }[]) => list.filter((x) => x.status === 1).map((x) => ({ value: x.id, label: x.name }))

  const submit = async (v: ProductForm) => {
    setSaving(true)
    try {
      const created = await clientWorkspace(clientId).createProduct({
        productDetails: {
          productCode: v.productCode,
          productShortName: v.productShortName,
          productFullName: v.productFullName,
          eanCode: v.eanCode || null,
          categoryId: v.categoryId,
          subCategoryId: v.subCategoryId ?? null,
          brandId: v.brandId ?? null,
          unitTypeId: v.unitTypeId ?? null,
          hsnCode: v.hsnCode,
          taxId: v.taxId,
          status: flag(v.status),
        },
        variants: v.variants.map((x) => ({
          packSize: x.packSize,
          sizeId: x.sizeId ?? null,
          colourId: x.colourId ?? null,
          basicCost: x.basicCost ?? null,
          costPrice: x.costPrice ?? null,
          mrp: x.mrp ?? null,
          salePrice: x.salePrice ?? null,
          wholeSalePrice: x.wholeSalePrice ?? null,
          dineInPrice: x.dineInPrice ?? null,
          takeAwayPrice: x.takeAwayPrice ?? null,
          salonDuration: x.salonDuration ?? null,
          priority: x.priority,
          status: flag(x.status),
        })),
        productControl: Object.fromEntries(CONTROLS.map(([k]) => [k, flag(v.controls?.[k])])) as NewProductInput['productControl'],
      })
      onCreated(created)
    } catch (e) {
      if (e instanceof FieldError && e.field && DETAIL_FIELDS.has(e.field)) form.setFields([{ name: e.field as keyof ProductForm, errors: [e.message] }])
      message.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const quickAddButton = (type: MasterType) => (
    <Button type="link" size="small" className="h-auto! p-0!" onClick={() => setQuickAdd(type)}>+ New</Button>
  )

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size={760}
      title="Add product"
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={saving} onClick={() => form.submit()}>Add product</Button>
        </div>
      }
    >
      <Form<ProductForm>
        form={form}
        layout="vertical"
        requiredMark="optional"
        onFinish={submit}
        initialValues={{ status: true, variants: [blankVariant(1)], controls: Object.fromEntries(CONTROLS.map(([k]) => [k, false])) }}
      >
        <Divider titlePlacement="start" className="mt-0!">Product details</Divider>
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Form.Item name="productCode" label="Product code" rules={[{ required: true, whitespace: true, max: 100 }]}><Input /></Form.Item>
          <Form.Item name="eanCode" label="EAN code" rules={[{ max: 100 }]}><Input /></Form.Item>
          <Form.Item name="productShortName" label="Short name" rules={[{ required: true, whitespace: true, max: 100 }]} extra="Printed on bills and labels."><Input /></Form.Item>
          <Form.Item name="productFullName" label="Full name" rules={[{ required: true, whitespace: true, max: 200 }]}><Input /></Form.Item>
          <Form.Item name="categoryId" label={<span className="flex w-full justify-between gap-2">Category {quickAddButton('category')}</span>} rules={[{ required: true, message: 'Choose a category' }]}>
            <Select showSearch={{ optionFilterProp: 'label' }} options={active(masters.categories)} onChange={() => form.setFieldValue('subCategoryId', undefined)} />
          </Form.Item>
          <Form.Item name="subCategoryId" label={<span className="flex w-full justify-between gap-2">Sub category {quickAddButton('subCategory')}</span>}>
            <Select allowClear showSearch={{ optionFilterProp: 'label' }} disabled={!categoryId} options={active(masters.subCategories.filter((s) => s.categoryId === categoryId))} />
          </Form.Item>
          <Form.Item name="brandId" label={<span className="flex w-full justify-between gap-2">Brand {quickAddButton('brand')}</span>}>
            <Select allowClear showSearch={{ optionFilterProp: 'label' }} options={active(masters.brands)} />
          </Form.Item>
          <Form.Item name="unitTypeId" label={<span className="flex w-full justify-between gap-2">Unit {quickAddButton('unitType')}</span>}>
            <Select allowClear showSearch={{ optionFilterProp: 'label' }} options={active(masters.unitTypes)} />
          </Form.Item>
          <Form.Item name="hsnCode" label="HSN code" rules={[{ required: true, pattern: /^\d{2,8}$/, message: '2 to 8 digits' }]}><Input maxLength={8} /></Form.Item>
          <Form.Item name="taxId" label={<span className="flex w-full justify-between gap-2">Tax / GST {quickAddButton('tax')}</span>} rules={[{ required: true, message: 'Choose a tax' }]}>
            <Select options={masters.taxes.filter((t) => t.status === 1).map((t) => ({ value: t.id, label: `${t.name} (${t.taxPercent}%)` }))} />
          </Form.Item>
          <Form.Item name="status" label="Active" valuePropName="checked"><Switch /></Form.Item>
        </div>

        <Divider titlePlacement="start">Variants</Divider>
        <Form.List name="variants">
          {(fields, { add, remove }) => (
            <div className="space-y-3">
              {fields.map((field, i) => (
                <Card key={field.key} size="small" title={`Variant ${i + 1}`} extra={fields.length > 1 && <Button size="small" type="text" danger icon={<DeleteOutlined />} aria-label={`Remove variant ${i + 1}`} onClick={() => remove(field.name)} />}>
                  <div className="grid gap-x-3 sm:grid-cols-4">
                    <Form.Item name={[field.name, 'packSize']} label="Pack size" rules={[{ required: true, whitespace: true, max: 100 }]} className="sm:col-span-2"><Input placeholder="1 KG" /></Form.Item>
                    <Form.Item name={[field.name, 'priority']} label="Priority" rules={[{ required: true, type: 'number', min: 1, message: '1 or more' }]}><InputNumber min={1} className="w-full!" /></Form.Item>
                    <Form.Item name={[field.name, 'status']} label="Active" valuePropName="checked"><Switch /></Form.Item>
                    <Form.Item name={[field.name, 'sizeId']} label="Size" className="sm:col-span-2"><Select allowClear options={active(masters.sizes)} /></Form.Item>
                    <Form.Item name={[field.name, 'colourId']} label="Colour" className="sm:col-span-2"><Select allowClear options={active(masters.colours)} /></Form.Item>
                    {PRICES.map(([k, label]) => (
                      <Form.Item key={k} name={[field.name, k]} label={label} rules={[{ type: 'number', min: 0 }]}><InputNumber min={0} step={0.5} className="w-full!" prefix="₹" /></Form.Item>
                    ))}
                    <Form.Item name={[field.name, 'salonDuration']} label="Salon duration" rules={[{ type: 'number', min: 0 }]}><InputNumber min={0} precision={0} className="w-full!" suffix="min" /></Form.Item>
                  </div>
                </Card>
              ))}
              <Tooltip title={kit ? 'Only one variant is allowed when kit is enabled.' : undefined}>
                <Button icon={<PlusOutlined />} disabled={!!kit} onClick={() => add(blankVariant(fields.length + 1))}>Add variant</Button>
              </Tooltip>
            </div>
          )}
        </Form.List>

        <Divider titlePlacement="start">Product controls</Divider>
        <div className="grid grid-cols-2 gap-x-4 sm:grid-cols-3">
          {CONTROLS.map(([k, label]) => (
            <Form.Item key={k} name={['controls', k]} label={label} valuePropName="checked" className="mb-3!"><Switch size="small" /></Form.Item>
          ))}
        </div>
        <p className="mt-0 text-[12px] text-muted">Stock (QOH) starts at 0, as in zenx-pos. Add stock there through transfers or adjustments. Product image upload stays in zenx-pos.</p>
      </Form>

      <MasterFormModal
        clientId={clientId}
        type={quickAdd}
        masters={masters}
        onClose={() => setQuickAdd(null)}
        onCreated={(type, row) => {
          setQuickAdd(null)
          onMastersChanged()
          const field = ({ category: 'categoryId', subCategory: 'subCategoryId', brand: 'brandId', unitType: 'unitTypeId', tax: 'taxId' } as Partial<Record<MasterType, keyof ProductForm>>)[type]
          if (field) {
            if (type === 'subCategory') form.setFieldValue('categoryId', row.categoryId)
            form.setFieldValue(field, row.id)
          }
        }}
      />
    </Drawer>
  )
}
