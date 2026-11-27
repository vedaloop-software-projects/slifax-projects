import { createHash } from 'node:crypto'
import { z } from 'zod'
import type { Account } from '../../models/auth/contracts.ts'
import { businessCalendarDay, zonedTime } from '../../models/system/business-time.ts'
import { AI_FEATURES, isAiFeature, type AiCreditStore, type AiFeature } from '../../models/ai/credits.ts'
import type { AiDataStore } from '../../models/ai/data-store.ts'
import { daysOfCover, demandReason, fitDemand, forecastDays, forecastTotal, HISTORY_DAYS, WEEKDAYS } from '../../models/ai/forecast.ts'
import { boughtTogether, GROUP_LABELS, scoreCustomers, slowHours, suggestPrice, unusualActivity, type CustomerGroup, type HourCell } from '../../models/ai/insights.ts'
import { draftProduct, ProductModel, type ProductDraft } from '../../models/ai/product-model.ts'
import { ApiError } from '../auth/service.ts'

// ZenxPOS AI: runs a feature, takes its credits from the store's daily allowance and
// returns one result format (headline, cards, tables, notes) the app renders as is.

export type Column = { key: string; label: string; align?: 'right' }
export type Section = { title: string; note?: string; columns: Column[]; rows: Record<string, string | number>[] }
export type AiResult = {
  headline: string
  cards?: { label: string; value: string; hint?: string; tone?: 'good' | 'bad' | 'warn' }[]
  sections?: Section[]
  notes?: string[]
  draft?: ProductDraft
  reorder?: unknown
  actions?: { label: string; screen: string; params?: Record<string, unknown> }[]
  // False when there was nothing to analyse; such runs are not charged.
  chargeable: boolean
}
export type ReorderInput = { method: 'forecast'; supplierId: bigint | null; coverageDays: number; leadTimeDays: number | null; includePendingPo: boolean; includePendingGrn: boolean; categoryId: bigint | null; subCategoryId: bigint | null; brandId: bigint | null; productId: bigint | null; forecast: Map<bigint, { qty: number; days: number; reason: string }> }
export type ReorderRunner = (clientId: bigint, input: ReorderInput) => Promise<{ rows: unknown[] }>

const DAY = 86_400_000
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const iso = (date: Date) => date.toISOString().slice(0, 10)
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY)
const dateLabel = (date: Date) => `${WEEKDAYS[date.getUTCDay()].slice(0, 3)} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`
const rupees = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`
const qty = (value: number) => Number.isInteger(value) ? String(value) : value.toFixed(value < 10 ? 2 : 1).replace(/\.?0+$/, '')
const percent = (value: number) => `${value > 0 ? '+' : ''}${Math.round(value * 100)}%`
const hourLabel = (hour: number) => `${hour % 12 || 12} ${hour < 12 || hour === 24 ? 'am' : 'pm'}`
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`
const itemName = (row: { name: string; packSize: string }) => /[a-z]/i.test(row.packSize) && !row.name.toLowerCase().replace(/\s/g, '').includes(row.packSize.toLowerCase().replace(/\s/g, '')) ? `${row.name} ${row.packSize}` : row.name

const optionalId = z.union([z.coerce.bigint().positive(), z.literal(''), z.null()]).optional().transform(value => value === '' || value === undefined ? null : value)
const schemas = {
  productFill: z.object({ name: z.string().trim().min(3, 'Type at least 3 letters of the product name.').max(150, 'Keep the name under 150 characters.') }),
  dayCheck: z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a valid date.').optional() }),
  smartReorder: z.object({
    supplierId: optionalId, coverageDays: z.coerce.number().int().min(1, 'Cover at least 1 day.').max(365).default(15),
    leadTimeDays: z.union([z.coerce.number().int().min(0).max(365), z.literal(''), z.null()]).optional().transform(value => value === '' || value === undefined ? null : value),
    includePendingPo: z.coerce.boolean().default(true), includePendingGrn: z.coerce.boolean().default(false),
    categoryId: optionalId, subCategoryId: optionalId, brandId: optionalId, productId: optionalId,
  }),
}

