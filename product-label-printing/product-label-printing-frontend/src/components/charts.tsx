import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DayPoint } from '../lib/analytics'
import { CHART } from '../theme'
import { count } from '../lib/format'

const axis = { stroke: '#94A39B', fontSize: 11, tickLine: false, axisLine: false } as const

function tickInterval(n: number) {
  return n <= 8 ? 0 : n <= 31 ? Math.ceil(n / 8) - 1 : Math.ceil(n / 10) - 1
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-line bg-white/95 px-3 py-2 text-[12px] shadow-lg backdrop-blur">
      <div className="mb-1 font-semibold text-ink">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-muted">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          {p.name}
          <span className="ml-auto pl-3 font-semibold text-ink tabular-nums">{count(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function PrintActivityChart({ data, height = 260 }: { data: DayPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }} barCategoryGap="22%">
        <CartesianGrid vertical={false} stroke="#EEF2EF" />
        <XAxis dataKey="label" {...axis} interval={tickInterval(data.length)} />
        <YAxis {...axis} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(14,138,95,0.06)' }} />
        <Bar dataKey="printed" name="Printed" stackId="a" fill={CHART.printed} radius={[0, 0, 0, 0]} animationDuration={700} />
        <Bar dataKey="failed" name="Failed" stackId="a" fill={CHART.failed} radius={[4, 4, 0, 0]} animationDuration={700} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function ScanActivityChart({ data, height = 260 }: { data: DayPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="scanFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART.scans} stopOpacity={0.22} />
            <stop offset="100%" stopColor={CHART.scans} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#EEF2EF" />
        <XAxis dataKey="label" {...axis} interval={tickInterval(data.length)} />
        <YAxis {...axis} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} />
        <Area type="monotone" dataKey="scans" name="Scans" stroke={CHART.scans} strokeWidth={2.2} fill="url(#scanFill)" animationDuration={800} />
        <Area type="monotone" dataKey="visitors" name="Unique visitors" stroke={CHART.visitors} strokeWidth={1.6} strokeDasharray="4 3" fill="transparent" animationDuration={800} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function HBarList({ rows, color = CHART.printed, unit }: { rows: { label: string; value: number; sub?: string }[]; color?: string; unit?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  if (!rows.length) return <div className="py-6 text-center text-[13px] text-muted">No data yet</div>
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={r.label + i}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate font-medium text-ink">{r.label}</span>
            <span className="shrink-0 text-muted tabular-nums">
              {count(r.value)}
              {unit && <span className="ml-1 text-[11px]">{unit}</span>}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#EEF2EF]">
            <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${(r.value / max) * 100}%`, background: color }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function DonutChart({ data, height = 200 }: { data: { name: string; value: number }[]; height?: number }) {
  const total = data.reduce((a, d) => a + d.value, 0)
  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: height, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none" animationDuration={700}>
              {data.map((_, i) => (
                <Cell key={i} fill={CHART.series[i % CHART.series.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="text-[20px] font-bold text-ink tabular-nums">{count(total)}</div>
            <div className="text-[11px] text-muted">total</div>
          </div>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-2 text-[13px]">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ background: CHART.series[i % CHART.series.length] }} />
            <span className="truncate text-ink">{d.name}</span>
            <span className="ml-auto text-muted tabular-nums">{total ? Math.round((d.value / total) * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Sparkline({ values, color = CHART.printed, height = 36 }: { values: number[]; color?: string; height?: number }) {
  const data = values.map((v, i) => ({ i, v }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.6} fill={color} fillOpacity={0.1} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
