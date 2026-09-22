// Page geometry for browser printing — shared by the sheet, the controls and the designer.

import type { LabelTemplate } from '../types'

export type Rotation = 0 | 90 | 180 | 270

/** ROW = one page per row across the liner. SINGLE = one page per label. */
export type PageMode = 'ROW' | 'SINGLE'

export interface PrintSetup {
  pageMode?: PageMode
  rotate?: Rotation
  /** Fine alignment nudge in mm. */
  offsetXMm?: number
  offsetYMm?: number
  /** Physical gap between labels across the liner (mm). */
  gapMm?: number
  /** Draw a hairline round each label to check alignment on the stock. */
  outline?: boolean
}

/** Label size, the block of labels on one page, and the page itself (after rotation). */
export function sheetGeometry(template: LabelTemplate, setup: PrintSetup) {
  const portrait = template.orientation === 'PORTRAIT'
  const labelW = portrait ? Math.min(template.widthMm, template.heightMm) : Math.max(template.widthMm, template.heightMm)
  const labelH = portrait ? Math.max(template.widthMm, template.heightMm) : Math.min(template.widthMm, template.heightMm)
  const gap = setup.gapMm ?? template.gapMm ?? 2
  const perPage = (setup.pageMode ?? 'ROW') === 'SINGLE' ? 1 : template.columns
  const contentW = labelW * perPage + gap * (perPage - 1)
  const contentH = labelH
  const rotate = setup.rotate ?? 0
  const swap = rotate === 90 || rotate === 270
  return {
    labelW,
    labelH,
    gap,
    perPage,
    contentW,
    contentH,
    rotate,
    pageW: swap ? contentH : contentW,
    pageH: swap ? contentW : contentH,
  }
}

