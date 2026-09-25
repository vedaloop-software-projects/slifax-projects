import type { LabelTemplate } from '../types'

export type LayoutTemplate = Pick<LabelTemplate, 'widthMm' | 'heightMm' | 'orientation' | 'marginsMm' | 'fieldGapMm' | 'rowGapMm' | 'mediaMode'> & Partial<Pick<LabelTemplate, 'fields'>>

/** Content box shared by the designer, browser/PDF output and PRN renderers. */
export function labelContentBox(template: LayoutTemplate) {
  if (template.rowGapMm !== undefined && (!Number.isFinite(template.rowGapMm) || template.rowGapMm < 0 || template.rowGapMm > 25)) throw new Error('Feed gap must be between 0 and 25 mm.')
  if (template.mediaMode !== 'CONTINUOUS' && template.rowGapMm === 0) throw new Error('Sticker rolls need a positive feed gap. Enter the measured gap between rows; 0 mm disables gap tracking. Use Continuous only for uncut media.')
  const portrait = template.orientation === 'PORTRAIT'
  const width = portrait ? Math.min(template.widthMm, template.heightMm) : Math.max(template.widthMm, template.heightMm)
  const height = portrait ? Math.max(template.widthMm, template.heightMm) : Math.min(template.widthMm, template.heightMm)
  const inset = height / 25 * 1.1
  const margins = template.marginsMm ?? { top: inset, right: inset, bottom: inset, left: inset }
  const gap = template.fieldGapMm ?? 0
  if (![width, height].every((v) => Number.isFinite(v) && v > 0)) throw new Error('Label dimensions must be positive.')
  if (![margins.top, margins.right, margins.bottom, margins.left, gap].every((v) => Number.isFinite(v) && v >= 0)) throw new Error('Margins and field spacing must be zero or greater.')
  const contentWidth = width - margins.left - margins.right
  const contentHeight = height - margins.top - margins.bottom
  if (contentWidth < 5 || contentHeight < 5) throw new Error('Leave at least 5 mm of content width and height. Reduce the margins or enlarge the label.')
  const f = template.fields
  if (f) {
    const rows = [f.shopName, f.address, f.productName, f.mrp || f.salePrice, f.barcode || f.productCode, f.packedDate || f.expiryDate || f.batchCode].filter(Boolean).length
    if (rows + Math.max(0, rows - 1) * gap > contentHeight) throw new Error('Field spacing leaves too little room for the content. Reduce spacing or margins.')
  }
  return { width, height, margins, gap, contentWidth, contentHeight }
}