export class AiService {
  private readonly credits: AiCreditStore
  private readonly data: AiDataStore
  private readonly reorder: ReorderRunner
  private readonly clock: () => Date
  constructor(stores: { credits: AiCreditStore; data: AiDataStore; reorder: ReorderRunner }, clock: () => Date = () => new Date()) {
    this.credits = stores.credits; this.data = stores.data; this.reorder = stores.reorder; this.clock = clock
  }

  // Today's allowance, what is left and what used it.
  async status(account: Account) {
    const now = this.clock(), day = businessCalendarDay(now)
    const [daily, usage] = await Promise.all([this.data.dailyCredits(account.client.id), this.credits.usage(account.client.id, day)])
    return this.summary(daily, usage, day)
  }

  private summary(daily: number, usage: { feature: string; runs: number; credits: number }[], day: Date) {
    const used = usage.reduce((sum, row) => sum + row.credits, 0)
    return {
      daily, used, left: Math.max(0, daily - used), day: iso(day),
      usage: usage.map(row => ({ ...row, label: isAiFeature(row.feature) ? AI_FEATURES[row.feature].label : row.feature })).sort((a, b) => b.credits - a.credits),
      costs: Object.fromEntries(Object.entries(AI_FEATURES).map(([key, value]) => [key, value.credits])),
    }
  }

  async run(account: Account, feature: string, body: unknown) {
    if (!isAiFeature(feature)) throw new ApiError(404, 'This ZenxPOS AI feature does not exist.')
    const clientId = account.client.id, now = this.clock(), day = businessCalendarDay(now)
    const daily = await this.data.dailyCredits(clientId)
    if (daily <= 0) throw new ApiError(403, 'ZenxPOS AI is not switched on for your store. Contact ZenxPOS support.')
    const input = this.parse(feature, body)
    const inputKey = createHash('sha256').update(JSON.stringify(input, (_key, value) => typeof value === 'bigint' ? String(value) : value)).digest('hex')
    const cost = AI_FEATURES[feature].credits
    const before = await this.credits.usage(clientId, day)
    const usedBefore = before.reduce((sum, row) => sum + row.credits, 0)
    const repeat = await this.credits.hasRun(clientId, day, feature, inputKey)
    if (!repeat && usedBefore + cost > daily) throw new ApiError(429, this.shortMessage(cost, daily - usedBefore))

    const result = await this.compute(feature, input, clientId, now, day)
    let charged = 0
    if (result.chargeable && !repeat) {
      const outcome = await this.credits.charge({ clientId, userId: account.user.id, day, feature, inputKey, credits: cost, daily, now })
      if (outcome === 'short') throw new ApiError(429, this.shortMessage(cost, Math.max(0, daily - usedBefore - cost)))
      if (outcome === 'charged') charged = cost
    }
    const usage = await this.credits.usage(clientId, day)
    return { feature, result, charged, repeat, credits: this.summary(daily, usage, day) }
  }

  private shortMessage(cost: number, left: number) {
    return `This needs ${plural(cost, 'credit')} and ${left <= 0 ? 'none are' : `only ${left} ${left === 1 ? 'is' : 'are'}`} left today. ZenxPOS AI credits refresh at midnight.`
  }

  private parse(feature: AiFeature, body: unknown) {
    const schema = (schemas as Record<string, z.ZodType>)[feature]
    if (!schema) return {}
    const parsed = schema.safeParse(body ?? {})
    if (!parsed.success) throw new ApiError(422, parsed.error.issues[0]?.message ?? 'Check the details and try again.')
    return parsed.data as Record<string, unknown>
  }

  private compute(feature: AiFeature, input: Record<string, unknown>, clientId: bigint, now: Date, today: Date): Promise<AiResult> {
    switch (feature) {
      case 'productFill': return this.productFill(clientId, String(input.name))
      case 'stockAlerts': return this.stockAlerts(clientId, now, today)
      case 'customerGroups': return this.customerGroups(clientId, now, today)
      case 'dailyBrief': return this.dailyBrief(clientId, now, today)
      case 'dayCheck': return this.dayCheck(clientId, now, today, input.date ? new Date(`${input.date}T00:00:00Z`) : today)
      case 'offerIdeas': return this.offerIdeas(clientId, now, today)
      case 'priceCheck': return this.priceCheck(clientId, today)
      case 'smartReorder': return this.smartReorder(clientId, now, today, input as z.infer<typeof schemas.smartReorder>)
      case 'prepForecast': return this.prepForecast(clientId, now, today)
    }
  }

