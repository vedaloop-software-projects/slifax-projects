// Store-level models for ZenxPOS AI: customer groups, unusual activity, items bought
// together, slow hours and margin checks. Plain statistics on the store's own data.

const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
const median = (values: number[]) => {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b), middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}
const round2 = (value: number) => Math.round(value * 100) / 100

// ---------------------------------------------------------------- customer groups
export type CustomerVisit = { customerId: string; daysAgo: number; amount: number }
export type CustomerGroup = 'loyal' | 'new' | 'regular' | 'at_risk' | 'lost'
export type CustomerScore = { customerId: string; group: CustomerGroup; visits: number; lastVisitDaysAgo: number; firstVisitDaysAgo: number; usualGapDays: number | null; averageBill: number; value90: number; valueYear: number }

export const GROUP_LABELS: Record<CustomerGroup, string> = {
  loyal: 'Loyal', new: 'New', regular: 'Regular', at_risk: 'At risk: missed their usual visit', lost: 'Lost: no visit in 90 days',
}

// Visits are one per customer per day; daysAgo 0 is today.
export function scoreCustomers(visits: CustomerVisit[]): CustomerScore[] {
  const byCustomer = new Map<string, Map<number, number>>()
  for (const visit of visits) {
    const days = byCustomer.get(visit.customerId) ?? new Map<number, number>()
    days.set(visit.daysAgo, (days.get(visit.daysAgo) ?? 0) + visit.amount)
    byCustomer.set(visit.customerId, days)
  }
  return [...byCustomer].map(([customerId, days]) => {
    const dayList = [...days.keys()].sort((a, b) => b - a)
    const gaps = dayList.slice(1).map((day, index) => dayList[index] - day)
    const amounts = [...days.values()]
    const last = dayList[dayList.length - 1], first = dayList[0]
    const usualGap = gaps.length ? median(gaps) : null
    let group: CustomerGroup
    if (last > 90) group = 'lost'
    else if (first <= 30 && dayList.length <= 2) group = 'new'
    else if (last > Math.max(21, (usualGap ?? 30) * 2)) group = 'at_risk'
    else if (dayList.length >= 4) group = 'loyal'
    else group = 'regular'
    const value90 = [...days].filter(([day]) => day <= 90).reduce((sum, [, amount]) => sum + amount, 0)
    return { customerId, group, visits: dayList.length, lastVisitDaysAgo: last, firstVisitDaysAgo: first, usualGapDays: usualGap, averageBill: round2(mean(amounts)), value90: round2(value90), valueYear: round2(amounts.reduce((sum, amount) => sum + amount, 0)) }
  })
}

// ---------------------------------------------------------------- unusual activity
export type ActivityMetric = { key: string; label: string; today: number; history: number[]; minimum: number; money?: boolean }
export type ActivityAlert = { key: string; label: string; today: number; usual: number; money: boolean }

// A value is unusual when it is well above the person's own usual day (mean + 3 standard
// deviations, with a floor so a quiet history does not flag tiny numbers) and above a minimum.
export function unusualActivity(metrics: ActivityMetric[]): ActivityAlert[] {
  return metrics.flatMap(metric => {
    const usual = mean(metric.history)
    const spread = Math.sqrt(mean(metric.history.map(value => (value - usual) ** 2)))
    const limit = usual + 3 * Math.max(spread, usual * 0.5, metric.money ? 100 : 1)
    if (metric.today < metric.minimum || metric.today <= limit) return []
    return [{ key: metric.key, label: metric.label, today: round2(metric.today), usual: round2(usual), money: !!metric.money }]
  })
}

// ---------------------------------------------------------------- bought together
export type BasketPair = { a: string; b: string; together: number; confidence: number; lift: number }

