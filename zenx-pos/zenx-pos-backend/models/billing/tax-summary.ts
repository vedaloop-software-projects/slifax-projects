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
