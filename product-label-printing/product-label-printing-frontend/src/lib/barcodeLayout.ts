import JsBarcode from 'jsbarcode'

/** Rasterise the same barcode used by the preview to the available printer dots. */
export function barcodeBars(value: string, format: 'CODE128' | 'EAN13', width: number) {
  const result: { encodings?: { data: string }[] } = {}
  JsBarcode(result, value, { format, displayValue: false, margin: 0 })
  const bits = result.encodings?.map((part) => part.data).join('') ?? ''
  const modules = bits.length + 20 // ten blank modules at each end
  if (!bits || !Number.isFinite(width) || width < modules) throw new Error('Barcode does not fit inside the side margins. Reduce margins or use a wider label.')
  const unit = width / modules
  const bars: { x: number; width: number }[] = []
  for (let i = 0; i < bits.length;) {
    if (bits[i] !== '1') { i++; continue }
    const start = i
    while (bits[i] === '1') i++
    const x = Math.round((start + 10) * unit)
    bars.push({ x, width: Math.round((i + 10) * unit) - x })
  }
  return bars
}
