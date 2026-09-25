import { test } from 'node:test'
import assert from 'node:assert/strict'
import { labelContentBox } from '../src/lib/labelLayout.ts'

const label = { widthMm: 50, heightMm: 25, orientation: 'LANDSCAPE' }

test('independent margins define the same physical content box for preview and print', () => {
  const box = labelContentBox({ ...label, marginsMm: { top: 1, right: 2, bottom: 3, left: 4 }, fieldGapMm: 0.5 })
  assert.equal(box.contentWidth, 44)
  assert.equal(box.contentHeight, 21)
  assert.equal(box.gap, 0.5)
  const portrait = labelContentBox({ ...label, orientation: 'PORTRAIT', marginsMm: box.margins })
  assert.equal(portrait.width, 25)
  assert.equal(portrait.height, 50)
  assert.equal(portrait.contentWidth, 19)
  assert.equal(portrait.contentHeight, 46)
})

test('legacy templates retain default insets and zero margins are allowed', () => {
  assert.deepEqual(labelContentBox(label).margins, { top: 1.1, right: 1.1, bottom: 1.1, left: 1.1 })
  const box = labelContentBox({ ...label, marginsMm: { top: 0, right: 0, bottom: 0, left: 0 } })
  assert.equal(box.contentWidth, 50)
  assert.equal(box.contentHeight, 25)
})

test('invalid margins and excessive field spacing are rejected before saving', () => {
  for (const top of [-1, NaN, Infinity, 22]) {
    assert.throws(() => labelContentBox({ ...label, marginsMm: { top, right: 1, bottom: 1, left: 1 } }))
  }
  assert.throws(() => labelContentBox({ ...label, fieldGapMm: 10, fields: { shopName: true, productName: true, mrp: true, barcode: true } }), /Field spacing/)
})