  // The instant the local day `daysBack` days before `today` starts.
  private since(today: Date, daysBack: number) { return zonedTime(today.getUTCFullYear(), today.getUTCMonth() + 1, today.getUTCDate() - daysBack) }

  // ------------------------------------------------------------ product creation
  private modelCache = new Map<bigint, { at: number; size: number; model: ProductModel }>()
  private async productFill(clientId: bigint, name: string): Promise<AiResult> {
    const masters = await this.data.draftMasters(clientId)
    const cached = this.modelCache.get(clientId)
    const model = cached && cached.size === masters.products.length && Date.now() - cached.at < 10 * 60_000 ? cached.model : new ProductModel(masters.products)
    this.modelCache.set(clientId, { at: Date.now(), size: masters.products.length, model })
    const draft = draftProduct(name, masters, masters.products, model)
    const ok = draft.confidence !== 'low'
    return {
      headline: ok ? `${draft.category?.name}${draft.subCategory ? ` › ${draft.subCategory.name}` : ''}${draft.brand ? ` · ${draft.brand.name}` : ''}` : 'Could not tell what this product is.',
      draft, notes: draft.notes, chargeable: ok,
    }
  }

  // ------------------------------------------------------------ stock alerts
  private async demand(clientId: bigint, now: Date, today: Date, variantIds?: number[]) {
    const days = Array.from({ length: HISTORY_DAYS }, (_, index) => iso(addDays(today, index - HISTORY_DAYS)))
    const position = new Map(days.map((value, index) => [value, index]))
    const series = new Map<number, number[]>()
    for (const row of await this.data.itemDays(clientId, this.since(today, HISTORY_DAYS), now, variantIds)) {
      const index = position.get(row.day)
      if (index === undefined) continue
      const values = series.get(row.variantId) ?? new Array<number>(HISTORY_DAYS).fill(0)
      values[index] += row.qty
      series.set(row.variantId, values)
    }
    const firstWeekday = addDays(today, -HISTORY_DAYS).getUTCDay()
    return new Map([...series].map(([variantId, values]) => [variantId, fitDemand(values, firstWeekday)]))
  }

  private async stockScan(clientId: bigint, now: Date, today: Date) {
    const [models, variants, lastSales] = await Promise.all([this.demand(clientId, now, today), this.data.variants(clientId), this.data.lastSales(clientId, this.since(today, 365), now)])
    const weekday = today.getUTCDay(), deadBefore = iso(addDays(today, -60))
    const runningOut: { name: string; stock: number; daily: number; days: number }[] = []
    const dead: { name: string; stock: number; value: number; last: string | null }[] = []
    for (const variant of variants) {
      const model = models.get(variant.variantId)
      const recent = model ? forecastTotal(model, weekday, 7) / 7 : 0
      if (model && recent >= 0.05) {
        const cover = daysOfCover(model, variant.stock, weekday)
        if (cover !== null && cover <= 7) runningOut.push({ name: itemName(variant), stock: variant.stock, daily: recent, days: cover })
      }
      const last = lastSales.get(variant.variantId) ?? null
      const old = !variant.createdAt || iso(variant.createdAt) < deadBefore
      if (variant.stock > 0 && old && (!last || last < deadBefore)) dead.push({ name: itemName(variant), stock: variant.stock, value: variant.stock * variant.costPrice, last })
    }
    runningOut.sort((a, b) => a.days - b.days || b.daily - a.daily)
    dead.sort((a, b) => b.value - a.value)
    return { runningOut, dead, variants: variants.length, selling: models.size }
  }

