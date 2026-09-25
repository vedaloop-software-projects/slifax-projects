// Run with Vite on BARCODE_TEST_URL and PLAYWRIGHT_MODULE pointing to playwright/core.
// All agent requests are intercepted: this test never submits a physical print job.
import assert from 'node:assert/strict'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } })
  page.on('pageerror', (error) => console.error('Browser error:', error.message))
  const submissions = []
  await page.route('http://127.0.0.1:17846/**', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON()
      submissions.push({ ...body, prn: Buffer.from(body.data, 'base64').toString('utf8') })
      await route.fulfill({ json: { id: body.id, state: 'spooled', spoolJobId: submissions.length } })
    } else await route.fulfill({ json: { printers: ['Test queue'] } })
  })
  const base = process.env.BARCODE_TEST_URL || 'http://127.0.0.1:5175'
  await page.goto(base)
  await page.waitForFunction(() => !!localStorage.getItem('smart-label-db'))
  const products = await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('smart-label-db'))
    db.session.userId = db.users.find((user) => user.role === 'ADMIN').id
    db.templates[0].fields.qr = false
    db.templates[0].fields.address = false
    db.templates[0].fields.batchCode = false
    localStorage.setItem('smart-label-db', JSON.stringify(db))
    localStorage.setItem('label-print-agent-v1', JSON.stringify({ token: 'test-token', printers: {} }))
    return ['CHANA DAL 1KG', 'TOOR DAL 1KG', 'SUGAR 1KG'].map((name) => db.products.find((p) => p.name === name && p.status === 'ACTIVE'))
  })
  await page.goto(`${base}/printers`)
  await page.getByRole('button', { name: 'Connect / refresh' }).click()
  const choose = async (label, text) => {
    await page.getByRole('combobox', { name: label, exact: true }).click()
    if (label === 'Product for PRN') await page.getByRole('combobox', { name: label, exact: true }).fill(text)
    await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: text }).first().click()
    await page.locator('.ant-select-dropdown:visible').waitFor({ state: 'hidden' })
  }
  await choose('Windows printer for direct printing', 'Test queue')
  await choose('Printer command language', 'TSPL')
  for (const [index, product] of products.entries()) {
    await choose('Product for PRN', `${product.name} (${product.productCode})`)
    await page.getByRole('button', { name: 'Print product', exact: true }).click()
    await page.waitForFunction((n) => document.body.textContent.includes(`Windows job ${n}.`), index + 1)
    const submitted = submissions.at(-1)
    assert.ok(submitted.prn.includes(`"${product.name}"`), `Wrong product sent: ${submitted.prn}`)
    for (const other of products.filter((p) => p.id !== product.id)) assert.ok(!submitted.prn.includes(`"${other.name}"`))
    assert.equal(submitted.printer, 'Test queue')
    if (index === 0) {
      await page.getByRole('combobox', { name: 'Product for PRN', exact: true }).fill('TOOR')
      assert.ok(await page.getByRole('button', { name: 'Print product', exact: true }).isDisabled(), 'Typing a new search must not print the previous product')
      assert.equal(submissions.length, 1)
    }
  }
  assert.equal(new Set(submissions.map((job) => job.id)).size, 3)
  await page.getByRole('button', { name: 'Edit layout', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('spinbutton', { name: 'widthMm', exact: true }).fill('60')
  await dialog.getByRole('spinbutton', { name: 'left margin', exact: true }).fill('3')
  await dialog.getByRole('button', { name: 'Save for all products', exact: true }).click()
  await dialog.waitFor({ state: 'hidden' })
  console.log('Shared layout saved; selected products printed:', submissions.length)
  for (const product of products.slice(1)) {
    await choose('Product for PRN', `${product.name} (${product.productCode})`)
    const count = submissions.length + 1
    await page.getByRole('button', { name: 'Print product', exact: true }).click()
    await page.waitForFunction((n) => document.body.textContent.includes(`Windows job ${n}.`), count)
    assert.ok(submissions.at(-1).prn.includes('SIZE 122 mm, 25 mm'))
    assert.ok(submissions.at(-1).prn.includes(`"${product.name}"`))
    assert.match(submissions.at(-1).prn, /TEXT 24,/)
  }
  console.log('Five consecutive submissions use the selected product; shared layout edits apply to two different products. No physical print jobs sent.')
} finally { await browser.close() }
