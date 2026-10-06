import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Alert, App as AntApp, Button, Card, Checkbox, Col, DatePicker, Divider, Drawer, Form, Input, InputNumber, Row, Select, Switch, Table, Tag } from 'antd'
import { ClockCircleOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, ShopOutlined, StopOutlined, TeamOutlined } from '@ant-design/icons'
import type { Dayjs } from 'dayjs'
import { clients as clientsApi, ClientFormError, type ClientList, type ClientLookups, type ClientStatus, type ClientSummary, type NewClientInput } from '../../api'
import { KpiCard, PageHeader } from '../../components/common'
import { fmtDate } from '../../lib/dates'
import { count, money } from '../../lib/format'
import { CONTRACT_TAG, SUBSCRIPTION_LABEL, contractState, finalAmount } from './clientMeta'

const PAGE_SIZE = 20

export function ClientsPage() {
  const navigate = useNavigate()
  const { message, modal } = AntApp.useApp()
  const [data, setData] = useState<ClientList | null>(null)
  const [lookups, setLookups] = useState<ClientLookups | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ClientStatus | ''>('')
  const [businessTypeId, setBusinessTypeId] = useState<number | ''>('')
  const [page, setPage] = useState(1)
  const [onboarding, setOnboarding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await clientsApi.list({ search, status, businessTypeId, page, pageSize: PAGE_SIZE }))
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [search, status, businessTypeId, page])

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0)
    return () => clearTimeout(t)
  }, [load, search])

  useEffect(() => {
    clientsApi.lookups().then(setLookups).catch(() => setLookups(null))
  }, [])

  const toggle = (c: ClientSummary) => {
    const next: ClientStatus = c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    modal.confirm({
      title: next === 'INACTIVE' ? `Deactivate ${c.businessName}?` : `Activate ${c.businessName}?`,
      content: next === 'INACTIVE' ? 'Their admins and users can no longer sign in (here or in zenx-pos) until you activate them again.' : 'Their admins and users can sign in again.',
      okText: next === 'INACTIVE' ? 'Deactivate' : 'Activate',
      okButtonProps: { danger: next === 'INACTIVE' },
      onOk: async () => {
        try {
          await clientsApi.setStatus(c.id, next)
          message.success(`${c.businessName} ${next === 'ACTIVE' ? 'activated' : 'deactivated'}`)
          await load()
        } catch (e) {
          message.error((e as Error).message)
        }
      },
    })
  }

  const s = data?.summary

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle="Businesses onboarded on ZenxPOS. Their admins and users sign in to print labels."
        extra={
          <>
            <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setOnboarding(true)} disabled={!lookups}>Onboard client</Button>
          </>
        }
      />

      {error && <Alert type="error" showIcon className="mb-4!" title="Could not load clients" description={error} />}

      <Row gutter={[16, 16]} className="mb-4">
        <Col xs={12} xl={6}><KpiCard label="Total clients" value={count(s?.total ?? 0)} icon={<ShopOutlined />} /></Col>
        <Col xs={12} xl={6}><KpiCard label="Active" value={count(s?.active ?? 0)} hint={`${count((s?.total ?? 0) - (s?.active ?? 0))} inactive`} icon={<TeamOutlined />} /></Col>
        <Col xs={12} xl={6}><KpiCard label="Contracts ending in 30 days" value={count(s?.expiring ?? 0)} icon={<ClockCircleOutlined />} tone="amber" /></Col>
        <Col xs={12} xl={6}><KpiCard label="Contracts ended" value={count(s?.expired ?? 0)} icon={<StopOutlined />} tone="red" /></Col>
      </Row>

      <Card styles={{ body: { padding: 0 } }}>
        <div className="flex flex-wrap gap-2 border-b border-line p-4">
          <Input
            allowClear
            className="max-w-[320px]"
            prefix={<SearchOutlined className="text-muted" />}
            placeholder="Business, contact, mobile or email"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
          <Select<ClientStatus | ''>
            className="w-40"
            value={status}
            onChange={(v) => { setStatus(v); setPage(1) }}
            options={[{ value: '', label: 'All statuses' }, { value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }]}
          />
          <Select<number | ''>
            className="w-52"
            value={businessTypeId}
            onChange={(v) => { setBusinessTypeId(v); setPage(1) }}
            options={[{ value: '', label: 'All business types' }, ...(lookups?.businessTypes ?? []).map((b) => ({ value: b.id, label: b.name }))]}
          />
        </div>
        <Table<ClientSummary>
          rowKey="id"
          loading={loading}
          dataSource={data?.clients ?? []}
          scroll={{ x: 960 }}
          onRow={(c) => ({ onClick: () => navigate(`/clients/${c.id}`), className: 'cursor-pointer' })}
          pagination={{ current: page, pageSize: PAGE_SIZE, total: data?.total ?? 0, onChange: setPage, showSizeChanger: false, showTotal: (t) => `${count(t)} clients` }}
          columns={[
            {
              title: 'Business',
              key: 'business',
              render: (_, c) => (
                <div className="min-w-0">
                  <div className="font-semibold">{c.businessName}</div>
                  <div className="text-[12px] text-muted">{c.businessType ?? '—'}</div>
                </div>
              ),
            },
            {
              title: 'Contact',
              key: 'contact',
              render: (_, c) => (
                <div>
                  <div>{c.contactPerson}</div>
                  <div className="font-mono text-[12px] text-muted">{c.mobile}</div>
                </div>
              ),
            },
            { title: 'Location', key: 'loc', render: (_, c) => [c.city, c.state].filter(Boolean).join(', ') || '—' },
            {
              title: 'Contract',
              key: 'contract',
              render: (_, c) => {
                const st = CONTRACT_TAG[contractState(c.endDate)]
                return (
                  <div>
                    <div className="text-[13px]">{fmtDate(c.startDate)} → {fmtDate(c.endDate)}</div>
                    <Tag color={st.color} variant="filled" className="m-0! mt-1! text-[11px]!">{st.label}</Tag>
                  </div>
                )
              },
            },
            { title: 'Users', dataIndex: 'userCount', align: 'right', render: (n?: number) => count(n ?? 0) },
            { title: 'Contract value', key: 'amt', align: 'right', render: (_, c) => money(c.finalAmount) },
            {
              title: 'Status',
              key: 'status',
              render: (_, c) => <Tag color={c.status === 'ACTIVE' ? 'success' : 'default'}>{c.status === 'ACTIVE' ? 'Active' : 'Inactive'}</Tag>,
            },
            {
              title: '',
              key: 'actions',
              align: 'right',
              render: (_, c) => (
                <Button size="small" danger={c.status === 'ACTIVE'} onClick={(e) => { e.stopPropagation(); toggle(c) }}>
                  {c.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                </Button>
              ),
            },
          ]}
        />
      </Card>

      {lookups && (
        <OnboardClientDrawer
          open={onboarding}
          lookups={lookups}
          onClose={() => setOnboarding(false)}
          onCreated={(id) => {
            setOnboarding(false)
            navigate(`/clients/${id}`)
          }}
        />
      )}
    </>
  )
}

