// Stock movement register. Movements come from the documents that change stock; the
// opening and closing balances are worked back from the current quantity, so
// OB + movements = CB always holds even where history (product edits, imports)
// changed stock without a document.

export type MovementKind = 'stockIn' | 'freeIn' | 'stockOut' | 'adjust' | 'sales' | 'freeSales' | 'refund'
// day is the business date as YYYY-MM-DD; qty is positive except signed adjustments.
export type StockMovement = { variantId: bigint; day: string; kind: MovementKind; qty: number }
export type MovementVariant = {
  productId: bigint; variantId: bigint; productCode: string; variantCode: string; productName: string
  category: string; subCategory: string; brand: string; currentQty: number
}
export type StockMovementSource = { variants: MovementVariant[]; movements: StockMovement[]; truncated: boolean }

const KINDS: MovementKind[] = ['stockIn', 'freeIn', 'stockOut', 'adjust', 'sales', 'freeSales', 'refund']
type Totals = Record<MovementKind, number>
const empty = (): Totals => ({ stockIn: 0, freeIn: 0, stockOut: 0, adjust: 0, sales: 0, freeSales: 0, refund: 0 })
const net = (t: Totals) => t.stockIn + t.freeIn - t.stockOut + t.adjust - t.sales - t.freeSales + t.refund
const round = (value: number) => Math.round((value + Number.EPSILON) * 1000) / 1000
const display = (day: string) => day.split('-').reverse().join('-')
const columns = (opening: number, t: Totals) => ({
  openingBalance: round(opening), stockIn: round(t.stockIn), freeQty: round(t.freeIn), stockOut: round(t.stockOut), stockAdjust: round(t.adjust),
  sales: round(t.sales), freeSales: round(t.freeSales), refund: round(t.refund), closingBalance: round(opening + net(t)),
})

export function stockMovementRows(source: StockMovementSource, fromDay: string, toDay: string, reportType: 'summary' | 'detailed') {
  const byVariant = new Map<bigint, { inRange: Map<string, Totals>; after: Totals }>()
  for (const move of source.movements) {
    if (move.day < fromDay) continue
    const entry = byVariant.get(move.variantId) ?? { inRange: new Map<string, Totals>(), after: empty() }
    byVariant.set(move.variantId, entry)
    const bucket = move.day > toDay ? entry.after : entry.inRange.get(move.day) ?? empty()
    if (move.day <= toDay) entry.inRange.set(move.day, bucket)
    bucket[move.kind] += move.qty
  }
  const detail: Array<Record<string, unknown>> = []
  const summary = new Map<string, { category: string; subCategory: string; brand: string; opening: number; totals: Totals }>()
  for (const variant of source.variants) {
    const entry = byVariant.get(variant.variantId)
    const days = [...(entry?.inRange ?? new Map<string, Totals>())].sort(([a], [b]) => a.localeCompare(b))
    const closing = variant.currentQty - net(entry?.after ?? empty())
    let opening = closing - days.reduce((sum, [, totals]) => sum + net(totals), 0)
    const key = JSON.stringify([variant.category, variant.subCategory, variant.brand])
    const group = summary.get(key) ?? { category: variant.category, subCategory: variant.subCategory, brand: variant.brand, opening: 0, totals: empty() }
    summary.set(key, group)
    group.opening += opening
    for (const [day, totals] of days) {
      for (const kind of KINDS) group.totals[kind] += totals[kind]
      detail.push({ date: display(day), sortDay: day, itemCode: variant.productCode, variantCode: variant.variantCode, variantId: Number(variant.variantId), itemName: variant.productName, ...columns(opening, totals) })
      opening += net(totals)
    }
  }
  const rows = reportType === 'summary'
    ? [...summary.values()].sort((a, b) => a.category.localeCompare(b.category) || a.subCategory.localeCompare(b.subCategory) || a.brand.localeCompare(b.brand))
      .map(group => ({ category: group.category, subCategory: group.subCategory, brand: group.brand, ...columns(group.opening, group.totals) }))
    : detail.sort((a, b) => String(a.sortDay).localeCompare(String(b.sortDay)) || String(a.itemName).localeCompare(String(b.itemName)) || Number(a.variantId) - Number(b.variantId))
      .map(({ sortDay: _sortDay, ...row }) => row)
  // Balances only add up across products in the summary; detail totals are movements only.
  const all = [...summary.values()], totals = empty()
  for (const group of all) for (const kind of KINDS) totals[kind] += group.totals[kind]
  const sum = columns(all.reduce((value, group) => value + group.opening, 0), totals)
  return { rows: rows.map((row, index) => ({ id: index + 1, ...row })), totals: reportType === 'summary' ? sum : { ...sum, openingBalance: null, closingBalance: null } }
}
