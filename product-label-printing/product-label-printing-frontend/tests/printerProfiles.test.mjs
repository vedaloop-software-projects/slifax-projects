import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cleanDemoPrinters, duplicatePrinter, selectedPrinter } from '../src/lib/printerProfiles.ts'
const demo = { id: 'demo', name: 'Zebra ZD421', manufacturer: 'Zebra', model: 'ZD421', language: 'ZPL', connectionType: 'USB', address: 'USB001', dpi: 203, shopId: 'shop', templateId: 'tpl' }
const real = { ...demo, id: 'real', name: 'Billing counter', model: 'LP46' }
const fixture = () => ({ printers: [demo, real], auditLogs: [], printJobs: [{ id: 'history', printerId: demo.id }], products: [{ id: 'keep' }] })

test('removes only untouched demo profiles and preserves history and products', () => {
  const db = fixture()
  const next = cleanDemoPrinters(db)
  assert.deepEqual(next.printers, [real])
  assert.equal(next.printJobs, db.printJobs)
  assert.equal(next.products, db.products)
  assert.equal(next.archivedPrinterNames.demo, 'Zebra ZD421')
  assert.equal(cleanDemoPrinters(next), next)
})
test('mapped, edited, created or actually used demo profiles are preserved', () => {
  assert.equal(cleanDemoPrinters(fixture(), ['demo']).printers.length, 2)
  for (const action of ['PRINTER_ADDED', 'PRINTER_UPDATED']) {
    const db = fixture()
    db.auditLogs = [{ entityType: 'PRINTER', entityId: 'demo', action, detail: 'Updated Zebra ZD421' }]
    assert.equal(cleanDemoPrinters(db).printers.length, 2)
  }
  const db = fixture()
  db.printJobs = [{ delivery: 'RAW', printerId: 'demo' }]
  assert.equal(cleanDemoPrinters(db).printers.length, 2)
  db.printers = [{ ...demo, address: 'USB009' }]
  assert.equal(cleanDemoPrinters(db).printers.length, 1)
})
test('duplicate profile names are normalized and scoped to each shop', () => {
  assert.equal(duplicatePrinter([real], { name: ' BILLING COUNTER ', shopId: 'shop' }), true)
  assert.equal(duplicatePrinter([real], { name: real.name, shopId: 'another-shop' }), false)
  assert.equal(duplicatePrinter([real], real, real.id), false)
})

test('selection recovers when a first profile is added or a selected profile is removed', () => {
  assert.equal(selectedPrinter([], undefined), undefined)
  assert.equal(selectedPrinter([real], undefined), real)
  assert.equal(selectedPrinter([real], 'deleted-profile'), real)
  assert.equal(selectedPrinter([real, demo], demo.id), demo)
})
