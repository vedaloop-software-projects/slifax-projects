import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sheetGeometry } from '../src/print/geometry.ts'
import { jsPDF } from 'jspdf'

const stock = { widthMm: 50, heightMm: 25, columns: 2, orientation: 'LANDSCAPE' }

test('two-column stock defaults to a full row, including the gap', () => {
  const g = sheetGeometry(stock, {})
  assert.deepEqual([g.perPage, g.pageW, g.pageH], [2, 102, 25])
})

test('single-column stock has no extra gap', () => {
  const g = sheetGeometry({ ...stock, columns: 1 }, {})
  assert.deepEqual([g.perPage, g.pageW, g.pageH], [1, 50, 25])
})

test('three-column stock uses the measured gap twice', () => {
  const g = sheetGeometry({ ...stock, widthMm: 38, columns: 3 }, { gapMm: 3 })
  assert.deepEqual([g.perPage, g.pageW, g.pageH], [3, 120, 25])
})

test('explicit single-label output remains available', () => {
  const g = sheetGeometry({ ...stock, pageMode: 'SINGLE' }, {})
  assert.deepEqual([g.perPage, g.pageW, g.pageH], [1, 50, 25])
})

test('roll reset overrides saved single-label and rotated settings', () => {
  const g = sheetGeometry({ ...stock, pageMode: 'SINGLE', rotate: 90 }, { pageMode: 'ROW', rotate: 0 })
  assert.deepEqual([g.perPage, g.pageW, g.pageH], [2, 102, 25])
})

test('saved rotation is respected when no override is provided', () => {
  const g = sheetGeometry({ ...stock, rotate: 90 }, {})
  assert.deepEqual([g.pageW, g.pageH], [25, 102])
})

test('PDF dimensions preserve the full row for every rotation', () => {
  for (const rotate of [0, 90, 180, 270]) {
    const g = sheetGeometry(stock, { rotate })
    const orientation = g.pageW >= g.pageH ? 'landscape' : 'portrait'
    const pdf = new jsPDF({ unit: 'mm', format: [g.pageW, g.pageH], orientation })
    pdf.addPage([g.pageW, g.pageH], orientation)
    for (const page of [1, 2]) {
      pdf.setPage(page)
      assert.ok(Math.abs(pdf.internal.pageSize.getWidth() - g.pageW) < 0.001)
      assert.ok(Math.abs(pdf.internal.pageSize.getHeight() - g.pageH) < 0.001)
    }
  }
})