// Pairs of items that appear in the same bill more often than chance. A bill is a list
// of item ids; very large bills are skipped as they pair everything with everything.
export function boughtTogether(bills: string[][], options: { minTogether?: number; maxItems?: number; limit?: number } = {}): BasketPair[] {
  const maxItems = options.maxItems ?? 25
  const usable = bills.map(items => [...new Set(items)]).filter(items => items.length >= 2 && items.length <= maxItems)
  const total = bills.length
  if (!total) return []
  const single = new Map<string, number>(), pairs = new Map<string, number>()
  for (const items of bills.map(list => new Set(list))) for (const item of items) single.set(item, (single.get(item) ?? 0) + 1)
  for (const items of usable) {
    items.sort()
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      const key = `${items[i]}|${items[j]}`
      pairs.set(key, (pairs.get(key) ?? 0) + 1)
    }
  }
  const minTogether = options.minTogether ?? Math.max(5, Math.ceil(total * 0.003))
  const result: BasketPair[] = []
  for (const [key, together] of pairs) {
    if (together < minTogether) continue
    const [a, b] = key.split('|'), countA = single.get(a) ?? 1, countB = single.get(b) ?? 1
    const lift = (together * total) / (countA * countB)
    if (lift < 1.5) continue
    // Read as "of the bills with the less common item, this share also had the other".
    const [lead, other, leadCount] = countA <= countB ? [a, b, countA] : [b, a, countB]
    result.push({ a: lead, b: other, together, confidence: round2(together / leadCount), lift: round2(lift) })
  }
  return result.sort((x, y) => y.lift * Math.log(1 + y.together) - x.lift * Math.log(1 + x.together)).slice(0, options.limit ?? 8)
}

// ---------------------------------------------------------------- slow hours
// weeks: how many weeks the cells cover; days: distinct days with sales in that cell.
export type HourCell = { weekday: number; hour: number; days: number; total: number }
export type SlowSlot = { weekdays: number[]; fromHour: number; toHour: number; share: number }
const DAY_GROUPS = [[1, 2, 3, 4, 5], [0, 6]]

// Hours the store is usually open on weekdays (or weekends) whose sales are well below
// that group's average open hour. Weekdays and weekends are judged as groups, which is
// steadier than single days and easier to act on. Neighbouring slow hours are joined.
export function slowHours(cells: HourCell[], weeks: number, threshold = 0.45): SlowSlot[] {
  const slots: SlowSlot[] = []
  for (const group of DAY_GROUPS) {
    const possible = weeks * group.length
    const byHour = new Map<number, { days: number; total: number }>()
    for (const cell of cells) {
      if (!group.includes(cell.weekday)) continue
      const entry = byHour.get(cell.hour) ?? { days: 0, total: 0 }
      entry.days += cell.days; entry.total += cell.total
      byHour.set(cell.hour, entry)
    }
    // Opening hours: from the first to the last hour that has sales on most days. A slow
    // hour inside that span counts even if it often has no sale at all.
    const regular = [...byHour].filter(([, entry]) => entry.days >= possible / 2).map(([hour]) => hour)
    if (regular.length < 4) continue
    const first = Math.min(...regular), last = Math.max(...regular)
    const open = Array.from({ length: last - first + 1 }, (_, index) => [first + index, byHour.get(first + index) ?? { days: 0, total: 0 }] as const)
    const average = mean(open.map(([, entry]) => entry.total / possible))
    const slow = open.filter(([, entry]) => entry.total / possible < average * threshold).sort((a, b) => a[0] - b[0])
    for (const [hour, entry] of slow) {
      const share = entry.total / possible / average, previous = slots[slots.length - 1]
      if (previous && previous.weekdays === group && previous.toHour === hour) { previous.toHour = hour + 1; previous.share = round2((previous.share + share) / 2) }
      else slots.push({ weekdays: group, fromHour: hour, toHour: hour + 1, share: round2(share) })
    }
  }
  return slots.sort((a, b) => a.share - b.share).slice(0, 5)
}

// ---------------------------------------------------------------- price check
export type PriceInput = { latestCost: number; previousCost: number; salePrice: number; mrp: number }
export type PriceSuggestion = { marginWas: number; marginNow: number; suggestedPrice: number }

// When the purchase rate went up, the price that restores the earlier margin, kept at or
// under MRP and rounded to the rupee. Null when the margin did not fall by 3 points.
export function suggestPrice(input: PriceInput): PriceSuggestion | null {
  if (input.salePrice <= 0 || input.latestCost <= 0 || input.previousCost <= 0 || input.latestCost <= input.previousCost) return null
  const marginWas = (input.salePrice - input.previousCost) / input.salePrice
  const marginNow = (input.salePrice - input.latestCost) / input.salePrice
  if (marginWas - marginNow < 0.03 || marginWas <= 0 || marginWas >= 0.95) return null
  let price = Math.ceil(input.latestCost / (1 - marginWas))
  if (input.mrp > 0) price = Math.min(price, Math.floor(input.mrp))
  if (price <= input.salePrice) return null
  return { marginWas: round2(marginWas * 100), marginNow: round2(marginNow * 100), suggestedPrice: price }
}
