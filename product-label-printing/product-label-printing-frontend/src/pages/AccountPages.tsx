import { useState } from 'react'
import { App, Button, Card, DatePicker, Input, Select, Table, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useDb } from '../mock/db'
import { PageHeader } from '../components/common'
import { printerName } from '../api'
import { useSession } from '../hooks/useSession'

export function CompanyProfilePage() {
  const db = useDb()
  const [lines, setLines] = useState(['Incl. of Taxes', 'Best Before indicated on pack'])
  const { message } = App.useApp()
  const shop = db.shops.find((s) => s.id === db.settings.defaultShopId) ?? db.shops[0]
  return <>
    <PageHeader title="Company Profile" subtitle="Company details are view only. Manage custom lines that appear on labels." />
    <Card title={<span>Company Details <Tag color="success" className="ml-2">View Only</Tag></span>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <ProfileField label="Company / Shop Name" value={shop?.name ?? db.settings.organizationName} />
        <ProfileField label="FSSAI Code" value="12345678901234" />
        <ProfileField label="Address" value={shop?.address ?? 'Address not configured'} wide />
        <ProfileField label="Phone" value="+91 90000 00000" />
        <ProfileField label="Email" value="store@example.com" />
      </div>
    </Card>
    <Card className="mt-4!" title="Custom Lines on Labels">
      <p className="mb-4 text-muted">These lines can be shown on barcode labels. Add, edit or remove as needed.</p>
      <div className="space-y-2">{lines.map((line, i) => <div className="flex gap-2" key={i}>
        <Input value={line} onChange={(e) => setLines(lines.map((v, n) => n === i ? e.target.value : v))} aria-label={`Custom label line ${i + 1}`} />
        <Button danger onClick={() => setLines(lines.filter((_, n) => n !== i))}>Remove</Button>
      </div>)}</div>
      <div className="mt-3 flex gap-2">
        <Button icon={<PlusOutlined />} onClick={() => setLines([...lines, ''])}>Add Custom Line</Button>
        <Button type="primary" onClick={() => message.success('Custom lines saved')}>Save Custom Lines</Button>
      </div>
    </Card>
  </>
}

function ProfileField({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return <label className={wide ? 'sm:col-span-2' : ''}><span className="mb-1 block text-[13px] font-semibold">{label}</span><Input value={value} readOnly /></label>
}

export function PrintHistoryPage() {
  const db = useDb()
  const { user, can } = useSession()
  const [scope, setScope] = useState<'mine' | 'all'>('mine')
  const [from, setFrom] = useState<dayjs.Dayjs | null>(null)
  const [to, setTo] = useState<dayjs.Dayjs | null>(null)
  const jobs = db.printJobs.filter((j) => {
    const d = dayjs(j.createdAt)
    return (scope === 'all' && can('audit.view') || j.createdBy === user?.name) && (!from || d.isAfter(from.startOf('day')) || d.isSame(from, 'day')) && (!to || d.isBefore(to.endOf('day')) || d.isSame(to, 'day'))
  })
  return <>
    <PageHeader title="My Print History" subtitle="Your barcode print jobs are shown here." />
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Select<'mine' | 'all'> value={scope} onChange={setScope} className="w-56" options={[{ value: 'mine', label: `My Prints (${user?.name ?? ''})` }, ...(can('audit.view') ? [{ value: 'all' as const, label: 'All Users' }] : [])]} />
      <DatePicker placeholder="From date" format="DD-MM-YYYY" onChange={setFrom} />
      <DatePicker placeholder="To date" format="DD-MM-YYYY" onChange={setTo} />
      <Button onClick={() => { setFrom(null); setTo(null) }}>Clear Filter</Button>
    </div>
    <Card styles={{ body: { padding: 0 } }}>
      <Table rowKey="id" dataSource={jobs} locale={{ emptyText: 'No print jobs found. Jobs submitted from Printers → Choose product will appear here.' }} scroll={{ x: 900 }} pagination={{ pageSize: 10 }} columns={[
        { title: 'Batch No.', dataIndex: 'id', render: (id: string) => `BL-${id.slice(-6).toUpperCase()}` },
        { title: 'Date', dataIndex: 'createdAt', render: (d: string) => dayjs(d).format('DD MMM YYYY HH:mm') },
        { title: 'Printed By', dataIndex: 'createdBy' },
        { title: 'Printer', key: 'printer', render: (_, j) => j.printerName ?? printerName(db, j.printerId) },
        { title: 'Products', key: 'products', render: (_, j) => j.items.length },
        { title: 'Labels', key: 'labels', render: (_, j) => j.items.reduce((n, item) => n + item.quantity, 0) },
        { title: 'Status', key: 'status', render: (_, j) => <Tag color={j.items.some((item) => item.state === 'SENT_TO_PRINTER') ? 'processing' : j.finishedAt ? 'success' : 'processing'}>{j.items.some((item) => item.state === 'SENT_TO_PRINTER') ? 'Sent to printer' : j.finishedAt ? 'Completed' : 'Printing'}</Tag> },
      ]} />
    </Card>
  </>
}
