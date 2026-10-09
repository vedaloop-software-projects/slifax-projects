// "This PC's printer" as saved in this browser. Kept free of app imports so the API layer
// and the label builders can read it without import cycles.

import type { Db, Shop } from '../types'

export type StationLanguage = 'TSPL' | 'ZPL'

export interface StationSetup {
  /** Windows printer queue name, as the print agent lists it. */
  printerName: string
  templateId: string
  language: StationLanguage
  dpi: 203 | 300
  /** Shop whose name and location print on every label from this PC. Unset = the default shop. */
  shopId?: string
  savedAt: string
  savedBy: string
}

export type StationChoice = Pick<StationSetup, 'printerName' | 'templateId' | 'language' | 'dpi' | 'shopId'>

const KEY = 'label-print-station-v1'

export function stationSetup(): StationSetup | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as StationSetup | null
    if (!s || typeof s.printerName !== 'string' || !s.printerName || typeof s.templateId !== 'string') return null
    if (s.language !== 'TSPL' && s.language !== 'ZPL') return null
    return { ...s, dpi: s.dpi === 300 ? 300 : 203 }
  } catch {
    return null
  }
}

export function saveStationSetup(choice: StationChoice, savedBy: string): StationSetup {
  const setup: StationSetup = { ...choice, savedAt: new Date().toISOString(), savedBy }
  localStorage.setItem(KEY, JSON.stringify(setup))
  return setup
}

export function clearStationSetup() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* storage unavailable */
  }
}

export const sameChoice = (a: Partial<StationChoice> | null, b: Partial<StationChoice> | null) =>
  !!a && !!b && a.printerName === b.printerName && a.templateId === b.templateId && a.language === b.language && a.dpi === b.dpi && (a.shopId ?? '') === (b.shopId ?? '')

/**
 * The shop printed on labels: the one saved for this PC, else the default shop. Every label
 * in a job shows the same shop name and location, whichever branch the product belongs to.
 */
export function labelShop(db: Pick<Db, 'shops' | 'settings'>): Shop | undefined {
  const id = stationSetup()?.shopId ?? db.settings.defaultShopId
  return db.shops.find((s) => s.id === id) ?? db.shops.find((s) => s.id === db.settings.defaultShopId) ?? db.shops[0]
}