  private async stockAlerts(clientId: bigint, now: Date, today: Date): Promise<AiResult> {
    const scan = await this.stockScan(clientId, now, today)
    const out = scan.runningOut.filter(row => row.days === 0), soon = scan.runningOut.filter(row => row.days > 0)
    const deadValue = scan.dead.reduce((sum, row) => sum + row.value, 0)
    const notes = scan.selling ? [] : ['No sales in the last 8 weeks, so there is nothing to forecast yet.']
    return {
      headline: scan.runningOut.length ? `${plural(soon.length, 'item')} will run out within a week${out.length ? `, ${out.length} already out of stock` : ''}.` : 'Nothing is expected to run out this week.',
      cards: [
        { label: 'Runs out in 7 days', value: String(soon.length), tone: soon.length ? 'warn' : 'good' },
        { label: 'Out of stock, still selling', value: String(out.length), tone: out.length ? 'bad' : 'good' },
        { label: 'Dead stock', value: rupees(deadValue), hint: `${plural(scan.dead.length, 'item')}, no sale in 60 days`, tone: scan.dead.length ? 'warn' : 'good' },
      ],
      sections: [
        { title: 'Running out', columns: [{ key: 'item', label: 'Item' }, { key: 'stock', label: 'Stock', align: 'right' as const }, { key: 'daily', label: 'Sells / day', align: 'right' as const }, { key: 'runsOut', label: 'Runs out' }],
          rows: scan.runningOut.slice(0, 50).map(row => ({ item: row.name, stock: qty(row.stock), daily: qty(Math.round(row.daily * 10) / 10), runsOut: row.days === 0 ? 'Out of stock' : `${dateLabel(addDays(today, row.days))}, in ${plural(row.days, 'day')}` })) },
        { title: 'Dead stock', note: 'In stock with no sale in 60 days. Value at cost price.', columns: [{ key: 'item', label: 'Item' }, { key: 'stock', label: 'Stock', align: 'right' as const }, { key: 'value', label: 'Value', align: 'right' as const }, { key: 'last', label: 'Last sale' }],
          rows: scan.dead.slice(0, 50).map(row => ({ item: row.name, stock: qty(row.stock), value: rupees(row.value), last: row.last ? dateLabel(new Date(`${row.last}T00:00:00Z`)) : 'Not in the last year' })) },
      ].filter(section => section.rows.length),
      notes, actions: soon.length || out.length ? [{ label: 'Reorder with AI forecast', screen: 'PurchaseOrderScreen', params: { open: 'auto', method: 'forecast' } }] : [],
      chargeable: scan.variants > 0,
    }
  }

  // ------------------------------------------------------------ AI reorder (Auto PO)
  private async smartReorder(clientId: bigint, now: Date, today: Date, input: z.infer<typeof schemas.smartReorder>): Promise<AiResult> {
    const models = await this.demand(clientId, now, today)
    const forecast = new Map<bigint, { qty: number; days: number; reason: string }>()
    for (const [variantId, model] of models) forecast.set(BigInt(variantId), { qty: forecastTotal(model, today.getUTCDay(), 28), days: 28, reason: demandReason(model) })
    const reorder = await this.reorder(clientId, { method: 'forecast', ...input, forecast })
    const count = reorder.rows.filter(row => (row as { suggestedQty: number }).suggestedQty > 0).length
    return { headline: models.size ? `${plural(count, 'item')} to reorder, from the sales forecast.` : 'No sales in the last 8 weeks to forecast from.', reorder, chargeable: models.size > 0 }
  }

