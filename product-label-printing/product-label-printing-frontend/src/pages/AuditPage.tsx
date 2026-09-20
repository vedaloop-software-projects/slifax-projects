import { useMemo, useState } from 'react'
import { Button, Card, DatePicker, Input, Select, Table, Tag } from 'antd'
import type { TableColumnsType } from 'antd'
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons'
import type { Dayjs } from 'dayjs'
import { useDb } from '../mock/db'
import { Mono, PageHeader } from '../components/common'
import { fmtDateTime } from '../lib/dates'
import type { AuditLog } from '../types'

const TYPE_COLOR: Record<string, string> = {
  PRODUCT: 'green',
  BATCH: 'lime',
  QR: 'orange',
  PRINT_JOB: 'purple',
  PRINTER: 'cyan',
  TEMPLATE: 'gold',
  USER: 'magenta',
  SETTINGS: 'default',
}

export function AuditPage() {
  const db = useDb()
  const [q, setQ] = useState('')
  const [type, setType] = useState<string | undefined>()
  const [actor, setActor] = useState<string | undefined>()
  const [dates, setDates] = useState<[Dayjs | null, Dayjs | null] | null>(null)

  const actors = useMemo(() => [...new Set(db.auditLogs.map((l) => l.actor))].sort(), [db.auditLogs])
  const types = useMemo(() => [...new Set(db.auditLogs.map((l) => l.entityType))].sort(), [db.auditLogs])

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase()
    const from = dates?.[0]?.startOf('day').valueOf()
    const to = dates?.[1]?.endOf('day').valueOf()
    return db.auditLogs.filter((l) => {
      if (type && l.entityType !== type) return false
      if (actor && l.actor !== actor) return false
      const at = new Date(l.at).getTime()
      if (from && at < from) return false
      if (to && at > to) return false
      return !t || l.action.toLowerCase().includes(t) || l.detail.toLowerCase().includes(t) || l.entityId?.toLowerCase().includes(t)
    })
  }, [db.auditLogs, q, type, actor, dates])

  const exportCsv = () => {
    const csv = ['at,actor,action,entityType,entityId,detail', ...rows.map((l) => [l.at, l.actor, l.action, l.entityType, l.entityId ?? '', l.detail].map((v) => JSON.stringify(v)).join(','))].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `audit-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const columns: TableColumnsType<AuditLog> = [
    { title: 'Time', dataIndex: 'at', width: 150, render: (t: string) => <span className="tabular-nums text-muted">{fmtDateTime(t)}</span> },
    { title: 'Actor', dataIndex: 'actor', width: 150, render: (a: string) => <span className={['system', 'print-agent', 'public'].includes(a) ? 'text-muted italic' : 'font-medium'}>{a}</span> },
    { title: 'Action', dataIndex: 'action', render: (a: string) => <Mono className={a.includes('FAIL') || a.includes('REVOKE') ? 'text-red-600' : ''}>{a}</Mono> },
    { title: 'Entity', dataIndex: 'entityType', responsive: ['md'], render: (t: string) => <Tag color={TYPE_COLOR[t] ?? 'default'} variant="filled">{t}</Tag> },
    { title: 'Detail', dataIndex: 'detail', render: (d: string) => <span className="text-[13px]">{d}</span> },
  ]

  return (
    <>
      <PageHeader
        title="Audit log"
        subtitle="Every important action generates an event — who did what, when."
        extra={<Button icon={<DownloadOutlined />} onClick={exportCsv}>Export CSV</Button>}
      />
      <Card styles={{ body: { padding: 0 } }}>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
          <Input prefix={<SearchOutlined className="text-muted" />} placeholder="Search action, detail, ID" allowClear value={q} onChange={(e) => setQ(e.target.value)} className="max-w-[280px]" />
          <Select allowClear placeholder="Entity" value={type} onChange={setType} options={types.map((t) => ({ value: t }))} className="w-36" />
          <Select allowClear placeholder="Actor" value={actor} onChange={setActor} options={actors.map((t) => ({ value: t }))} className="w-44" />
          <DatePicker.RangePicker value={dates} onChange={(v) => setDates(v)} format="DD-MM-YYYY" />
          <Tag variant="filled" className="ml-auto!">{rows.length} events</Tag>
        </div>
        <Table<AuditLog> rowKey="id" size="middle" columns={columns} dataSource={rows} pagination={{ pageSize: 20, showSizeChanger: false }} scroll={{ x: 720 }} />
      </Card>
    </>
  )
}
