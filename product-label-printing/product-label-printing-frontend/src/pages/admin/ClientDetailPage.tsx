import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { Alert, App as AntApp, Breadcrumb, Button, Card, Col, Descriptions, Empty, Row, Skeleton, Tabs, Tag } from 'antd'
import { clientWorkspace, clients as clientsApi, type ClientDetail, type ClientMasters } from '../../api'
import { ClientProductsTab } from './workspace/ClientProductsTab'
import { ClientUsersTab } from './workspace/ClientUsersTab'
import { ClientMastersTab } from './workspace/ClientMastersTab'
import { PageHeader } from '../../components/common'
import { fmtDate } from '../../lib/dates'
import { money } from '../../lib/format'
import { CONTRACT_TAG, SUBSCRIPTION_LABEL, contractState } from './clientMeta'

export function ClientDetailPage() {
  const { id } = useParams()
  const { message, modal } = AntApp.useApp()
  const [client, setClient] = useState<ClientDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [params, setParams] = useSearchParams()
  const tab = ['products', 'users', 'masters'].includes(params.get('tab') ?? '') ? (params.get('tab') as string) : 'overview'
  const [masters, setMasters] = useState<ClientMasters | null>(null)
  const [mastersError, setMastersError] = useState<string | null>(null)

  // Products and Master data share the client's master lists (categories, taxes, …).
  const loadMasters = useCallback(async () => {
    try {
      setMasters(await clientWorkspace(Number(id)).masters())
      setMastersError(null)
    } catch (e) {
      setMastersError((e as Error).message)
    }
  }, [id])

  useEffect(() => {
    const t = setTimeout(loadMasters, 0)
    return () => clearTimeout(t)
  }, [loadMasters])

  useEffect(() => {
    let alive = true
    clientsApi
      .get(Number(id))
      .then((c) => alive && setClient(c))
      .catch((e: Error) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [id])

  if (error) return <Alert type="error" showIcon title="Could not load client" description={error} action={<Link to="/clients">Back to clients</Link>} />
  if (!client) return <Skeleton active paragraph={{ rows: 8 }} />

  const active = client.status === 'ACTIVE'
  const contract = CONTRACT_TAG[contractState(client.endDate)]

  const toggle = () =>
    modal.confirm({
      title: active ? `Deactivate ${client.businessName}?` : `Activate ${client.businessName}?`,
      content: active ? 'Their admins and users can no longer sign in until you activate them again.' : 'Their admins and users can sign in again.',
      okText: active ? 'Deactivate' : 'Activate',
      okButtonProps: { danger: active },
      onOk: async () => {
        try {
          setClient(await clientsApi.setStatus(client.id, active ? 'INACTIVE' : 'ACTIVE'))
          message.success(active ? 'Client deactivated' : 'Client activated')
        } catch (e) {
          message.error((e as Error).message)
        }
      },
    })

  return (
    <>
      <Breadcrumb className="mb-3!" items={[{ title: <Link to="/clients">Clients</Link> }, { title: client.businessName }]} />
      <PageHeader
        title={client.businessName}
        subtitle={[client.businessType, [client.city, client.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
        extra={
          <>
            <Tag color={active ? 'success' : 'default'} className="m-0!">{active ? 'Active' : 'Inactive'}</Tag>
            <Button danger={active} onClick={toggle}>{active ? 'Deactivate' : 'Activate'}</Button>
          </>
        }
      />

      <Tabs
        activeKey={tab}
        onChange={(key) => setParams(key === 'overview' ? {} : { tab: key }, { replace: true })}
        items={[
          {
            key: 'overview',
            label: 'Overview',
            children: (
              <>
                <Row gutter={[16, 16]}>
                  <Col xs={24} xl={14}>
                    <Card title="Business details" className="h-full">
                      <Descriptions column={{ xs: 1, sm: 2 }} size="small">
                        <Descriptions.Item label="Contact person">{client.contactPerson}</Descriptions.Item>
                        <Descriptions.Item label="Email">{client.email}</Descriptions.Item>
                        <Descriptions.Item label="Mobile">{client.mobile}</Descriptions.Item>
                        <Descriptions.Item label="Alternate mobile">{client.alternateMobile || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Address" span={2}>{client.address}{client.pincode ? ` - ${client.pincode}` : ''}</Descriptions.Item>
                        <Descriptions.Item label="Website">{client.websiteUrl || '—'}</Descriptions.Item>
                        <Descriptions.Item label="GST">{client.gstNumber || '—'}</Descriptions.Item>
                        <Descriptions.Item label="PAN">{client.panNumber || '—'}</Descriptions.Item>
                        <Descriptions.Item label="FSSAI">{client.fssaiNumber || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Trade licence">{client.tradeLicenseNumber || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Onboarded">{client.createdAt ? fmtDate(client.createdAt) : '—'}</Descriptions.Item>
                      </Descriptions>
                    </Card>
                  </Col>
                  <Col xs={24} xl={10}>
                    <Card title="Contract" extra={<Tag color={contract.color} variant="filled" className="m-0!">{contract.label}</Tag>} className="h-full">
                      <Descriptions column={1} size="small">
                        <Descriptions.Item label="Period">{fmtDate(client.startDate)} → {fmtDate(client.endDate)}</Descriptions.Item>
                        <Descriptions.Item label="Installation">{money(client.amount)} → <b className="ml-1">{money(client.finalAmount)}</b>&nbsp;incl. GST</Descriptions.Item>
                        <Descriptions.Item label="Subscription">{SUBSCRIPTION_LABEL[client.subscriptionDuration] ?? '—'} · {money(client.subscriptionFinalAmount)}</Descriptions.Item>
                        <Descriptions.Item label="Paid">{money(client.paidAmount)}</Descriptions.Item>
                      </Descriptions>
                    </Card>
                  </Col>
                </Row>
                <Card title="Enabled features" className="mt-4!">
                  {client.features.length ? (
                    <div className="flex flex-wrap gap-2">{client.features.map((f) => <Tag key={f} className="m-0!">{f}</Tag>)}</div>
                  ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No features enabled" />
                  )}
                </Card>
              </>
            ),
          },
          { key: 'products', label: 'Products', children: <ClientProductsTab clientId={client.id} masters={masters} onMastersChanged={loadMasters} /> },
          { key: 'users', label: 'Users & roles', children: <ClientUsersTab clientId={client.id} /> },
          { key: 'masters', label: 'Master data', children: <ClientMastersTab clientId={client.id} masters={masters} error={mastersError} onChanged={loadMasters} /> },
        ]}
      />
    </>
  )
}