  // ------------------------------------------------------------ customer groups
  private async customerGroups(clientId: bigint, now: Date, today: Date): Promise<AiResult> {
    const rows = await this.data.customerDays(clientId, this.since(today, 365), now)
    const scores = scoreCustomers(rows.map(row => ({ customerId: String(row.customerId), daysAgo: Math.round((today.getTime() - new Date(`${row.day}T00:00:00Z`).getTime()) / DAY), amount: row.amount })))
    const people = await this.data.customers(clientId, scores.map(score => Number(score.customerId)))
    const order: CustomerGroup[] = ['loyal', 'regular', 'new', 'at_risk', 'lost']
    const groups = order.map(group => ({ group, members: scores.filter(score => score.group === group).sort((a, b) => b.valueYear - a.valueYear) }))
    const list = (group: CustomerGroup, title: string, note: string) => {
      const members = groups.find(entry => entry.group === group)!.members
      return { title, note, columns: [{ key: 'name', label: 'Customer' }, { key: 'mobile', label: 'Mobile' }, { key: 'last', label: 'Last visit' }, { key: 'gap', label: 'Usually every', align: 'right' as const }, { key: 'avg', label: 'Average bill', align: 'right' as const }],
        rows: members.slice(0, 30).map(member => ({ name: people.get(Number(member.customerId))?.name ?? 'Customer', mobile: people.get(Number(member.customerId))?.mobile ?? '', last: `${member.lastVisitDaysAgo} days ago`, gap: member.usualGapDays ? `${Math.round(member.usualGapDays)} days` : '—', avg: rupees(member.averageBill) })) }
    }
    const atRisk = groups.find(entry => entry.group === 'at_risk')!.members
    return {
      headline: scores.length ? `${plural(atRisk.length, 'customer')} missed their usual visit. Win them back before they are lost.` : 'No bills with a customer in the last year.',
      cards: groups.map(({ group, members }) => ({ label: GROUP_LABELS[group].split(':')[0], value: String(members.length), hint: rupees(members.reduce((sum, member) => sum + member.value90, 0)) + ' in 90 days', tone: group === 'at_risk' || group === 'lost' ? (members.length ? 'warn' as const : 'good' as const) : undefined })),
      sections: [list('at_risk', 'At risk: missed their usual visit', 'Act now: a WhatsApp offer brings most of them back.'), list('loyal', 'Loyal', 'Four or more visits and still coming.'), list('lost', 'Lost: no visit in 90 days', '')].filter(section => section.rows.length),
      actions: atRisk.length ? [{ label: `Send a WhatsApp offer to ${plural(atRisk.length, 'customer')}`, screen: 'WhatsAppScreen', params: { customers: atRisk.slice(0, 500).map(member => ({ id: Number(member.customerId), ...(people.get(Number(member.customerId)) ?? { name: 'Customer', mobile: '' }) })) } }] : [],
      notes: scores.length ? ['Only bills with a customer selected are counted.'] : [], chargeable: scores.length > 0,
    }
  }

  // ------------------------------------------------------------ daily brief
  private async dailyBrief(clientId: bigint, now: Date, today: Date): Promise<AiResult> {
    const hours = await this.data.hourTotals(clientId, this.since(today, HISTORY_DAYS), now)
    const daily = new Map<string, number>()
    for (const row of hours) daily.set(row.day, (daily.get(row.day) ?? 0) + row.amount)
    const history = Array.from({ length: HISTORY_DAYS }, (_, index) => daily.get(iso(addDays(today, index - HISTORY_DAYS))) ?? 0)
    if (!history.some(value => value > 0)) return { headline: 'No sales in the last 8 weeks yet, so there is nothing to brief on.', chargeable: false }
    const yesterday = addDays(today, -1), yesterdayTotal = daily.get(iso(yesterday)) ?? 0
    const usualDays = [7, 14, 21, 28].map(back => daily.get(iso(addDays(yesterday, -back))) ?? 0).filter(value => value > 0)
    const usual = usualDays.length ? usualDays.reduce((sum, value) => sum + value, 0) / usualDays.length : 0
    const model = fitDemand(history, addDays(today, -HISTORY_DAYS).getUTCDay())
    const expected = forecastDays(model, today.getUTCDay(), 1)[0]
    const soFar = daily.get(iso(today)) ?? 0
    // Busiest two hours on this weekday over the last four weeks.
    const sameDays = new Set([7, 14, 21, 28].map(back => iso(addDays(today, -back))))
    const byHour = new Map<number, number>()
    for (const row of hours) if (sameDays.has(row.day)) byHour.set(row.hour, (byHour.get(row.hour) ?? 0) + row.amount)
    let peak = -1, peakValue = 0
    for (let hour = 0; hour < 23; hour++) { const value = (byHour.get(hour) ?? 0) + (byHour.get(hour + 1) ?? 0); if (value > peakValue) { peak = hour; peakValue = value } }
    const scan = await this.stockScan(clientId, now, today)
    const check = await this.activity(clientId, now, yesterday)
    const actOn = [
      ...scan.runningOut.slice(0, 3).map(row => ({ what: row.days === 0 ? 'Out of stock' : 'Running out', detail: row.days === 0 ? `${row.name} is out of stock and still selling ${qty(Math.round(row.daily * 10) / 10)} a day` : `${row.name} runs out by ${dateLabel(addDays(today, row.days))}` })),
      ...check.alerts.slice(0, 2).map(alert => ({ what: 'Unusual yesterday', detail: `${alert.person}: ${alert.label.toLowerCase()} ${alert.money ? rupees(alert.today) : alert.today}, usually ${alert.money ? rupees(alert.usual) : qty(Math.round(alert.usual * 10) / 10)}` })),
      ...(scan.dead.length ? [{ what: 'Dead stock', detail: `${plural(scan.dead.length, 'item')} worth ${rupees(scan.dead.reduce((sum, row) => sum + row.value, 0))} ${scan.dead.length === 1 ? 'has' : 'have'} not sold in 60 days` }] : []),
    ]
    const weekday = WEEKDAYS[yesterday.getUTCDay()]
    const change = usual > 0 ? yesterdayTotal / usual - 1 : null
    return {
      headline: change === null ? `Yesterday's sales were ${rupees(yesterdayTotal)}.` : `Yesterday's sales were ${rupees(yesterdayTotal)}, ${Math.abs(change) < 0.05 ? 'about a usual' : `${Math.round(Math.abs(change) * 100)}% ${change > 0 ? 'above' : 'below'} a usual`} ${weekday}.`,
      cards: [
        { label: 'Yesterday', value: rupees(yesterdayTotal), hint: change === null ? undefined : `${percent(change)} vs a usual ${weekday}`, tone: change === null ? undefined : change >= 0 ? 'good' : 'bad' },
        { label: 'Expected today', value: rupees(expected), hint: 'Forecast from the last 8 weeks' },
        { label: 'So far today', value: rupees(soFar), hint: expected > 0 ? `${Math.round(soFar / expected * 100)}% of expected` : undefined },
        ...(peak >= 0 ? [{ label: 'Busiest hours', value: `${hourLabel(peak)}–${hourLabel(peak + 2)}`, hint: `on ${WEEKDAYS[today.getUTCDay()]}s` }] : []),
      ],
      sections: actOn.length ? [{ title: 'Act on today', columns: [{ key: 'what', label: '' }, { key: 'detail', label: '' }], rows: actOn }] : [],
      notes: actOn.length ? [] : ['Nothing needs attention today.'], chargeable: true,
    }
  }

