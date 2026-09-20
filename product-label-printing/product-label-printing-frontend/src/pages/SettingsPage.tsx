import { useEffect, useState } from 'react'
import { App as AntApp, Button, Card, Checkbox, Form, Input, Modal, Select, Switch, Table, Tabs, Tag } from 'antd'
import { CheckOutlined, ReloadOutlined, UserAddOutlined } from '@ant-design/icons'
import { resetDb, useDb } from '../mock/db'
import { useSession } from '../hooks/useSession'
import { settings as settingsApi, users as usersApi } from '../api'
import { PageHeader } from '../components/common'
import { ROLE_META, ROLE_PERMISSIONS, type Permission } from '../lib/permissions'
import type { Role, Settings, User } from '../types'

const ROLES: Role[] = ['OWNER', 'ADMIN', 'STAFF', 'VIEWER']
const PERM_LABELS: [Permission, string][] = [
  ['products.view', 'View & search products'],
  ['products.manage', 'Create / edit products'],
  ['batches.manage', 'Manage batches'],
  ['print', 'Queue & print labels'],
  ['printers.manage', 'Manage printers'],
  ['templates.manage', 'Manage templates'],
  ['identity.manage', 'Revoke / reactivate QR'],
  ['analytics.basic', 'Basic analytics'],
  ['analytics.full', 'Full analytics'],
  ['audit.view', 'Audit logs'],
  ['users.manage', 'Users & roles'],
  ['settings.manage', 'Organisation settings'],
]

function OrgSettings() {
  const db = useDb()
  const { message } = AntApp.useApp()
  const [form] = Form.useForm<Settings>()
  const [saving, setSaving] = useState(false)
  useEffect(() => form.setFieldsValue(db.settings), [db.settings, form])

  const save = async (v: Settings) => {
    setSaving(true)
    try {
      await settingsApi.update({ ...db.settings, ...v, publicFields: { ...db.settings.publicFields, ...v.publicFields } })
      message.success('Settings saved')
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Form form={form} layout="vertical" onFinish={save} className="max-w-[640px]">
      <Form.Item name="organizationName" label="Organisation name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="defaultShopId" label="Default shop">
        <Select options={db.shops.map((s) => ({ value: s.id, label: `${s.name} — ${s.location}` }))} />
      </Form.Item>
      <Form.Item
        name="resolverBaseUrl"
        label="Public QR resolver base URL"
        extra="Printed QRs encode {resolver}/{qr id}. Keep this on a stable domain (e.g. https://p.yourdomain.com/q) so you can migrate the app without reprinting labels."
        rules={[{ required: true, type: 'url', message: 'Enter a full URL' }]}
      >
        <Input className="font-mono" />
      </Form.Item>
      <div className="mb-2 font-medium">Shown on the public scan page</div>
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {(Object.keys(db.settings.publicFields) as (keyof Settings['publicFields'])[]).map((k) => (
          <Form.Item key={k} name={['publicFields', k]} valuePropName="checked" noStyle>
            <Checkbox>{{ mrp: 'MRP', salePrice: 'Sale price', packedDate: 'Packed date', expiryDate: 'Expiry date', productCode: 'Product code', batchCode: 'Batch code' }[k]}</Checkbox>
          </Form.Item>
        ))}
      </div>
      <Button type="primary" htmlType="submit" loading={saving}>
        Save settings
      </Button>
    </Form>
  )
}

function UsersTab() {
  const db = useDb()
  const { user: me } = useSession()
  const { message } = AntApp.useApp()
  const [invite, setInvite] = useState(false)
  const [form] = Form.useForm<{ name: string; email: string; role: Role }>()

  const update = async (id: string, patch: Partial<Pick<User, 'role' | 'active'>>) => {
    try {
      await usersApi.update(id, patch)
      message.success('User updated')
    } catch (e) {
      message.error((e as Error).message)
    }
  }

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button icon={<UserAddOutlined />} onClick={() => setInvite(true)}>
          Add user
        </Button>
      </div>
      <Table<User>
        rowKey="id"
        dataSource={db.users}
        pagination={false}
        columns={[
          { title: 'Name', key: 'n', render: (_, u) => <><div className="font-medium">{u.name} {u.id === me?.id && <Tag variant="filled">you</Tag>}</div><div className="text-[12px] text-muted">{u.email}</div></> },
          { title: 'Role', key: 'r', render: (_, u) => <Select size="small" className="w-32" value={u.role} disabled={u.id === me?.id} onChange={(role) => update(u.id, { role })} options={ROLES.map((r) => ({ value: r }))} /> },
          { title: 'Active', key: 'a', render: (_, u) => <Switch size="small" checked={u.active} disabled={u.id === me?.id} onChange={(active) => update(u.id, { active })} /> },
        ]}
      />
      <Modal
        open={invite}
        title="Add user"
        okText="Create user"
        onCancel={() => setInvite(false)}
        onOk={() => form.submit()}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          className="mt-4"
          initialValues={{ role: 'STAFF' }}
          onFinish={async (v) => {
            try {
              await usersApi.create({ ...v, active: true, password: 'welcome@123' })
              message.success(`${v.name} added — temporary password: welcome@123`)
              setInvite(false)
            } catch (e) {
              message.error((e as Error).message)
            }
          }}
        >
          <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
          <Form.Item name="role" label="Role"><Select options={ROLES.map((r) => ({ value: r }))} /></Form.Item>
        </Form>
      </Modal>
    </>
  )
}

function RolesMatrix() {
  return (
    <Table
      rowKey="0"
      pagination={false}
      size="small"
      dataSource={PERM_LABELS}
      scroll={{ x: 560 }}
      columns={[
        { title: 'Permission', key: 'p', render: (_, [, l]) => l },
        ...ROLES.map((r) => ({
          title: <Tag color={ROLE_META[r].color} variant="filled">{r}</Tag>,
          key: r,
          align: 'center' as const,
          render: (_: unknown, [p]: [Permission, string]) => (ROLE_PERMISSIONS[r].includes(p) ? <CheckOutlined className="text-brand" /> : <span className="text-line">—</span>),
        })),
      ]}
    />
  )
}

export function SettingsPage() {
  const { can } = useSession()
  const { modal, message } = AntApp.useApp()
  return (
    <>
      <PageHeader title="Settings" subtitle="Organisation, public resolver, users and permissions." />
      <Card styles={{ body: { paddingTop: 4 } }}>
        <Tabs
          items={[
            ...(can('settings.manage') ? [{ key: 'org', label: 'Organisation', children: <OrgSettings /> }] : []),
            ...(can('users.manage') ? [{ key: 'users', label: 'Users', children: <UsersTab /> }] : []),
            { key: 'roles', label: 'Roles & permissions', children: <RolesMatrix /> },
            ...(can('settings.manage')
              ? [
                  {
                    key: 'data',
                    label: 'Demo data',
                    children: (
                      <div className="max-w-[560px]">
                        <p className="text-muted">
                          This frontend runs against a mock backend stored in your browser (localStorage). Reset to regenerate 60 days of sample products, prints and scans.
                        </p>
                        <Button
                          danger
                          icon={<ReloadOutlined />}
                          onClick={() =>
                            modal.confirm({
                              title: 'Reset all demo data?',
                              content: 'You will be signed out.',
                              okButtonProps: { danger: true },
                              okText: 'Reset',
                              onOk: () => {
                                resetDb()
                                message.success('Demo data reset')
                              },
                            })
                          }
                        >
                          Reset demo data
                        </Button>
                      </div>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </Card>
    </>
  )
}
