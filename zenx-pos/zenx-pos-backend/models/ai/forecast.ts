// Demand model for ZenxPOS AI: a recency-weighted level, weekday factors and a damped
// trend, fitted per item from its own daily sales. It is small enough to fit on every
// run, so there is no training job and nothing to host besides the backend.

export const HISTORY_DAYS = 56
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export type DemandModel = {
  level: number
  factors: number[]
  trend: number
  activeDays: number
  totalQty: number
}

const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))

// series[0] is the oldest day, the last entry is the most recent day; firstWeekday is
// the weekday (0 = Sunday) of series[0].
export function fitDemand(series: number[], firstWeekday: number): DemandModel {
  const n = series.length
  let weighted = 0, weights = 0
  for (let index = 0; index < n; index++) {
    const weight = 0.5 ** ((n - 1 - index) / 14)
    weighted += Math.max(0, series[index]) * weight
    weights += weight
  }
  const level = weights ? weighted / weights : 0
  const overall = mean(series.map(value => Math.max(0, value)))
  // Weekday factors, pulled towards 1 when there are only a few weeks of data.
  const raw = WEEKDAYS.map((_, weekday) => {
    const values = series.filter((_, index) => (firstWeekday + index) % 7 === weekday).map(value => Math.max(0, value))
    const factor = overall > 0 && values.length ? mean(values) / overall : 1
    return (values.length * factor + 2) / (values.length + 2)
  })
  const average = mean(raw) || 1
  const factors = raw.map(value => value / average)
  const recent = mean(series.slice(-14)), before = mean(series.slice(-28, -14))
  const trend = n >= 28 && before > 0 ? clamp(recent / before, 0.6, 1.6) : 1
  return { level, factors, trend, activeDays: series.filter(value => value > 0).length, totalQty: series.reduce((sum, value) => sum + Math.max(0, value), 0) }
}

// Expected sales for each of the next `days` days, starting on `startWeekday`.
export function forecastDays(model: DemandModel, startWeekday: number, days: number) {
  const damped = 1 + (model.trend - 1) * 0.5
  return Array.from({ length: days }, (_, index) => model.level * model.factors[(startWeekday + index) % 7] * damped)
}

export const forecastTotal = (model: DemandModel, startWeekday: number, days: number) => forecastDays(model, startWeekday, days).reduce((sum, value) => sum + value, 0)

// Days until the stock runs out at the forecast rate; null when nothing is expected to sell.
export function daysOfCover(model: DemandModel, stock: number, startWeekday: number, horizon = 90) {
  if (stock <= 0) return 0
  let left = stock
  const daily = forecastDays(model, startWeekday, horizon)
  for (let index = 0; index < daily.length; index++) {
    left -= daily[index]
    if (left <= 0) return index + 1
  }
  return null
}

// What the model learned, in words, for the "why" column.
export function demandReason(model: DemandModel) {
  const reasons: string[] = []
  if (model.trend >= 1.2) reasons.push(`Sales up ${Math.round((model.trend - 1) * 100)}% in the last 2 weeks`)
  if (model.trend <= 0.83) reasons.push(`Sales down ${Math.round((1 - model.trend) * 100)}% in the last 2 weeks`)
  const peak = model.factors.indexOf(Math.max(...model.factors))
  if (model.factors[peak] >= 1.4 && model.activeDays >= 8) reasons.push(`${WEEKDAYS[peak]}s sell ${model.factors[peak].toFixed(1)}×`)
  return reasons.join('; ') || 'Steady sales'
}