  // ------------------------------------------------------------ unusual activity
  private async activity(clientId: bigint, now: Date, day: Date) {
    const rows = await this.data.userDays(clientId, this.since(day, 30), now)
    const target = iso(day)
    const people = [...new Set(rows.filter(row => row.day === target).map(row => row.userId))]
    const names = await this.data.userNames(clientId, people)
    const alerts = people.flatMap(userId => {
      const mine = rows.filter(row => row.userId === userId && row.day <= target)
      const current = mine.find(row => row.day === target)!, history = mine.filter(row => row.day < target)
      const metric = (key: 'cancelled' | 'refunds' | 'refundAmount' | 'discount' | 'voids', label: string, minimum: number, money = false) =>
        ({ key, label, today: current[key], history: history.map(row => row[key]), minimum, money })
      return unusualActivity([
        metric('cancelled', 'Bills cancelled', 3), metric('refunds', 'Refund bills', 3), metric('refundAmount', 'Refunded', 1000, true),
        metric('discount', 'Manual discount', 500, true), metric('voids', 'Items voided', 5),
      ]).map(alert => ({ ...alert, person: names.get(userId) ?? `User ${userId}` }))
    })
    return { alerts, people: people.length, active: rows.some(row => row.day === target) }
  }

  private async dayCheck(clientId: bigint, now: Date, today: Date, day: Date): Promise<AiResult> {
    if (day > today) throw new ApiError(422, 'Pick today or an earlier day.')
    const check = await this.activity(clientId, now, day)
    const label = dateLabel(day)
    if (!check.active) return { headline: `No bills on ${label} to check.`, chargeable: false }
    return {
      headline: check.alerts.length ? `${plural(check.alerts.length, 'thing')} out of the ordinary on ${label}.` : `Nothing unusual on ${label}.`,
      cards: [{ label: 'Alerts', value: String(check.alerts.length), tone: check.alerts.length ? 'bad' : 'good' }, { label: 'People checked', value: String(check.people) }],
      sections: check.alerts.length ? [{ title: 'Out of the ordinary', note: "Compared with each person's own last 30 days.", columns: [{ key: 'person', label: 'Person' }, { key: 'what', label: 'What' }, { key: 'today', label: label, align: 'right' as const }, { key: 'usual', label: 'Usual day', align: 'right' as const }],
        rows: check.alerts.map(alert => ({ person: alert.person, what: alert.label, today: alert.money ? rupees(alert.today) : qty(alert.today), usual: alert.money ? rupees(alert.usual) : qty(Math.round(alert.usual * 10) / 10) })) }] : [],
      notes: ['Checks cancelled bills, refunds, manual discounts and voided items.'], chargeable: true,
    }
  }

