import { useCallback, useEffect, useState } from 'react'
import { Alert, App as AntApp, Button, Card, Checkbox, Drawer, Empty, Form, Input, InputNumber, Modal, Select, Skeleton, Switch, Table, Tag, Tooltip } from 'antd'
import { EditOutlined, KeyOutlined, PlusOutlined, SafetyOutlined } from '@ant-design/icons'
import { FieldError, clientWorkspace, type AccessPerm, type ClientLogin, type ClientRole, type RoleAccess, type UserInput } from '../../../api'
import { ROLE_META } from '../../../lib/permissions'

// zenx-pos feature ids (features / sub_features tables): Masters → Products.
const PRODUCTS_FEATURE = 5
const PRODUCTS_SUB = 2

export function ClientUsersTab({ clientId, onChanged }: { clientId: number; onChanged?: () => void }) {
  const { message } = AntApp.useApp()
  const [users, setUsers] = useState<ClientLogin[] | null>(null)
  const [roles, setRoles] = useState<ClientRole[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<ClientLogin | 'new' | null>(null)
  const [addingRole, setAddingRole] = useState(false)
  const [accessRole, setAccessRole] = useState<ClientRole | null>(null)

  const load = useCallback(async () => {
    try {
      const api = clientWorkspace(clientId)
      const [u, r] = await Promise.all([api.users(), api.roles()])
      setUsers(u)
      setRoles(r)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [clientId])

  useEffect(() => {
    const t = setTimeout(load, 0)
    return () => clearTimeout(t)
  }, [load])

  const changed = async () => {
    await load()
    onChanged?.()
  }

  if (error) return <Alert type="error" showIcon title="Could not load users" description={error} />

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card title={`Logins (${users?.length ?? 0})`} extra={<Button type="primary" icon={<PlusOutlined />} disabled={!roles?.length} onClick={() => setEditing('new')}>Add user</Button>} styles={{ body: { padding: 0 } }}>
        <Table<ClientLogin>
          rowKey="id"
          loading={!users}
          dataSource={users ?? []}
          pagination={false}
          scroll={{ x: 760 }}
          columns={[
            { title: 'Name', key: 'name', render: (_, u) => <span className="font-medium">{u.name}{u.isAdmin && <Tag className="ml-2!" color="gold" variant="filled">Owner</Tag>}</span> },
            { title: 'Email', dataIndex: 'email' },
            { title: 'Mobile', dataIndex: 'mobile', render: (v: string) => <span className="font-mono">{v}</span> },
            { title: 'Role', dataIndex: 'roleTitle', render: (v: string | null) => v ?? '—' },
            { title: 'Label app', dataIndex: 'appRole', render: (r: 'ADMIN' | 'USER') => <Tag color={ROLE_META[r].color} variant="filled">{ROLE_META[r].label}</Tag> },
            { title: 'Max disc.', dataIndex: 'maxDiscountPercentage', align: 'right', render: (v: number) => `${v}%` },
            { title: 'Status', dataIndex: 'status', render: (s: number) => <Tag color={s === 1 ? 'success' : 'default'}>{s === 1 ? 'Active' : 'Inactive'}</Tag> },
            {
              title: '',
              key: 'edit',
              align: 'right',
              render: (_, u) => (
                <Tooltip title={u.isAdmin ? 'The owner login is managed from the client profile' : 'Edit'}>
                  <Button size="small" icon={<EditOutlined />} aria-label={`Edit ${u.name}`} disabled={u.isAdmin} onClick={() => setEditing(u)} />
                </Tooltip>
              ),
            },
          ]}
        />
      </Card>

      <Card title="Roles" extra={<Button size="small" icon={<PlusOutlined />} onClick={() => setAddingRole(true)}>Add role</Button>} styles={{ body: { padding: 8 } }}>
        {!roles ? <Skeleton active /> : !roles.length ? <Empty description="No roles" /> : roles.map((r) => (
          <div key={r.id} className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-canvas">
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{r.roleTitle}</div>
              <div className="text-[12px] text-muted">{r.users} user{r.users === 1 ? '' : 's'}{r.status !== 1 && ' · inactive'}</div>
            </div>
            <Button size="small" icon={<SafetyOutlined />} disabled={r.status !== 1} onClick={() => setAccessRole(r)}>Access levels</Button>
          </div>
        ))}
        <p className="mx-2 mb-1 text-[12px] text-muted">Roles named Admin or Manager get Admin access in the label app; others print only.</p>
      </Card>

      <UserModal clientId={clientId} roles={roles ?? []} user={editing} onClose={() => setEditing(null)} onSaved={async (u, isNew) => { setEditing(null); message.success(isNew ? `${u.name} added` : `${u.name} updated`); await changed() }} />
      <RoleModal clientId={clientId} open={addingRole} onClose={() => setAddingRole(false)} onSaved={async (r) => { setAddingRole(false); message.success(`${r.roleTitle} added. Set its access levels next.`); await changed(); setAccessRole(r) }} />
      <AccessDrawer clientId={clientId} role={accessRole} onClose={() => setAccessRole(null)} />
    </div>
  )
}

type UserForm = Omit<UserInput, 'status'> & { status: boolean }

/** Master::addUser / updateUser fields. Password is optional when editing. */
function UserModal({ clientId, roles, user, onClose, onSaved }: { clientId: number; roles: ClientRole[]; user: ClientLogin | 'new' | null; onClose: () => void; onSaved: (u: ClientLogin, isNew: boolean) => void }) {
  const { message } = AntApp.useApp()
  const [form] = Form.useForm<UserForm>()
  const [saving, setSaving] = useState(false)
  const isNew = user === 'new'

  useEffect(() => {
    if (!user) return
    form.resetFields()
    if (user !== 'new') form.setFieldsValue({ roleId: user.roleId, name: user.name, email: user.email, mobile: user.mobile, password: '', maxDiscountPercentage: user.maxDiscountPercentage, status: user.status === 1 })
  }, [user, form])

  const submit = async (v: UserForm) => {
    setSaving(true)
    try {
      const body: UserInput = { ...v, password: v.password ?? '', status: v.status ? 1 : 0 }
      const api = clientWorkspace(clientId)
      const saved = isNew ? await api.createUser(body) : await api.updateUser((user as ClientLogin).id, body)
      onSaved(saved, isNew)
    } catch (e) {
      if (e instanceof FieldError && e.field) form.setFields([{ name: e.field as keyof UserForm, errors: [e.message] }])
      else message.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={!!user} title={isNew ? 'Add user' : 'Edit user'} okText={isNew ? 'Add user' : 'Save'} confirmLoading={saving} onOk={() => form.submit()} onCancel={onClose} destroyOnHidden>
      <Form<UserForm> form={form} layout="vertical" requiredMark="optional" onFinish={submit} initialValues={{ status: true, maxDiscountPercentage: 0 }} className="mt-3">
        <Form.Item name="roleId" label="Role" rules={[{ required: true, message: 'Choose a role' }]}>
          <Select options={roles.map((r) => ({ value: r.id, label: r.roleTitle, disabled: r.status !== 1 }))} />
        </Form.Item>
        <Form.Item name="name" label="Name" rules={[{ required: true, min: 3, max: 100, whitespace: true }]}><Input /></Form.Item>
        <div className="grid gap-x-3 sm:grid-cols-2">
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', max: 100 }]}><Input autoComplete="off" /></Form.Item>
          <Form.Item name="mobile" label="Mobile" rules={[{ required: true, pattern: /^[6-9][0-9]{9}$/, message: 'Please enter valid Indian mobile number.' }]}><Input maxLength={10} /></Form.Item>
          <Form.Item
            name="password"
            label={isNew ? 'Password' : 'New password'}
            extra={isNew ? 'They sign in to zenx-pos and the label app with their email or mobile.' : 'Leave empty to keep the current password.'}
            rules={[{ required: isNew, min: 6, max: 20, message: '6 to 20 characters' }]}
          >
            <Input.Password autoComplete="new-password" prefix={<KeyOutlined className="text-muted" />} />
          </Form.Item>
          <Form.Item name="maxDiscountPercentage" label="Max discount (billing)" rules={[{ required: true, type: 'number', min: 0, max: 100 }]}>
            <InputNumber min={0} max={100} className="w-full!" suffix="%" />
          </Form.Item>
        </div>
        <Form.Item name="status" label="Active" valuePropName="checked"><Switch /></Form.Item>
      </Form>
    </Modal>
  )
}

function RoleModal({ clientId, open, onClose, onSaved }: { clientId: number; open: boolean; onClose: () => void; onSaved: (r: ClientRole) => void }) {
  const { message } = AntApp.useApp()
  const [form] = Form.useForm<{ roleTitle: string; status: boolean }>()
  const [saving, setSaving] = useState(false)
  return (
    <Modal open={open} title="Add role" okText="Add role" confirmLoading={saving} onOk={() => form.submit()} onCancel={onClose} destroyOnHidden afterOpenChange={(o) => o && form.resetFields()}>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ status: true }}
        className="mt-3"
        onFinish={async (v) => {
          setSaving(true)
          try {
            onSaved(await clientWorkspace(clientId).createRole({ roleTitle: v.roleTitle, status: v.status ? 1 : 0 }))
          } catch (e) {
            if (e instanceof FieldError && e.field) form.setFields([{ name: 'roleTitle', errors: [e.message] }])
            else message.error((e as Error).message)
          } finally {
            setSaving(false)
          }
        }}
      >
        <Form.Item name="roleTitle" label="Role title" rules={[{ required: true, whitespace: true, max: 255 }]} extra="e.g. Billing Staff, Store Manager"><Input /></Form.Item>
        <Form.Item name="status" label="Active" valuePropName="checked"><Switch /></Form.Item>
      </Form>
    </Modal>
  )
}

/** zenx-pos Access Levels: feature switches with View / Add / Edit, plus billing access. */
function AccessDrawer({ clientId, role, onClose }: { clientId: number; role: ClientRole | null; onClose: () => void }) {
  const { message } = AntApp.useApp()
  const [access, setAccess] = useState<RoleAccess | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!role) return
    let alive = true
    clientWorkspace(clientId).access(role.id).then((a) => alive && setAccess(a)).catch((e: Error) => alive && message.error(e.message))
    return () => {
      alive = false
      setAccess(null)
    }
  }, [clientId, role, message])

  const setFeature = (fid: number, patch: Partial<AccessPerm>, subId?: number) =>
    setAccess((a) => a && {
      ...a,
      features: a.features.map((f) => {
        if (f.featureId !== fid) return f
        if (subId === undefined) return { ...f, ...patch, ...(patch.status === 0 ? { isAdd: 0, isEdit: 0, isView: 0 } : {}) }
        return { ...f, subFeatures: f.subFeatures.map((s) => (s.subFeatureId === subId ? { ...s, ...patch, ...(patch.status === 0 ? { isAdd: 0, isEdit: 0, isView: 0 } : {}) } : s)) }
      }),
    })

  const perms = (p: AccessPerm, onChange: (patch: Partial<AccessPerm>) => void) => (
    <div className="flex items-center gap-3">
      <Switch size="small" checked={p.status === 1} onChange={(on) => onChange({ status: on ? 1 : 0, ...(on && !p.isView ? { isView: 1 } : {}) })} />
      {(['isView', 'isAdd', 'isEdit'] as const).map((k) => (
        <Checkbox key={k} disabled={p.status !== 1} checked={p[k] === 1} onChange={(e) => onChange({ [k]: e.target.checked ? 1 : 0 })}>
          {{ isView: 'View', isAdd: 'Add', isEdit: 'Edit' }[k]}
        </Checkbox>
      ))}
    </div>
  )

  const productsView = access?.features.find((f) => f.featureId === PRODUCTS_FEATURE)?.subFeatures.find((s) => s.subFeatureId === PRODUCTS_SUB)

  const save = async () => {
    if (!role || !access) return
    setSaving(true)
    try {
      setAccess(await clientWorkspace(clientId).saveAccess(role.id, access))
      message.success('Access levels saved')
      onClose()
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      open={!!role}
      onClose={onClose}
      size={640}
      title={role ? `Access levels · ${role.roleTitle}` : ''}
      footer={<div className="flex justify-end gap-2"><Button onClick={onClose}>Cancel</Button><Button type="primary" loading={saving} disabled={!access} onClick={save}>Save access levels</Button></div>}
    >
      {!access ? <Skeleton active paragraph={{ rows: 10 }} /> : (
        <div className="space-y-4">
          {productsView && productsView.isView !== 1 && (
            <Alert type="warning" showIcon title="Users with this role cannot print labels yet." description="Label printing needs Masters → Products with View." />
          )}
          <Card size="small" title="Billing access">
            <div className="flex flex-wrap gap-5">
              {(['allowDiscount', 'allowPriceOverride', 'allowRefund'] as const).map((k) => (
                <Checkbox key={k} checked={access.billingAccess[k] === 1} onChange={(e) => setAccess({ ...access, billingAccess: { ...access.billingAccess, [k]: e.target.checked ? 1 : 0 } })}>
                  {{ allowDiscount: 'Allow discount', allowPriceOverride: 'Allow price override', allowRefund: 'Allow refund' }[k]}
                </Checkbox>
              ))}
            </div>
          </Card>
          {access.features.length === 0 && <Empty description="This client has no features enabled." />}
          {access.features.map((f) => (
            <Card key={f.featureId} size="small" title={f.featureName} extra={!f.subFeatures.length && perms(f, (patch) => setFeature(f.featureId, patch))}>
              {f.subFeatures.length > 0 && (
                <div className="divide-y divide-line">
                  {f.subFeatures.map((s) => (
                    <div key={s.subFeatureId} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                      <span className="text-[13px]">
                        {s.subFeatureName}
                        {f.featureId === PRODUCTS_FEATURE && s.subFeatureId === PRODUCTS_SUB && <Tag className="ml-2!" color="blue" variant="filled">Needed to print labels</Tag>}
                      </span>
                      {perms(s, (patch) => setFeature(f.featureId, patch, s.subFeatureId))}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </Drawer>
  )
}
