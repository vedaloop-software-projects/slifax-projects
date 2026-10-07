import { useState } from 'react'
import { Alert, Button, Card, Empty, Table, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { ClientMasters, MasterRow, MasterType } from '../../../api'
import { MasterFormModal } from './MasterFormModal'
import { MASTER_META } from './meta'

const ORDER: MasterType[] = ['category', 'subCategory', 'tax', 'brand', 'unitType', 'size', 'colour']

/** Master data a product needs (Masters in zenx-pos). Category and Tax / GST are required. */
export function ClientMastersTab({ clientId, masters, error, onChanged }: { clientId: number; masters: ClientMasters | null; error: string | null; onChanged: () => void }) {
  const [adding, setAdding] = useState<MasterType | null>(null)
  if (error) return <Alert type="error" showIcon title="Could not load master data" description={error} />

  const missing = masters && (!masters.categories.some((c) => c.status === 1) || !masters.taxes.some((t) => t.status === 1))

  return (
    <>
      {missing && <Alert className="mb-4!" type="warning" showIcon title="Add at least one category and one tax before adding products." />}
      <div className="grid gap-4 lg:grid-cols-2">
        {ORDER.map((type) => {
          const meta = MASTER_META[type]
          const rows: MasterRow[] = masters?.[meta.list] ?? []
          return (
            <Card
              key={type}
              size="small"
              title={<span>{meta.label} <span className="font-normal text-muted">({rows.length})</span>{(type === 'category' || type === 'tax') && <Tag className="ml-2!" color="blue" variant="filled">Required for products</Tag>}</span>}
              extra={<Button size="small" icon={<PlusOutlined />} onClick={() => setAdding(type)} disabled={type === 'subCategory' && !masters?.categories.length}>Add</Button>}
              styles={{ body: { padding: 0 } }}
            >
              <Table<MasterRow>
                size="small"
                rowKey="id"
                loading={!masters}
                dataSource={rows}
                pagination={rows.length > 6 ? { pageSize: 6, size: 'small' } : false}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="None yet" /> }}
                columns={[
                  { title: 'Code', dataIndex: 'code', render: (v: string) => <span className="font-mono text-[12px]">{v}</span> },
                  { title: 'Name', dataIndex: 'name' },
                  ...(type === 'subCategory' ? [{ title: 'Category', key: 'cat', render: (_: unknown, r: MasterRow) => masters?.categories.find((c) => c.id === r.categoryId)?.name ?? '—' }] : []),
                  ...(type === 'tax' ? [{ title: '%', dataIndex: 'taxPercent', align: 'right' as const }] : []),
                  { title: 'Status', dataIndex: 'status', width: 90, render: (s: number) => <Tag color={s === 1 ? 'success' : 'default'}>{s === 1 ? 'Active' : 'Inactive'}</Tag> },
                ]}
              />
            </Card>
          )
        })}
      </div>
      <MasterFormModal clientId={clientId} type={adding} masters={masters} onClose={() => setAdding(null)} onCreated={() => { setAdding(null); onChanged() }} />
    </>
  )
}
