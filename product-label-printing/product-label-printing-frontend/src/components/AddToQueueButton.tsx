import { useState } from 'react'
import { App as AntApp, Button, InputNumber, Popover, Space } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { queue } from '../api'
import type { Product } from '../types'
import { useSession } from '../hooks/useSession'

export function AddToQueueButton({ product, batchId = null, size = 'small', type = 'default' }: { product: Product; batchId?: string | null; size?: 'small' | 'middle'; type?: 'default' | 'primary' | 'text' }) {
  const { message } = AntApp.useApp()
  const { can } = useSession()
  const [open, setOpen] = useState(false)
  const [qty, setQty] = useState(5)
  const [busy, setBusy] = useState(false)
  if (!can('print')) return null
  const disabled = product.status !== 'ACTIVE'

  const add = async () => {
    setBusy(true)
    try {
      await queue.add(product.id, qty, batchId)
      message.success(`${qty} × ${product.name} added to queue`)
      setOpen(false)
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      title="Add to print queue"
      content={
        <Space.Compact>
          <InputNumber min={1} max={1000} value={qty} onChange={(v) => setQty(v ?? 1)} autoFocus onPressEnter={add} className="w-24!" />
          <Button type="primary" loading={busy} onClick={add}>
            Add
          </Button>
        </Space.Compact>
      }
    >
      <Button size={size} type={type} icon={<PlusOutlined />} disabled={disabled} onClick={(e) => e.stopPropagation()}>
        Queue
      </Button>
    </Popover>
  )
}
