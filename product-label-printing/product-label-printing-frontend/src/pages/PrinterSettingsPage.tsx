import { useEffect, useMemo, useState } from 'react'
import { App, Button, Card, Checkbox, Empty, Form, Input, InputNumber, Select, Table, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router'
import { printers as printersApi, type PrinterInput } from '../api'
import { useDb } from '../mock/db'
import { useSession } from '../hooks/useSession'
import { PageHeader } from '../components/common'
import type { Printer } from '../types'

type LocalPrinterSettings = { printSpeed: number; darkness: number; defaultPrinterId: string }
const SETTINGS_KEY = 'smart-label-printer-settings'
const DEFAULT_SETTINGS: LocalPrinterSettings = { printSpeed: 4, darkness: 8, defaultPrinterId: '' }

function readSettings(): LocalPrinterSettings {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as Partial<LocalPrinterSettings> } }
  catch { return DEFAULT_SETTINGS }
}

export function PrinterSettingsPage() {
  const db = useDb()
  const navigate = useNavigate()
  const { can } = useSession()
  const { message } = App.useApp()
  const [form] = Form.useForm<{ name: string; templateId: string; printSpeed: number; darkness: number; isDefault: boolean }>()
  const [settings, setSettings] = useState(readSettings)
  const [printerId, setPrinterId] = useState<string>()
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const selected = db.printers.find((p) => p.id === printerId) ?? db.printers[0]
  const templates = useMemo(() => db.templates.map((t) => ({ value: t.id, label: `${t.columns}-UP` })), [db.templates])

  useEffect(() => {
    if (db.printers.length && !printerId) setPrinterId(settings.defaultPrinterId || db.printers[0].id)
  }, [db.printers, printerId, settings.defaultPrinterId])
  useEffect(() => {
    if (!selected) return
    form.setFieldsValue({
      name: selected.name,
      templateId: selected.templateId,
      printSpeed: settings.printSpeed,
      darkness: settings.darkness,
      isDefault: selected.id === settings.defaultPrinterId || !settings.defaultPrinterId,
    })
  }, [selected, settings, form])

  const persistSettings = (value: LocalPrinterSettings) => {
    setSettings(value)
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(value))
  }

  const save = async (value: { name: string; templateId: string; printSpeed: number; darkness: number; isDefault: boolean }) => {
    if (!selected) return
    if (!can('printers.manage')) { message.error('You do not have permission to manage printers.'); return }
    setSaving(true)
    try {
      const input: PrinterInput = {
        name: value.name,
        templateId: value.templateId,
        manufacturer: selected.manufacturer,
        model: selected.model,
        language: selected.language,
        connectionType: selected.connectionType,
        address: selected.address,
        dpi: selected.dpi,
        shopId: selected.shopId,
      }
      await printersApi.update(selected.id, input)
      const next = { printSpeed: value.printSpeed, darkness: value.darkness, defaultPrinterId: value.isDefault ? selected.id : settings.defaultPrinterId }
      persistSettings(next)
      message.success('Printer settings saved')
    } catch (e) { message.error((e as Error).message) }
    finally { setSaving(false) }
  }

  const testPrint = async () => {
    if (!selected) return
    setTesting(true)
    try { await printersApi.testPrint(selected.id); message.success(`Test print submitted to ${selected.name}`) }
    catch (e) { message.error((e as Error).message) }
    finally { setTesting(false) }
  }

  return <>
    <PageHeader title="Printer Settings" subtitle="Configure printers and print quality." extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/printers')}>Add Printer</Button>} />
    {!db.printers.length ? <Card><Empty description="No printers configured yet."><Button type="primary" onClick={() => navigate('/printers')}>Add your first printer</Button></Empty></Card> : <>
      <Card className="mb-4!">
        <Form form={form} layout="vertical" onFinish={save}>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Form.Item name="name" label="Printer Name" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="templateId" label="Default Layout" rules={[{ required: true }]}><Select options={db.templates.map((t) => ({ value: t.id, label: `${t.columns}-UP${t.name ? ` · ${t.name}` : ''}` }))} /></Form.Item>
            <Form.Item name="printSpeed" label="Print Speed" rules={[{ required: true }]}><InputNumber min={1} max={14} className="w-full!" /></Form.Item>
            <Form.Item name="darkness" label="Darkness" rules={[{ required: true }]}><InputNumber min={0} max={15} className="w-full!" /></Form.Item>
          </div>
          <div className="mb-4"><div className="mb-2 font-medium">Options</div><Form.Item name="isDefault" valuePropName="checked" noStyle><Checkbox>Set as default printer</Checkbox></Form.Item></div>
          <div className="flex justify-end gap-2"><Button loading={testing} onClick={testPrint}>Test Print</Button><Button type="primary" htmlType="submit" loading={saving}>Save Settings</Button></div>
        </Form>
      </Card>
      <Card title="Configured Printers">
        <Table<Printer> rowKey="id" pagination={false} dataSource={db.printers} columns={[
          { title: 'Name', dataIndex: 'name' },
          { title: 'Layout', dataIndex: 'templateId', render: (id: string) => templates.find((t) => t.value === id)?.label ?? '—' },
          { title: 'Status', key: 'status', render: (_, p) => p.id === settings.defaultPrinterId || (!settings.defaultPrinterId && p.id === db.printers[0]?.id) ? <Tag color="success">Default</Tag> : <span>{p.status === 'CONNECTED' || p.status === 'BUSY' ? <Tag color="success">Online</Tag> : <Tag>Offline</Tag>}</span> },
          { title: '', key: 'edit', align: 'right', render: (_, p) => <Button onClick={() => { setPrinterId(p.id); form.setFieldsValue({ name: p.name, templateId: p.templateId, printSpeed: settings.printSpeed, darkness: settings.darkness, isDefault: p.id === settings.defaultPrinterId }) }}>Edit</Button> },
        ]} />
      </Card>
    </>}
  </>
}