type FormValues = Omit<NewClientInput, 'startDate' | 'endDate' | 'status' | 'featureIds' | 'subFeatureIds'> & {
  dates: [Dayjs, Dayjs]
  active: boolean
  features: string[] // "f:<id>" or "s:<id>"
}

/** Mirrors the zenx-pos "Add client" form, so a client onboarded here is identical. */
function OnboardClientDrawer({ open, lookups, onClose, onCreated }: { open: boolean; lookups: ClientLookups; onClose: () => void; onCreated: (id: number) => void }) {
  const { message } = AntApp.useApp()
  const [form] = Form.useForm<FormValues>()
  const [saving, setSaving] = useState(false)
  const amount = Form.useWatch('amount', form) ?? 0
  const discountType = Form.useWatch('discountType', form) ?? 0
  const discountValue = Form.useWatch('discountValue', form) ?? 0
  const subAmount = Form.useWatch('subscriptionAmount', form) ?? 0
  const subDiscountType = Form.useWatch('subscriptionDiscountType', form) ?? 0
  const subDiscountValue = Form.useWatch('subscriptionDiscountValue', form) ?? 0

  useEffect(() => {
    if (open) form.resetFields()
  }, [open, form])

  const featureOptions = useMemo(
    () =>
      lookups.features.map((f) => ({
        name: f.name,
        options: f.subFeatures.length ? f.subFeatures.map((s) => ({ value: `s:${s.id}`, label: s.name })) : [{ value: `f:${f.id}`, label: f.name }],
      })),
    [lookups.features],
  )

  const submit = async (v: FormValues) => {
    setSaving(true)
    try {
      const { dates, active, features, ...rest } = v
      const created = await clientsApi.create({
        ...rest,
        discountValue: rest.discountValue ?? 0,
        subscriptionDiscountValue: rest.subscriptionDiscountValue ?? 0,
        startDate: dates[0].format('YYYY-MM-DD'),
        endDate: dates[1].format('YYYY-MM-DD'),
        status: active ? 1 : 0,
        featureIds: (features ?? []).filter((x) => x.startsWith('f:')).map((x) => Number(x.slice(2))),
        subFeatureIds: (features ?? []).filter((x) => x.startsWith('s:')).map((x) => Number(x.slice(2))),
      })
      message.success(`${created.businessName} onboarded. Their admin signs in with ${created.email}.`)
      onCreated(created.id)
    } catch (e) {
      if (e instanceof ClientFormError) {
        form.setFields(
          Object.entries(e.fields).map(([name, msg]) => ({
            name: (name === 'startDate' || name === 'endDate' ? 'dates' : name) as keyof FormValues,
            errors: [msg],
          })),
        )
        message.error(e.message)
      } else {
        message.error((e as Error).message)
      }
    } finally {
      setSaving(false)
    }
  }

  const discountOptions = [
    { value: 0, label: 'No discount' },
    { value: 1, label: 'Fixed (₹)' },
    { value: 2, label: 'Percent (%)' },
  ]

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size={720}
      title="Onboard client"
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={saving} onClick={() => form.submit()}>Onboard client</Button>
        </div>
      }
    >
      <Form<FormValues>
        form={form}
        layout="vertical"
        onFinish={submit}
        requiredMark="optional"
        initialValues={{ discountType: 0, discountValue: 0, subscriptionDiscountType: 0, subscriptionDiscountValue: 0, subscriptionDuration: 3, active: true, amount: 0, subscriptionAmount: 0, features: [] }}
      >
        <Divider titlePlacement="start" className="mt-0!">Business</Divider>
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Form.Item name="businessName" label="Business name" rules={[{ required: true, max: 100 }]}><Input /></Form.Item>
          <Form.Item name="businessTypeId" label="Business type" rules={[{ required: true }]}>
            <Select showSearch={{ optionFilterProp: 'label' }} options={lookups.businessTypes.map((b) => ({ value: b.id, label: b.name }))} />
          </Form.Item>
          <Form.Item name="contactPerson" label="Contact person" rules={[{ required: true, max: 100 }]}><Input /></Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]} extra="The client admin signs in with this email."><Input /></Form.Item>
          <Form.Item name="mobile" label="Mobile" rules={[{ required: true, pattern: /^[6-9]\d{9}$/, message: '10 digits, starting 6-9' }]}><Input maxLength={10} /></Form.Item>
          <Form.Item name="alternateMobile" label="Alternate mobile" rules={[{ pattern: /^[6-9]\d{9}$/, message: '10 digits, starting 6-9' }]}><Input maxLength={10} /></Form.Item>
          <Form.Item name="stateId" label="State" rules={[{ required: true }]}>
            <Select showSearch={{ optionFilterProp: 'label' }} options={lookups.states.map((s) => ({ value: s.id, label: s.name }))} />
          </Form.Item>
          <Form.Item name="city" label="City" rules={[{ required: true, max: 100 }]}><Input /></Form.Item>
          <Form.Item name="pincode" label="Pincode" rules={[{ pattern: /^\d{6}$/, message: '6 digits' }]}><Input maxLength={6} /></Form.Item>
          <Form.Item name="websiteUrl" label="Website" rules={[{ type: 'url', message: 'Full URL, e.g. https://shop.in' }]}><Input /></Form.Item>
        </div>
        <Form.Item name="address" label="Address" rules={[{ required: true, max: 500 }]}><Input.TextArea rows={2} /></Form.Item>

        <Divider titlePlacement="start">Tax & licences</Divider>
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Form.Item name="gstNumber" label="GST number" normalize={(v: string) => v?.toUpperCase()} rules={[{ pattern: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, message: 'Invalid GST format' }]}><Input /></Form.Item>
          <Form.Item name="gstCode" label="GST state code" rules={[{ pattern: /^\d{2}$/, message: '2 digits' }]}><Input maxLength={2} /></Form.Item>
          <Form.Item name="panNumber" label="PAN" normalize={(v: string) => v?.toUpperCase()} rules={[{ pattern: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, message: 'Invalid PAN format' }]}><Input /></Form.Item>
          <Form.Item name="fssaiNumber" label="FSSAI number" rules={[{ pattern: /^\d{14}$/, message: '14 digits' }]}><Input maxLength={14} /></Form.Item>
          <Form.Item name="tradeLicenseNumber" label="Trade licence number"><Input /></Form.Item>
        </div>

        <Divider titlePlacement="start">Contract (installation)</Divider>
        <div className="grid gap-x-4 sm:grid-cols-3">
          <Form.Item name="amount" label="Amount (₹)" rules={[{ required: true }]}><InputNumber min={0} className="w-full!" /></Form.Item>
          <Form.Item name="discountType" label="Discount"><Select options={discountOptions} /></Form.Item>
          <Form.Item name="discountValue" label="Discount value"><InputNumber min={0} disabled={!discountType} className="w-full!" /></Form.Item>
        </div>
        <Form.Item name="dates" label="Contract period" rules={[{ required: true, message: 'Choose start and end dates' }]}>
          <DatePicker.RangePicker className="w-full" format="DD-MM-YYYY" />
        </Form.Item>
        <div className="mb-4 rounded-lg bg-canvas p-3 text-[13px]">
          Final installation amount incl. {lookups.gst}% GST: <b>{money(finalAmount(amount, discountType, discountValue, lookups.gst))}</b>
        </div>

        <Divider titlePlacement="start">Subscription (MMC)</Divider>
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Form.Item name="subscriptionDuration" label="Duration" rules={[{ required: true }]}>
            <Select options={Object.entries(SUBSCRIPTION_LABEL).map(([value, label]) => ({ value: Number(value), label }))} />
          </Form.Item>
          <Form.Item name="subscriptionAmount" label="Amount (₹)" rules={[{ required: true }]}><InputNumber min={0} className="w-full!" /></Form.Item>
          <Form.Item name="subscriptionDiscountType" label="Discount"><Select options={discountOptions} /></Form.Item>
          <Form.Item name="subscriptionDiscountValue" label="Discount value"><InputNumber min={0} disabled={!subDiscountType} className="w-full!" /></Form.Item>
        </div>
        <div className="mb-4 rounded-lg bg-canvas p-3 text-[13px]">
          Final subscription amount incl. {lookups.gst}% GST: <b>{money(finalAmount(subAmount, subDiscountType, subDiscountValue, lookups.gst))}</b>
        </div>

        <Divider titlePlacement="start">Features</Divider>
        <Form.Item name="features" extra="The client's Admin role gets full access to every feature you enable, as in zenx-pos.">
          <Checkbox.Group className="w-full">
            <div className="grid w-full gap-3 sm:grid-cols-2">
              {featureOptions.map((f) => (
                <div key={f.name} className="rounded-lg border border-line p-3">
                  <div className="mb-1 font-medium">{f.name}</div>
                  <div className="flex flex-col gap-1">
                    {f.options.map((o) => <Checkbox key={o.value} value={o.value}>{o.label}</Checkbox>)}
                  </div>
                </div>
              ))}
            </div>
          </Checkbox.Group>
        </Form.Item>

        <Divider titlePlacement="start">Admin login</Divider>
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Form.Item
            name="adminPassword"
            label="Admin password"
            rules={[{ required: true, min: 8, max: 72, message: '8-72 characters' }]}
            extra="Share it with the client securely. They sign in with the email or mobile above."
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item name="active" label="Active" valuePropName="checked"><Switch /></Form.Item>
        </div>
      </Form>
    </Drawer>
  )
}
