import { useEffect, useState } from 'react'
import { App as AntApp, Form, Input, InputNumber, Modal, Select, Switch } from 'antd'
import { FieldError, clientWorkspace, type ClientMasters, type MasterRow, type MasterType } from '../../../api'
import { MASTER_META } from './meta'

export function MasterFormModal({
  clientId,
  type,
  masters,
  onClose,
  onCreated,
}: {
  clientId: number
  type: MasterType | null
  masters: ClientMasters | null
  onClose: () => void
  onCreated: (type: MasterType, row: MasterRow) => void
}) {
  const { message } = AntApp.useApp()
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const meta = type ? MASTER_META[type] : null

  useEffect(() => {
    if (type) form.resetFields()
  }, [type, form])

  const submit = async (v: Record<string, unknown>) => {
    if (!type || !meta) return
    setSaving(true)
    try {
      const row = await clientWorkspace(clientId).createMaster(type, { ...v, status: v.status ? 1 : 0 })
      message.success(`${meta.label} added`)
      onCreated(type, row)
    } catch (e) {
      if (e instanceof FieldError && e.field) form.setFields([{ name: e.field, errors: [e.message] }])
      else message.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={!!type} title={meta ? `Add ${meta.label.toLowerCase()}` : ''} okText="Add" confirmLoading={saving} onOk={() => form.submit()} onCancel={onClose} destroyOnHidden>
      {meta && (
        <Form form={form} layout="vertical" onFinish={submit} initialValues={{ status: true }} className="mt-3">
          {type === 'subCategory' && (
            <Form.Item name="categoryId" label="Category" rules={[{ required: true, message: 'Choose a category' }]}>
              <Select showSearch={{ optionFilterProp: 'label' }} options={(masters?.categories ?? []).filter((c) => c.status === 1).map((c) => ({ value: c.id, label: c.name }))} />
            </Form.Item>
          )}
          <div className="grid gap-x-3 sm:grid-cols-2">
            <Form.Item name={`${meta.key}Code`} label="Code" rules={[{ required: true, whitespace: true, max: 100 }]}>
              <Input />
            </Form.Item>
            <Form.Item name={`${meta.key}Name`} label="Name" rules={[{ required: true, whitespace: true, max: 100 }]}>
              <Input />
            </Form.Item>
          </div>
          {type === 'tax' && (
            <Form.Item name="taxPercent" label="Tax %" rules={[{ required: true, type: 'number', min: 1, max: 100, message: 'Between 1 and 100' }]}>
              <InputNumber min={1} max={100} step={0.5} className="w-full!" suffix="%" />
            </Form.Item>
          )}
          {type === 'category' && (
            <Form.Item name="printerPath" label="Printer path (KOT)" extra="Optional. Used by zenx-pos to route kitchen tickets.">
              <Input />
            </Form.Item>
          )}
          <Form.Item name="status" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      )}
    </Modal>
  )
}
