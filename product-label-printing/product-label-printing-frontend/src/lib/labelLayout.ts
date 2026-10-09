import type { LabelTemplate } from '../types'

export type LayoutTemplate = Pick<LabelTemplate, 'widthMm' | 'heightMm' | 'orientation' | 'marginsMm' | 'fieldGapMm' | 'rowGapMm' | 'mediaMode'> & Partial<Pick<LabelTemplate, 'fields' | 'elements'>>

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
  // Free layouts place each element themselves; the stacked-rows fit check does not apply.
  if (f && !template.elements) {
    const rows = [f.shopName, f.address, f.productName, f.mrp || f.salePrice, f.barcode || f.productCode, f.packedDate || f.expiryDate || f.batchCode].filter(Boolean).length
    if (rows + Math.max(0, rows - 1) * gap > contentHeight) throw new Error('Field spacing leaves too little room for the content. Reduce spacing or margins.')
  }
  return { width, height, margins, gap, contentWidth, contentHeight }
}

type Margins = NonNullable<LabelTemplate['marginsMm']>

/**
 * Roll setup measured on the shop's printer (50 × 25 mm, 2 across): new templates start from
 * it, and its margins mark the safe print area. Admins may change it; they get warnings.
 */
export const RECOMMENDED_LAYOUT = {
  widthMm: 50,
  heightMm: 25,
  columns: 2 as const,
  orientation: 'LANDSCAPE' as const,
  gapMm: 0.5,
  rowGapMm: 0.1,
  fieldGapMm: 0,
  marginsMm: { top: 5, right: 0, bottom: 0, left: 5 } satisfies Margins,
}

/** Margins of the safe print area; templates saved before it existed get the recommended ones. */
export const safeMargins = (t: Pick<LabelTemplate, 'marginsMm'>): Margins => t.marginsMm ?? RECOMMENDED_LAYOUT.marginsMm

/** The part of the label (mm, from its top-left) the printer reliably prints. */
export function safeArea(t: Pick<LabelTemplate, 'widthMm' | 'heightMm' | 'orientation' | 'marginsMm'>) {
  const portrait = t.orientation === 'PORTRAIT'
  const width = portrait ? Math.min(t.widthMm, t.heightMm) : Math.max(t.widthMm, t.heightMm)
  const height = portrait ? Math.max(t.widthMm, t.heightMm) : Math.min(t.widthMm, t.heightMm)
  const m = safeMargins(t)
  return { x: m.left, y: m.top, width: Math.max(0, width - m.left - m.right), height: Math.max(0, height - m.top - m.bottom) }
}

/** Elements that stick out of the safe print area (0.05 mm tolerance for rounding). */
export function outsideSafeArea<E extends { xMm: number; yMm: number; wMm: number; hMm: number }>(t: Pick<LabelTemplate, 'widthMm' | 'heightMm' | 'orientation' | 'marginsMm'> & { elements?: E[] }): E[] {
  const a = safeArea(t)
  const tol = 0.05
  return (t.elements ?? []).filter((e) => e.xMm < a.x - tol || e.yMm < a.y - tol || e.xMm + e.wMm > a.x + a.width + tol || e.yMm + e.hMm > a.y + a.height + tol)
}

/** Roll settings that differ from the recommended setup, as readable text. */
export function differsFromRecommended(t: Pick<LabelTemplate, 'gapMm' | 'rowGapMm' | 'marginsMm' | 'columns'>): string[] {
  const r = RECOMMENDED_LAYOUT
  const m = safeMargins(t)
  const out: string[] = []
  if (t.columns > 1 && (t.gapMm ?? 2) !== r.gapMm) out.push(`gap between columns ${r.gapMm} mm`)
  if ((t.rowGapMm ?? 2) !== r.rowGapMm) out.push(`feed gap ${r.rowGapMm} mm`)
  if ((['top', 'right', 'bottom', 'left'] as const).some((s) => m[s] !== r.marginsMm[s])) out.push(`margins ${r.marginsMm.top} / ${r.marginsMm.right} / ${r.marginsMm.bottom} / ${r.marginsMm.left} mm`)
  return out
}
