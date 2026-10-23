import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createScanDetector, findScannedProduct } from '../src/lib/scanner.ts'

const type = (detector, text, gap, start = 1000) => {
  let at = start
  let result = null
  for (const key of [...text, 'Enter']) {
    at += gap
    result = detector.key(key, at)
  }
  return result
}

test('fast burst ending in Enter is a scan', () => {
  assert.equal(type(createScanDetector(), '8901234567890', 10), '8901234567890')
})

test('human typing speed is not a scan', () => {
  assert.equal(type(createScanDetector(), '12345678', 150), null)
})

test('short bursts and modifier keys are handled', () => {
  const d = createScanDetector()
  assert.equal(type(d, '12', 10), null)
  d.key('a', 5000); d.key('Shift', 5005); d.key('B', 5010); d.key('1', 5015); d.key('2', 5020)
  assert.equal(d.key('Enter', 5025), 'aB12')
})

test('a pause restarts the burst so earlier typing is not included', () => {
  const d = createScanDetector()
  d.key('x', 100)
  assert.equal(type(d, '55551234', 10, 2000), '55551234')
})

const products = [
  { id: 'a', productCode: '1001', eanCode: '8901234567890', pluCode: null, globalId: 'prd_AAA' },
  { id: 'b', productCode: '8901234567890x', variantCode: '001-00012-1034', eanCode: null, pluCode: '42', globalId: 'prd_BBB' },
]

test('finds products by exact code, EAN, PLU or global id', () => {
  assert.equal(findScannedProduct(products, '1001')?.id, 'a')
  assert.equal(findScannedProduct(products, ' 8901234567890 ')?.id, 'a')
  assert.equal(findScannedProduct(products, '42')?.id, 'b')
  assert.equal(findScannedProduct(products, '001000121034')?.id, 'b')
  assert.equal(findScannedProduct(products, '001-00012-1034')?.id, 'b')
  assert.equal(findScannedProduct(products, 'PRD_bbb')?.id, 'b')
  assert.equal(findScannedProduct(products, '100'), undefined)
})
