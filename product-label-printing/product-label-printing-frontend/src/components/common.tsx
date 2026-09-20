import type { ReactNode } from 'react'
import { Badge, Card, Tag, Tooltip, Typography } from 'antd'
import type { PrintState, PrinterStatus, ProductStatus } from '../types'
import { expiryState, fmtDate } from '../lib/dates'
import { cx } from '../lib/format'

export function PageHeader({ title, subtitle, extra }: { title: ReactNode; subtitle?: ReactNode; extra?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="m-0 text-[26px] font-bold leading-tight tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="m-0 mt-1 text-[14px] text-muted">{subtitle}</p>}
      </div>
      {extra && <div className="flex flex-wrap items-center gap-2">{extra}</div>}
    </div>
  )
}

export function KpiCard({
  label,
  value,
  hint,
  icon,
  tone = 'brand',
  onClick,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: ReactNode
  tone?: 'brand' | 'orange' | 'red' | 'violet' | 'amber' | 'slate'
  onClick?: () => void
}) {
  const tones = {
    brand: 'bg-brand-soft text-brand',
    orange: 'bg-orange-50 text-orange-700',
    red: 'bg-red-50 text-red-600',
    violet: 'bg-violet-50 text-violet-600',
    amber: 'bg-amber-50 text-amber-700',
    slate: 'bg-slate-100 text-slate-600',
  }
  return (
    <Card className={cx('lift h-full', onClick && 'cursor-pointer')} onClick={onClick} styles={{ body: { padding: 18 } }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] font-medium text-muted">{label}</div>
          <div className="mt-1.5 text-[26px] font-bold leading-none tracking-tight text-ink tabular-nums">{value}</div>
          {hint && <div className="mt-2 text-[12px] text-muted">{hint}</div>}
        </div>
        {icon && <div className={cx('grid size-10 shrink-0 place-items-center rounded-xl text-[18px]', tones[tone])}>{icon}</div>}
      </div>
    </Card>
  )
}

const PRINT_STATE: Record<PrintState, { color: string; label: string }> = {
  QUEUED: { color: 'default', label: 'Queued' },
  VALIDATING: { color: 'processing', label: 'Validating' },
  GENERATING: { color: 'processing', label: 'Generating' },
  SENT_TO_PRINTER: { color: 'processing', label: 'Sent to printer' },
  PRINTING: { color: 'processing', label: 'Printing' },
  PRINTED: { color: 'success', label: 'Printed' },
  FAILED: { color: 'error', label: 'Failed' },
}

export function PrintStateTag({ state }: { state: PrintState }) {
  const s = PRINT_STATE[state]
  return <Tag color={s.color} variant="filled">{s.label}</Tag>
}

export function PrinterStatusBadge({ status }: { status: PrinterStatus }) {
  const map: Record<PrinterStatus, { s: 'success' | 'default' | 'error' | 'processing'; t: string }> = {
    CONNECTED: { s: 'success', t: 'Connected' },
    BUSY: { s: 'processing', t: 'Printing' },
    OFFLINE: { s: 'default', t: 'Offline' },
    ERROR: { s: 'error', t: 'Error' },
  }
  return <Badge status={map[status].s} text={map[status].t} />
}

export function ProductStatusTag({ status }: { status: ProductStatus }) {
  const c = status === 'ACTIVE' ? 'green' : status === 'INACTIVE' ? 'orange' : 'default'
  return <Tag color={c} variant="filled">{status.charAt(0) + status.slice(1).toLowerCase()}</Tag>
}

export function ExpiryTag({ date }: { date: string | null }) {
  const st = expiryState(date)
  if (st === 'NONE') return <Typography.Text type="secondary">No expiry</Typography.Text>
  const color = st === 'EXPIRED' ? 'red' : st === 'EXPIRING' ? 'orange' : undefined
  const text = fmtDate(date)
  return color ? (
    <Tooltip title={st === 'EXPIRED' ? 'Expired' : 'Expires within 30 days'}>
      <Tag color={color} variant="filled">{text}</Tag>
    </Tooltip>
  ) : (
    <span className="tabular-nums">{text}</span>
  )
}

export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx('font-mono text-[12.5px]', className)}>{children}</span>
}

export function SectionTitle({ children, extra }: { children: ReactNode; extra?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h3 className="m-0 text-[15px] font-semibold text-ink">{children}</h3>
      {extra}
    </div>
  )
}
