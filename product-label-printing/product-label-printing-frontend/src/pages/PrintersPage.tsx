import { useEffect, useMemo, useState } from 'react'
import { App as AntApp, Button, Card, Col, Drawer, Empty, Dropdown, Form, Input, Row, Select, Tabs, Tag } from 'antd'
import { useSearchParams } from 'react-router'
import { ApiOutlined, DeleteOutlined, EditOutlined, FontSizeOutlined, MoreOutlined, PlusOutlined, PrinterOutlined, SyncOutlined, UsbOutlined, WifiOutlined } from '@ant-design/icons'
import { LocalAgentSetup } from '../print/LocalAgentSetup'
import { TemplatesPage } from './TemplatesPage'
import { useDb } from '../mock/db'
import { useSession } from '../hooks/useSession'
import { printers as printersApi, type PrinterInput } from '../api'
import { PageHeader, PrinterStatusBadge } from '../components/common'
import { Sparkline } from '../components/charts'
import { dailySeries, inLastDays, printTotals } from '../lib/analytics'
import { LANGUAGE_LABEL } from '../lib/prnRenderer'
import { timeAgo } from '../lib/dates'
import { count, pct } from '../lib/format'
import type { Printer } from '../types'

const MAKERS: Record<Printer['manufacturer'], Printer['language']> = { Zebra: 'ZPL', TSC: 'TSPL', TVS: 'TSPL', Other: 'ESCPOS' }

function PrinterDrawer({ open, printer, onClose }: { open: boolean; printer: Printer | null; onClose: () => void }) {
  const db = useDb()
  const { message } = AntApp.useApp()
  const [form] = Form.useForm<PrinterInput>()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    form.resetFields()
    form.setFieldsValue(
      printer ?? { manufacturer: 'Zebra', language: 'ZPL', connectionType: 'USB', dpi: 203, address: 'USB001', templateId: db.templates[0]?.id, shopId: db.settings.defaultShopId },
    )
  }, [open, printer, form, db.templates, db.settings.defaultShopId])

  const submit = async (v: PrinterInput) => {
    setSaving(true)
    try {
      if (printer) await printersApi.update(printer.id, v)
      else await printersApi.create(v)
      message.success(printer ? 'Printer profile saved' : 'Printer added — run a connection check')
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
      size={460}
      title={printer ? `Edit ${printer.name}` : 'Add printer'}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={saving} onClick={() => form.submit()}>Save</Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" onFinish={submit}>
        <Form.Item name="name" label="Display name" rules={[{ required: true }]}>
          <Input placeholder="Zebra ZD421 — Billing counter" />
        </Form.Item>
        <div className="grid grid-cols-2 gap-3">
          <Form.Item name="manufacturer" label="Manufacturer" rules={[{ required: true }]}>
            <Select options={Object.keys(MAKERS).map((m) => ({ value: m }))} onChange={(m: Printer['manufacturer']) => form.setFieldValue('language', MAKERS[m])} />
          </Form.Item>
          <Form.Item name="model" label="Model" rules={[{ required: true }]}>
            <Input placeholder="ZD421" />
          </Form.Item>
          <Form.Item name="language" label="Printer language" rules={[{ required: true }]}>
            <Select options={(Object.keys(LANGUAGE_LABEL) as Printer['language'][]).map((l) => ({ value: l, label: LANGUAGE_LABEL[l] }))} />
          </Form.Item>
          <Form.Item name="dpi" label="Resolution">
            <Select options={[{ value: 203, label: '203 dpi' }, { value: 300, label: '300 dpi' }]} />
          </Form.Item>
          <Form.Item name="connectionType" label="Connection">
            <Select options={[{ value: 'USB' }, { value: 'NETWORK', label: 'Network (TCP 9100)' }, { value: 'BLUETOOTH', label: 'Bluetooth' }]} />
          </Form.Item>
          <Form.Item name="address" label="Port / address" rules={[{ required: true }]}>
            <Input placeholder="USB001 or 192.168.1.40:9100" className="font-mono" />
          </Form.Item>
        </div>
        <Form.Item name="templateId" label="Default label template" rules={[{ required: true }]}>
          <Select options={db.templates.map((t) => ({ value: t.id, label: `${t.name} · ${t.widthMm}×${t.heightMm}mm · ${t.columns}UP` }))} />
        </Form.Item>
        <Form.Item name="shopId" label="Shop" rules={[{ required: true }]}>
          <Select options={db.shops.map((s) => ({ value: s.id, label: s.location }))} />
        </Form.Item>
        <div className="rounded-lg bg-canvas p-3 text-[12px] text-muted">
          The Local Print Agent sends PRN directly to the installed Windows queue. Map this profile to a Windows printer above. The language must match the printer firmware.
        </div>
      </Form>
    </Drawer>
  )
}