  // ------------------------------------------------------------ offer ideas
  private async offerIdeas(clientId: bigint, now: Date, today: Date): Promise<AiResult> {
    const [bills, hours] = await Promise.all([this.data.baskets(clientId, this.since(today, 90), 150_000), this.data.hourTotals(clientId, this.since(today, HISTORY_DAYS), now)])
    if (bills.length < 50) return { headline: 'Not enough bills yet: offer ideas need at least 50 bills in the last 90 days.', chargeable: false }
    const pairs = boughtTogether(bills.map(items => items.map(String)))
    const names = await this.data.productNames(clientId, [...new Set(pairs.flatMap(pair => [Number(pair.a), Number(pair.b)]))])
    const weeks = Math.round(HISTORY_DAYS / 7)
    const cells = new Map<string, HourCell>()
    for (const row of hours) {
      if (row.day >= iso(today)) continue
      const weekday = new Date(`${row.day}T00:00:00Z`).getUTCDay(), key = `${weekday}|${row.hour}`
      const cell = cells.get(key) ?? { weekday, hour: row.hour, days: 0, total: 0 }
      cell.total += row.amount; cell.days += 1
      cells.set(key, cell)
    }
    const slots = slowHours([...cells.values()], weeks)
    const dayNames = (days: number[]) => days.length === 5 ? 'Weekdays (Mon–Fri)' : days.length === 2 ? 'Weekends (Sat, Sun)' : days.map(value => WEEKDAYS[value].slice(0, 3)).join(', ')
    return {
      headline: pairs.length || slots.length ? `${plural(pairs.length, 'combo')} and ${plural(slots.length, 'slow slot')} found in ${bills.length.toLocaleString('en-IN')} bills.` : 'No strong combos or slow hours found.',
      sections: [
        { title: 'Combo ideas (Bill Buster)', note: 'Items bought together more often than chance.', columns: [{ key: 'combo', label: 'Combo' }, { key: 'together', label: 'Bills together', align: 'right' as const }, { key: 'share', label: 'How often' }],
          rows: pairs.map(pair => ({ combo: `${names.get(Number(pair.a)) ?? pair.a} + ${names.get(Number(pair.b)) ?? pair.b}`, together: pair.together, share: `${Math.round(pair.confidence * 100)}% of ${names.get(Number(pair.a)) ?? 'these'} bills, ${pair.lift}× chance` })) },
        { title: 'Slow hours (Happy Hour)', note: 'Hours the store is open but sells well below its average hour.', columns: [{ key: 'when', label: 'When' }, { key: 'hours', label: 'Hours' }, { key: 'sales', label: 'Sales' }],
          rows: slots.map(slot => ({ when: dayNames(slot.weekdays), hours: `${hourLabel(slot.fromHour)}–${hourLabel(slot.toHour)}`, sales: `${Math.round((1 - slot.share) * 100)}% below an average hour` })) },
      ].filter(section => section.rows.length),
      chargeable: true,
    }
  }

