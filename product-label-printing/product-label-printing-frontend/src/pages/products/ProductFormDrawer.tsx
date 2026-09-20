import { useEffect, useMemo, useState } from 'react'
import { App as AntApp, AutoComplete, Button, Col, DatePicker, Divider, Drawer, Form, Input, InputNumber, Row, Segmented, Select, Tag } from 'antd'
import { CalendarOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import type { ExpiryRule, Product, ProductInput } from '../../types'
import { products as productsApi, productQr, qrUrl } from '../../api'
import { useDb } from '../../mock/db'
import { EXPIRY_RULES, computeExpiry, fmtDate, todayIso } from '../../lib/dates'
import { Label } from '../../components/LabelPreview'
import { DEFAULT_FIELDS } from '../../mock/seed'

interface FormValues extends Omit<ProductInput, 'packedDate' | 'eanCode' | 'pluCode'> {
  packedDate: Dayjs
  eanCode?: string
  pluCode?: string
}

const UNITS = ['PCS', 'KG', 'G', 'LTR', 'ML', 'PACK', 'BAG', 'BOX']

export function ProductFormDrawer({ open, product, onClose, onSaved }: { open: boolean; product?: Product | null; onClose: () => void; onSaved?: (p: Product) => void }) {
  const db = useDb()
  const { message } = AntApp.useApp()
  const [form] = Form.useForm<FormValues>()
  const [saving, setSaving] = useState(false)
  const values = Form.useWatch([], form)

  const categories = useMemo(() => [...new Set(db.products.map((p) => p.category))].sort().map((c) => ({ value: c })), [db.products])
  const brands = useMemo(() => [...new Set(db.products.map((p) => p.brand))].sort().map((c) => ({ value: c })), [db.products])

  useEffect(() => {
    if (!open) return
    if (product) {
      form.setFieldsValue({ ...product, packedDate: dayjs(product.packedDate), eanCode: product.eanCode ?? undefined, pluCode: product.pluCode ?? undefined })
    } else {
      const nextCode = String(Math.max(0, ...db.products.map((p) => Number(p.productCode))) + 7).padStart(8, '0')
      form.resetFields()
      form.setFieldsValue({
        productCode: nextCode,
        category: 'Staples',
        brand: 'Loose',
        unit: 'PCS',
        taxPercent: 0,
        packedDate: dayjs(),
        expiryRule: 'MONTHS_3',
        shelfLifeMonths: null,
        shopId: db.settings.defaultShopId,
        status: 'ACTIVE',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id])

  const packedIso = values?.packedDate ? values.packedDate.format('YYYY-MM-DD') : todayIso()
  const expiryPreview = values ? computeExpiry(packedIso, values.expiryRule ?? 'NONE', values.shelfLifeMonths ?? null) : null

  const previewProduct: Product | null = values
    ? {
        id: product?.id ?? 'preview',
        globalId: product?.globalId ?? 'prd_PREVIEW',
        productCode: values.productCode || '00000000',
        eanCode: values.eanCode || null,
        pluCode: values.pluCode || null,
        name: values.name || 'PRODUCT NAME',
        category: values.category ?? '',
        brand: values.brand ?? '',
        mrp: values.mrp ?? 0,
        salePrice: values.salePrice ?? 0,
        taxPercent: values.taxPercent ?? 0,
        unit: values.unit ?? 'PCS',
        packedDate: packedIso,
        expiryRule: values.expiryRule ?? 'NONE',
        shelfLifeMonths: values.shelfLifeMonths ?? null,
        expiryDate: expiryPreview,
        shopId: values.shopId ?? db.settings.defaultShopId,
        status: values.status ?? 'ACTIVE',
        createdAt: '',
        updatedAt: '',
      }
    : null

  const existingQr = product ? productQr(db, product.id) : undefined

  const submit = async (v: FormValues) => {
    setSaving(true)
    const input: ProductInput = {
      ...v,
      name: v.name.trim().toUpperCase(),
      eanCode: v.eanCode?.trim() || null,
      pluCode: v.pluCode?.trim() || null,
      packedDate: v.packedDate.format('YYYY-MM-DD'),
      shelfLifeMonths: v.expiryRule === 'CUSTOM' ? v.shelfLifeMonths : null,
    }
    try {
      const saved = product ? await productsApi.update(product.id, input) : await productsApi.create(input)
      message.success(product ? 'Product updated' : 'Product created — global ID and QR issued')
      onSaved?.(saved)
      onClose()
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size={880}
      title={product ? `Edit ${product.name}` : 'New product'}
      destroyOnHidden
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={saving} onClick={() => form.submit()}>
            {product ? 'Save changes' : 'Create product'}
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Form form={form} layout="vertical" requiredMark="optional" onFinish={submit}>
          <Divider titlePlacement="start" className="mt-0!">Identity</Divider>
          <Form.Item name="name" label="Product name" rules={[{ required: true, message: 'Required' }]}>
            <Input placeholder="TOOR DAL 1KG" className="uppercase" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="productCode" label="SKU / Product code" rules={[{ required: true, pattern: /^\d{4,14}$/, message: '4–14 digits' }]}>
                <Input className="font-mono" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="eanCode" label="EAN / UPC" rules={[{ pattern: /^\d{8}$|^\d{12,13}$/, message: '8, 12 or 13 digits' }]}>
                <Input className="font-mono" placeholder="Optional" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="pluCode" label="PLU" rules={[{ pattern: /^\d{1,6}$/, message: 'Up to 6 digits' }]}>
                <Input className="font-mono" placeholder="Optional" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="category" label="Category" rules={[{ required: true }]}>
                <AutoComplete options={categories} filterOption />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="brand" label="Brand" rules={[{ required: true }]}>
                <AutoComplete options={brands} filterOption />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="unit" label="Unit" rules={[{ required: true }]}>
                <Select options={UNITS.map((u) => ({ value: u }))} />
              </Form.Item>
            </Col>
          </Row>

          <Divider titlePlacement="start">Pricing</Divider>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="mrp" label="MRP" rules={[{ required: true, message: 'Required' }]}>
                <InputNumber prefix="₹" min={0.01} step={1} className="w-full!" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="salePrice"
                label="Sale price"
                dependencies={['mrp']}
                rules={[
                  { required: true, message: 'Required' },
                  ({ getFieldValue }) => ({
                    validator: (_, v) => (v == null || v <= (getFieldValue('mrp') ?? Infinity) ? Promise.resolve() : Promise.reject(new Error('Cannot exceed MRP'))),
                  }),
                ]}
              >
                <InputNumber prefix="₹" min={0} step={1} className="w-full!" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="taxPercent" label="Tax (GST)">
                <Select options={[0, 5, 12, 18, 28].map((t) => ({ value: t, label: `${t}%` }))} />
              </Form.Item>
            </Col>
          </Row>

          <Divider titlePlacement="start">Dates &amp; expiry</Divider>
          <Row gutter={12}>
            <Col span={10}>
              <Form.Item name="packedDate" label="Packed date" rules={[{ required: true }]}>
                <DatePicker className="w-full" format="DD-MM-YYYY" />
              </Form.Item>
            </Col>
            <Col span={14}>
              <Form.Item label="Calculated expiry" tooltip="Computed by the expiry engine from packed date + shelf life">
                <div className="flex h-9 items-center gap-2 rounded-lg bg-brand-soft/70 px-3 text-[14px]">
                  <CalendarOutlined className="text-brand" />
                  <b className="tabular-nums">{expiryPreview ? fmtDate(expiryPreview) : 'No expiry'}</b>
                </div>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="expiryRule" label="Shelf life">
            <Segmented<ExpiryRule> options={EXPIRY_RULES.map((r) => ({ value: r.value, label: r.label }))} block />
          </Form.Item>
          {values?.expiryRule === 'CUSTOM' && (
            <Form.Item name="shelfLifeMonths" label="Custom shelf life" rules={[{ required: true, message: 'Enter months' }]}>
              <InputNumber min={1} max={120} suffix="months" className="w-48!" />
            </Form.Item>
          )}

          <Divider titlePlacement="start">Availability</Divider>
          <Row gutter={12}>
            <Col span={14}>
              <Form.Item name="shopId" label="Shop" rules={[{ required: true }]}>
                <Select options={db.shops.map((s) => ({ value: s.id, label: `${s.name} — ${s.location}` }))} />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="status" label="Status">
                <Select options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }, { value: 'ARCHIVED', label: 'Archived' }]} />
              </Form.Item>
            </Col>
          </Row>
        </Form>

        <aside className="lg:sticky lg:top-0 lg:self-start">
          <div className="mb-2 text-[12px] font-semibold tracking-wide text-muted uppercase">Live label preview</div>
          {previewProduct && (
            <div className="label-sheet flex justify-center rounded-xl p-4">
              <Label
                template={{ widthMm: 50, heightMm: 30, orientation: 'LANDSCAPE', barcodeType: previewProduct.eanCode ? 'EAN13' : 'CODE128', fields: DEFAULT_FIELDS }}
                product={previewProduct}
                shop={db.shops.find((s) => s.id === previewProduct.shopId)}
                qrUrl={existingQr ? qrUrl(existingQr.id) : 'https://p.yourdomain.com/q/pending'}
                scale={5}
              />
            </div>
          )}
          <div className="mt-4 rounded-xl border border-line p-3 text-[12px] leading-relaxed text-muted">
            <div className="mb-1 flex items-center gap-1.5 font-semibold text-ink">
              <SafetyCertificateOutlined className="text-brand" /> Global identity
            </div>
            {product ? (
              <>
                <div className="font-mono text-[11px] break-all text-ink">{product.globalId}</div>
                <div className="mt-1">IDs are immutable — editing product data never changes the printed QR.</div>
              </>
            ) : (
              <>
                A global product ID and QR identity are issued by the server when you create the product.
                <Tag className="mt-2" variant="filled" color="green">prd_ · qr_ · batch_</Tag>
              </>
            )}
          </div>
        </aside>
      </div>
    </Drawer>
  )
}
