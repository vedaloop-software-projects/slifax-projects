import type { Db, Printer } from '../types'

// Legacy seed signatures. A mapped/edited/used profile is never treated as a demo.
const DEMOS = [
  ['Zebra ZD421', 'Zebra', 'ZD421', 'ZPL', 'USB', 'USB001'],
  ['TSC TE244', 'TSC', 'TE244', 'TSPL', 'USB', 'USB002'],
  ['TVS LP 46 Neo', 'TVS', 'LP 46 NEO', 'TSPL', 'USB', 'USB001'],
  ['Zebra GC420t', 'Zebra', 'GC420t', 'ZPL', 'NETWORK', '192.168.1.42:9100'],
  ['TSC DA210', 'TSC', 'DA210', 'TSPL', 'NETWORK', '192.168.2.20:9100'],
  ['TVS RP 3160 Gold', 'TVS', 'RP 3160 GOLD', 'ESCPOS', 'USB', 'USB003'],
  ['Zebra ZD230 (Store Room)', 'Zebra', 'ZD230', 'ZPL', 'NETWORK', '192.168.1.55:9100'],
]

export function cleanDemoPrinters(db: Db, mappedIds: string[] = []): Db {
  if (db.printerCleanupVersion === 1) return db
  const configured = new Set([
    ...mappedIds,
    ...db.printJobs.filter((j) => j.delivery === 'RAW').map((j) => j.printerId),
    ...db.auditLogs.filter((a) => a.entityType === 'PRINTER' && (a.action === 'PRINTER_ADDED' || (a.action === 'PRINTER_UPDATED' && a.detail.startsWith('Updated ')))).map((a) => a.entityId),
  ])
  const demo = (p: Printer) => !configured.has(p.id) && p.dpi === 203 && DEMOS.some((d) =>
    [p.name, p.manufacturer, p.model, p.language, p.connectionType, p.address].every((value, i) => value === d[i]))
  const removed = db.printers.filter(demo)
  return {
    ...db,
    printerCleanupVersion: 1,
    printers: db.printers.filter((p) => !removed.includes(p)),
    // Preserve past jobs and the original display names without exposing demo profiles in pickers.
    archivedPrinterNames: { ...db.archivedPrinterNames, ...Object.fromEntries(removed.map((p) => [p.id, p.name])) },
  }
}

export function duplicatePrinter(printers: Printer[], input: Pick<Printer, 'name' | 'shopId'>, exceptId?: string) {
  const name = input.name.trim().toLocaleLowerCase()
  return printers.some((p) => p.id !== exceptId && p.shopId === input.shopId && p.name.trim().toLocaleLowerCase() === name)
}

/** Keep explicit selection; recover when profiles are first added or removed. */
export function selectedPrinter(printers: Printer[], id?: string) {
  return printers.find((p) => p.id === id) ?? printers.find((p) => p.status === 'CONNECTED') ?? printers[0]
}