  // ------------------------------------------------------------ price check
  private async priceCheck(clientId: bigint, today: Date): Promise<AiResult> {
    const lines = await this.data.costLines(clientId, addDays(today, -365))
    if (!lines.length) return { headline: 'No posted purchase invoices in the last year to compare rates.', chargeable: false }
    const byVariant = new Map<number, { latest: number; latestDate: string; previous: number | null }>()
    for (const line of lines) {
      const entry = byVariant.get(line.variantId), date = iso(line.date)
      if (!entry) byVariant.set(line.variantId, { latest: line.rate, latestDate: date, previous: null })
      else if (entry.previous === null && date < entry.latestDate) entry.previous = line.rate
    }
    const variants = new Map((await this.data.variants(clientId, [...byVariant.keys()])).map(row => [row.variantId, row]))
    const rows = [...byVariant].flatMap(([variantId, cost]) => {
      const variant = variants.get(variantId)
      if (!variant || cost.previous === null) return []
      const suggestion = suggestPrice({ latestCost: cost.latest, previousCost: cost.previous, salePrice: variant.salePrice, mrp: variant.mrp })
      return suggestion ? [{ variant, cost, suggestion }] : []
    }).sort((a, b) => (b.suggestion.marginWas - b.suggestion.marginNow) - (a.suggestion.marginWas - a.suggestion.marginNow))
    return {
      headline: rows.length ? `${plural(rows.length, 'item')} lost margin after the purchase rate went up.` : 'No margins fell after rate changes.',
      sections: rows.length ? [{ title: 'Margin fell', note: 'Suggested price keeps the earlier margin and stays at or under MRP.', columns: [{ key: 'item', label: 'Item' }, { key: 'cost', label: 'Cost was → now' }, { key: 'margin', label: 'Margin was → now' }, { key: 'price', label: 'Price now', align: 'right' as const }, { key: 'suggested', label: 'Suggested', align: 'right' as const }],
        rows: rows.slice(0, 50).map(({ variant, cost, suggestion }) => ({ item: itemName(variant), cost: `${rupees(cost.previous!)} → ${rupees(cost.latest)}`, margin: `${Math.round(suggestion.marginWas)}% → ${Math.round(suggestion.marginNow)}%`, price: rupees(variant.salePrice), suggested: `${rupees(suggestion.suggestedPrice)}${variant.mrp ? ` (MRP ${rupees(variant.mrp)})` : ''}` })) }] : [],
      chargeable: true,
    }
  }

  // ------------------------------------------------------------ kitchen prep forecast
  private async prepForecast(clientId: bigint, now: Date, today: Date): Promise<AiResult> {
    const rows = await this.data.kotDays(clientId, this.since(today, HISTORY_DAYS), now)
    if (!rows.length) return { headline: 'No kitchen orders in the last 8 weeks to forecast from.', chargeable: false }
    const days = Array.from({ length: HISTORY_DAYS }, (_, index) => iso(addDays(today, index - HISTORY_DAYS)))
    const position = new Map(days.map((value, index) => [value, index]))
    const series = new Map<number, { lunch: number[]; dinner: number[] }>()
    for (const row of rows) {
      const index = position.get(row.day)
      if (index === undefined) continue
      const entry = series.get(row.productId) ?? { lunch: new Array<number>(HISTORY_DAYS).fill(0), dinner: new Array<number>(HISTORY_DAYS).fill(0) }
      entry.lunch[index] += row.lunch; entry.dinner[index] += row.dinner
      series.set(row.productId, entry)
    }
    const tomorrow = addDays(today, 1), first = addDays(today, -HISTORY_DAYS).getUTCDay()
    const plan = [...series].map(([productId, entry]) => {
      const lunch = Math.ceil(forecastDays(fitDemand(entry.lunch, first), tomorrow.getUTCDay(), 1)[0])
      const dinner = Math.ceil(forecastDays(fitDemand(entry.dinner, first), tomorrow.getUTCDay(), 1)[0])
      return { productId, lunch, dinner, total: lunch + dinner }
    }).filter(row => row.total > 0).sort((a, b) => b.total - a.total).slice(0, 40)
    const names = await this.data.productNames(clientId, plan.map(row => row.productId))
    return {
      headline: `Prep plan for ${WEEKDAYS[tomorrow.getUTCDay()]} ${dateLabel(tomorrow).slice(4)}: ${plural(plan.length, 'dish', )}.`.replace('dishs', 'dishes'),
      sections: [{ title: 'Expected orders', note: 'Lunch is before 4 pm.', columns: [{ key: 'dish', label: 'Dish' }, { key: 'lunch', label: 'Lunch', align: 'right' as const }, { key: 'dinner', label: 'Dinner', align: 'right' as const }, { key: 'total', label: 'Total', align: 'right' as const }],
        rows: plan.map(row => ({ dish: names.get(row.productId) ?? `Dish ${row.productId}`, lunch: row.lunch, dinner: row.dinner, total: row.total })) }],
      chargeable: true,
    }
  }
}
