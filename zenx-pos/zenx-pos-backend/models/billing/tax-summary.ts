export function groupTaxBreakup(rows: Array<{ tax_percentage: unknown; amount: unknown; tax_amount: unknown }>) {
  const grouped = new Map<number, { taxPercentage: number; gstAmount: number; taxableAmount: number }>()
  for (const row of rows) {
    const rate = Number(row.tax_percentage), gst = Number(row.amount), taxable = Number(row.tax_amount)
    if (![rate, gst, taxable].every(Number.isFinite)) throw new Error('Invalid saved tax breakup.')
    const current = grouped.get(rate) ?? { taxPercentage: rate, gstAmount: 0, taxableAmount: 0 }
    current.gstAmount += gst; current.taxableAmount += taxable; grouped.set(rate, current)
  }
  return [...grouped.values()].sort((a, b) => a.taxPercentage - b.taxPercentage)
}

// Node writes 1 sale, 4 refund, 5 cancelled; Laravel-era rows use 3 for refund/cancel.
const billModeNames: Record<number, string> = { 1: 'Sale', 2: 'Sale', 3: 'Refund/Cancelled (legacy)', 4: 'Refund', 5: 'Cancelled' }
export function billModeName(mode: number) { return billModeNames[mode] ?? `Mode ${mode}` }

export function taxBreakupSummary(grouped: Array<{ taxPercentage: number; gstAmount: number; taxableAmount: number }>) {
  const details = grouped.map(row => ({ ...row, total: row.gstAmount + row.taxableAmount }))
  const totalGstAmount = details.reduce((sum, row) => sum + row.gstAmount, 0), totalTaxable = details.reduce((sum, row) => sum + row.taxableAmount, 0)
  return { details, totalGstAmount, totalTaxable, grandTotal: totalGstAmount + totalTaxable }
}
