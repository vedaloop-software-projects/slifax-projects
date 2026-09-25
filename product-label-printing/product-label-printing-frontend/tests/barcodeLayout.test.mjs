import { test } from 'node:test'
import assert from 'node:assert/strict'
import { barcodeBars } from '../src/lib/barcodeLayout.ts'

test('short and long barcodes fill available width with blank scanner margins', () => {
  for (const [value, format] of [['00000401', 'CODE128'], ['ALMONDS250GRAM', 'CODE128'], ['5901234123457', 'EAN13']]) {
    for (const width of [376, 564]) {
      const bars = barcodeBars(value, format, width)
      const first = bars[0]
      const last = bars.at(-1)
      assert.ok(first.x > 0)
      assert.ok(last.x + last.width < width)
      assert.ok(last.x + last.width - first.x > width * 0.7)
      assert.ok(Math.abs(first.x - (width - last.x - last.width)) <= 1)
      for (let i = 0; i < bars.length; i++) {
        assert.ok(bars[i].width > 0)
        if (i) assert.ok(bars[i].x > bars[i - 1].x + bars[i - 1].width)
      }
    }
  }
})

test('too-narrow barcodes fail instead of losing bars', () => {
  assert.throws(() => barcodeBars('00000401', 'CODE128', 30), /does not fit/)
})