/** Admins: printers + label templates. Regular users: only connect this PC to the printer. */
export function PrintersPage() {
  const { can } = useSession()
  const [params, setParams] = useSearchParams()

  if (!can('printers.manage')) {
    return (
      <>
        <PageHeader title="Printer Connection" subtitle="Connect this computer to your label printer once. After that, print from Barcode Printing." />
        <LocalAgentSetup connectionOnly />
      </>
    )
  }

  const tab = params.get('tab') === 'templates' ? 'templates' : 'printers'
  return (
    <>
      <PageHeader title="Printers & Templates" subtitle="Printers your team prints to, and the label layouts they use." />
      <Tabs
        activeKey={tab}
        onChange={(key) => setParams(key === 'templates' ? { tab: 'templates' } : {}, { replace: true })}
        items={[
          { key: 'printers', label: 'Printers', children: <PrinterProfiles /> },
          { key: 'templates', label: 'Label templates', children: can('templates.manage') ? <TemplatesPage embedded /> : null },
        ]}
      />
    </>
  )
}

function PrinterProfiles() {
  const db = useDb()
  const { can } = useSession()
  const { message, modal } = AntApp.useApp()
  const [editing, setEditing] = useState<Printer | null>(null)
  const [open, setOpen] = useState(false)
  const [checking, setChecking] = useState<string | null>(null)
  const [testing, setTesting] = useState<string | null>(null)
  const [fontTesting, setFontTesting] = useState<string | null>(null)
  const manage = can('printers.manage')

  const stats = useMemo(() => {
    const m = new Map<string, { printed: number; rate: number; spark: number[] }>()
    for (const p of db.printers) {
      const ev = inLastDays(db.printEvents.filter((e) => e.printerId === p.id), 14)
      const t = printTotals(ev)
      m.set(p.id, { printed: t.printed, rate: t.successRate, spark: dailySeries(ev, [], 14).map((d) => d.printed) })
    }
    return m
  }, [db.printers, db.printEvents])

  const check = async (p: Printer) => {
    setChecking(p.id)
    try {
      const s = await printersApi.checkConnection(p.id)
      if (s === 'OFFLINE') message.warning(`${p.name} did not respond`)
      else message.success(`${p.name} is installed in Windows; physical readiness is not verified`)
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setChecking(null)
    }
  }

  const test = async (p: Printer) => {
    setTesting(p.id)
    try {
      await printersApi.testPrint(p.id)
      message.success(`Test submitted to the Windows queue for ${p.name}`)
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setTesting(null)
    }
  }

  const fontTest = async (p: Printer) => {
    setFontTesting(p.id)
    try {
      await printersApi.fontTest(p.id)
      message.success(`Font test sent to ${p.name}. Each line is labelled; a blank or garbled line means that font is not available.`)
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setFontTesting(null)
    }
  }

  const online = db.printers.filter((p) => p.status === 'CONNECTED' || p.status === 'BUSY').length

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-[14px] text-muted">{online} of {db.printers.length} printers online · each printer has a language and a default label template.</p>
        {manage && <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setOpen(true) }}>Add printer</Button>}
      </div>

      <LocalAgentSetup />

      {!db.printers.length && <Empty description="No printer profiles yet. Add your real printer to get started." />}

      <Row gutter={[16, 16]} className="stagger">
        {db.printers.map((p) => {
          const tpl = db.templates.find((t) => t.id === p.templateId)
          const shop = db.shops.find((s) => s.id === p.shopId)
          const st = stats.get(p.id)
          return (
            <Col key={p.id} xs={24} md={12} xl={8}>
              <Card className="lift h-full" styles={{ body: { padding: 18 } }}>
                <div className="flex items-start gap-3">
                  <div className={`grid size-11 shrink-0 place-items-center rounded-xl text-[20px] ${p.status === 'OFFLINE' || p.status === 'ERROR' ? 'bg-slate-100 text-slate-400' : 'bg-brand-soft text-brand'}`}>
                    <PrinterOutlined />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-semibold">{p.name}</div>
                    <div className="text-[12px] text-muted">
                      {p.manufacturer} {p.model} · {shop?.location}
                    </div>
                  </div>
                  {manage && (
                    <Dropdown
                      trigger={['click']}
                      menu={{
                        items: [
                          { key: 'e', icon: <EditOutlined />, label: 'Edit profile', onClick: () => { setEditing(p); setOpen(true) } },
                          {
                            key: 'd',
                            icon: <DeleteOutlined />,
                            danger: true,
                            label: 'Remove',
                            onClick: () =>
                              modal.confirm({
                                title: `Remove ${p.name}?`,
                                content: 'Print history is kept. The printer will no longer receive jobs.',
                                okButtonProps: { danger: true },
                                okText: 'Remove',
                                onOk: () => printersApi.remove(p.id),
                              }),
                          },
                        ],
                      }}
                    >
                      <Button type="text" size="small" icon={<MoreOutlined />} aria-label="Printer actions" />
                    </Dropdown>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <PrinterStatusBadge status={p.status} />
                  <span className="text-[12px] text-muted">Seen {timeAgo(p.lastSeenAt)}</span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-canvas p-3 text-[13px]">
                  <div>
                    <div className="text-[11px] text-muted">Size</div>
                    {tpl ? `${tpl.widthMm} × ${tpl.heightMm} mm` : '—'}
                  </div>
                  <div>
                    <div className="text-[11px] text-muted">Language</div>
                    <Tag variant="filled" className="m-0!">{p.language}</Tag>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted">Template</div>
                    <span className="truncate">{tpl?.name ?? '—'}</span>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted">Connection</div>
                    <span className="flex items-center gap-1">
                      {p.connectionType === 'USB' ? <UsbOutlined /> : p.connectionType === 'NETWORK' ? <WifiOutlined /> : <ApiOutlined />}
                      <span className="truncate font-mono text-[12px]">{p.address}</span>
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-end justify-between gap-3">
                  <div>
                    <div className="text-[11px] text-muted">Labels · 14 days</div>
                    <div className="font-semibold tabular-nums">
                      {count(st?.printed ?? 0)} <span className="text-[12px] font-normal text-muted">· {pct(st?.rate ?? 1)} ok</span>
                    </div>
                  </div>
                  <div className="h-9 w-28">
                    <Sparkline values={st?.spark ?? []} />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button icon={<SyncOutlined spin={checking === p.id} />} onClick={() => check(p)} disabled={checking === p.id}>
                    Check
                  </Button>
                  <Button icon={<PrinterOutlined />} loading={testing === p.id} onClick={() => test(p)} disabled={!can('print')}>
                    Test print
                  </Button>
                  <Button className="col-span-2" icon={<FontSizeOutlined />} loading={fontTesting === p.id} onClick={() => fontTest(p)} disabled={!can('print') || p.language === 'ESCPOS'}>
                    Font test
                  </Button>
                </div>
              </Card>
            </Col>
          )
        })}
      </Row>

      <PrinterDrawer open={open} printer={editing} onClose={() => setOpen(false)} />
    </>
  )
}
