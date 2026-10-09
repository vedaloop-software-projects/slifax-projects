// "This PC's printer": the Windows printer, label template and printer format an admin saved
// on a shop PC. Anyone who signs in on that PC (same browser) prints with it from Barcode
// Printing, without opening Printers.

import type { Db, LabelTemplate, PrintJob, QueueEntry } from '../types'
import { getDb } from '../mock/db'
import { printing, queue } from '../api'
import { renderPrnBatch } from '../lib/prnRenderer'
import { withExpiryOverride } from '../lib/labelData'
import { buildProductSpec } from './labelOutput'
import { agentSettings, generatedPrnBytes, sendRawToQueue } from './localAgent'

export type StationLanguage = 'TSPL' | 'ZPL'

export interface StationSetup {
  /** Windows printer queue name, as the print agent lists it. */
  printerName: string
  templateId: string
  language: StationLanguage
  dpi: 203 | 300
  savedAt: string
  savedBy: string
}

export type StationChoice = Pick<StationSetup, 'printerName' | 'templateId' | 'language' | 'dpi'>

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
  !!a && !!b && a.printerName === b.printerName && a.templateId === b.templateId && a.language === b.language && a.dpi === b.dpi

/** A queue entry with the expiry and packed-date choices made in Barcode Printing applied. */
export function queueLabel(db: Db, q: QueueEntry) {
  const product = db.products.find((p) => p.id === q.productId && p.status === 'ACTIVE')
  if (!product) return null
  const batch = q.batchId ? db.batches.find((b) => b.id === q.batchId) ?? null : null
  return { entry: q, ...withExpiryOverride(product, batch, q.expiryDate, q.showExpiry !== false, q.packedDate) }
}

/** PRN for the whole print queue in one job (products share rows on 2 UP / 3 UP rolls). */
export function queuePrn(db: Db, template: LabelTemplate, choice: Pick<StationChoice, 'language' | 'dpi'>): string {
  const ready = db.queue.map((q) => queueLabel(db, q))
  if (!ready.length) throw new Error('The print list is empty.')
  if (ready.some((s) => !s)) throw new Error('A product in the print list is no longer available. Remove it and try again.')
  return renderPrnBatch(template, choice, ready.map((s) => buildProductSpec(db, template, s!.product, s!.batch, s!.entry.quantity).items[0]))
}

/**
 * Prints everything in the Barcode Printing queue to `choice` (normally this PC's saved
 * printer), records it for print history / analytics, and empties the printed entries.
 */
export async function printQueueTo(choice: StationChoice): Promise<{ job: PrintJob; labels: number; products: number }> {
  const db = getDb()
  const template = db.templates.find((t) => t.id === choice.templateId)
  if (!template) throw new Error('The label template saved for this PC no longer exists. Ask your admin to set up the printer on this PC again.')
  const ready = db.queue.map((q) => queueLabel(db, q)).filter((s): s is NonNullable<typeof s> => !!s)
  const prn = queuePrn(db, template, choice)
  const result = await sendRawToQueue(choice.printerName, generatedPrnBytes(choice.language, prn))
  const profile = db.printers.find((p) => agentSettings().printers[p.id] === choice.printerName)
  const job = await printing.recordDirectPrn(
    profile?.id ?? `windows:${choice.printerName}`,
    template.id,
    ready.map((s) => ({ productId: s.product.id, quantity: s.entry.quantity, expiryDate: s.product.expiryDate })),
    result.spoolJobId,
    prn,
    choice.printerName,
  )
  // Printed: they leave the queue, as with every other way of printing.
  for (const s of ready) await queue.remove(s.entry.id)
  return { job, labels: ready.reduce((n, s) => n + s.entry.quantity, 0), products: ready.length }
}
