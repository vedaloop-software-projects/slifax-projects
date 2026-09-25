// Run against Vite: BARCODE_TEST_URL=http://127.0.0.1:5175
// PLAYWRIGHT_MODULE may point to an already-installed playwright/core module URL.
import assert from 'node:assert/strict'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 700 } })
  await page.goto(`${process.env.BARCODE_TEST_URL || 'http://127.0.0.1:5175'}/tests/fixtures/barcode.html`)
  await page.locator('[data-label-case] svg rect').first().waitFor()
  const check = async (stage) => {
    const cases = await page.locator('[data-label-case]').evaluateAll((nodes) => nodes.map((node) => {
      const svg = node.querySelector('svg')
      const bounds = svg.getBoundingClientRect()
      const bars = [...svg.querySelectorAll('g rect')].map((rect) => rect.getBoundingClientRect())
      return { name: node.getAttribute('data-label-case'), width: bounds.width, height: bounds.height, bars: bars.length, minBarHeight: Math.min(...bars.map((b) => b.height)), span: Math.max(...bars.map((b) => b.right)) - Math.min(...bars.map((b) => b.left)) }
    }))
    for (const c of cases) {
      assert.ok(c.bars > 10, `${stage}: missing bars ${JSON.stringify(c)}`)
      assert.ok(c.height > 10 && c.minBarHeight > 10, `${stage}: collapsed barcode ${JSON.stringify(c)}`)
      assert.ok(c.span > c.width * 0.7, `${stage}: barcode is too narrow ${JSON.stringify(c)}`)
    }
    console.log(`${stage}: ${cases.length} label cases have visible, full-width bars`)
  }
  await check('Initial render')
  await page.getByRole('button', { name: 'Change spacing and barcode' }).click()
  await page.waitForTimeout(100)
  await check('After editing')
  await page.emulateMedia({ media: 'print' })
  // The app print stylesheet hides content outside print-root.
  await page.locator('#root').evaluate((node) => { node.id = 'print-root'; node.style.position = 'static' })
  await check('Print media')
  await page.emulateMedia({ media: 'screen' })
  await page.goto(`${process.env.BARCODE_TEST_URL || 'http://127.0.0.1:5175'}/`)
  await page.waitForFunction(() => !!localStorage.getItem('smart-label-db'))
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('smart-label-db'))
    db.session.userId = db.users.find((user) => user.role === 'ADMIN').id
    const template = db.templates[0]
    template.fields.qr = false
    template.fields.address = false
    template.fields.batchCode = false
    template.marginsMm = { top: 1.5, right: 2, bottom: 1.5, left: 2 }
    localStorage.setItem('smart-label-db', JSON.stringify(db))
  })
  await page.goto(`${process.env.BARCODE_TEST_URL || 'http://127.0.0.1:5175'}/templates`)
  const barcode = page.locator('.label-paper svg[aria-label^="Barcode"]').first()
  await barcode.waitFor()
  const assertDesigner = async () => {
    const size = await barcode.boundingBox()
    assert.ok(size && size.width > 100 && size.height > 10, 'Designer barcode must remain visible')
    assert.ok(await barcode.locator('rect').count() > 10)
  }
  await assertDesigner()
  await page.getByRole('spinbutton', { name: 'top margin', exact: true }).fill('2')
  await page.getByRole('spinbutton', { name: 'top margin', exact: true }).press('Tab')
  await assertDesigner()
  await page.getByRole('tab', { name: 'PRN output' }).click()
  await page.getByRole('tab', { name: 'Visual', exact: true }).click()
  await assertDesigner()
  if (process.env.BARCODE_SCREENSHOT) await page.locator('.label-sheet').screenshot({ path: process.env.BARCODE_SCREENSHOT })
  console.log('Templates page: barcode remains visible after margin edits and preview tab switches')
} finally { await browser.close() }
