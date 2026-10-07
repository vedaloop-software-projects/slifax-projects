import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { agentSettings, saveAgentSettings, sendRaw, sendRawToQueue, sendPrn, localPrinters, generatedPrnBytes } from '../src/print/localAgent.ts'

const moduleUrl = (source) => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString('base64')
const dates = moduleUrl(readFileSync(new URL('../src/lib/dates.ts', import.meta.url), 'utf8'))
const layout = moduleUrl(readFileSync(new URL('../src/lib/labelLayout.ts', import.meta.url), 'utf8'))
const barcode = moduleUrl(readFileSync(new URL('../src/lib/barcodeLayout.ts', import.meta.url), 'utf8').replace("'jsbarcode'", JSON.stringify(import.meta.resolve('jsbarcode'))))
const textFit = moduleUrl(readFileSync(new URL('../src/lib/textFit.ts', import.meta.url), 'utf8'))
const fonts = moduleUrl(readFileSync(new URL('../src/lib/fonts.ts', import.meta.url), 'utf8'))
const freeLayout = moduleUrl(readFileSync(new URL('../src/lib/freeLayout.ts', import.meta.url), 'utf8').replace("'./dates'", JSON.stringify(dates)).replace("'./fonts'", JSON.stringify(fonts)))
const renderer = readFileSync(new URL('../src/lib/prnRenderer.ts', import.meta.url), 'utf8').replace("'./dates'", JSON.stringify(dates)).replace("'./labelLayout'", JSON.stringify(layout)).replace("'./barcodeLayout'", JSON.stringify(barcode)).replace("'./freeLayout'", JSON.stringify(freeLayout)).replace("'./textFit'", JSON.stringify(textFit))
const { renderPrn } = await import(moduleUrl(renderer))
const template = { widthMm: 50, heightMm: 25, columns: 2, fields: { productName: true }, barcodeType: 'CODE128' }
const data = { product: { name: 'Almonds', productCode: '123', mrp: 200, salePrice: 180 }, batch: null, quantity: 3 }

test('TSPL prints exactly three labels as one full row and one partial row', () => {
  const prn = renderPrn(template, { language: 'TSPL', dpi: 203 }, data)
  assert.equal((prn.match(/TEXT /g) ?? []).length, 3)
  assert.equal((prn.match(/PRINT 1,1/g) ?? []).length, 2)
  assert.equal((prn.match(/SIZE 100 mm, 25 mm/g) ?? []).length, 2)
  assert.ok(prn.endsWith('\r\n'))
})
test('ZPL full rows retain efficient copies and tail has one label', () => {
  const prn = renderPrn(template, { language: 'ZPL', dpi: 203 }, { ...data, quantity: 5 })
  assert.ok(prn.includes('^PQ2,0,1,Y'))
  assert.ok(prn.includes('^PQ1,0,1,Y'))
  assert.equal((prn.match(/\^FDAlmonds/g) ?? []).length, 3)
})
test('invalid quantities and command injection are rejected', () => {
  for (const quantity of [0, -1, 1.5, 1001]) assert.throws(() => renderPrn(template, { language: 'TSPL', dpi: 203 }, { ...data, quantity }))
  for (const [language, name] of [['TSPL', 'bad\r\nPRINT 100,1'], ['ZPL', 'bad^XZ'], ['TSPL', 'bad"']]) {
    assert.throws(() => renderPrn(template, { language, dpi: 203 }, { ...data, product: { ...data.product, name } }))
  }
})

test('agent client preserves bytes, authenticates, and never auto retries', async () => {
  const oldFetch = globalThis.fetch
  const oldStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const memory = new Map()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k) => memory.get(k), setItem: (k, v) => memory.set(k, v) } })
  try {
    saveAgentSettings({ token: 'key', printers: { profile: 'TVS' } })
    assert.equal(agentSettings().printers.profile, 'TVS')
    const calls = []
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options })
      return new Response(JSON.stringify({ id: 'job-12345', state: 'spooled', spoolJobId: 42, printers: ['TVS'] }))
    }
    assert.deepEqual(await localPrinters(), ['TVS'])
    await sendRaw('profile', new Uint8Array([0, 255, 13, 10]), 'job-12345')
    const { options } = calls[1]
    assert.equal(options.headers.Authorization, 'Bearer key')
    assert.deepEqual([...Buffer.from(JSON.parse(options.body).data, 'base64')], [0, 255, 13, 10])
    assert.equal(JSON.parse(options.body).printer, 'TVS')
    // Installed queues can receive an existing PRN with zero app profiles.
    saveAgentSettings({ token: 'key', printers: {} })
    await sendRawToQueue('SNBC TVSE LP46 Dlite BPLE', new Uint8Array([0, 255, 13, 10]), 'direct-12345')
    const direct = JSON.parse(calls[2].options.body)
    assert.equal(direct.printer, 'SNBC TVSE LP46 Dlite BPLE')
    assert.deepEqual([...Buffer.from(direct.data, 'base64')], [0, 255, 13, 10])
    await assert.rejects(sendRawToQueue('', new Uint8Array([1])), /Select a Windows printer/)
    assert.equal(calls.length, 3)
    saveAgentSettings({ token: 'key', printers: { profile: 'TVS' } })
    assert.throws(() => sendPrn({ id: 'profile', language: 'ESCPOS' }, 'pseudo'), /not supported/)
    assert.throws(() => sendPrn({ id: 'profile', language: 'TSPL' }, 'Tamil: \u0ba4'), /ASCII/)
    let failures = 0
    globalThis.fetch = async () => { failures++; throw new Error('lost response') }
    await assert.rejects(sendRaw('profile', new Uint8Array([1])), /may already be queued/)
    assert.equal(failures, 1)
    globalThis.fetch = async () => new Response(JSON.stringify({ error: 'bad key' }), { status: 401 })
    await assert.rejects(localPrinters(), /bad key/)
    globalThis.fetch = async () => new Response(JSON.stringify({ state: 'unknown', error: 'Check Windows' }))
    await assert.rejects(sendRaw('profile', new Uint8Array([1])), /Check Windows/)
    await assert.rejects(sendRaw('unmapped', new Uint8Array([1])), /select the Windows queue/)
  } finally {
    globalThis.fetch = oldFetch
    if (oldStorage) Object.defineProperty(globalThis, 'localStorage', oldStorage)
    else delete globalThis.localStorage
  }
})


test('generated product PRN can be submitted repeatedly with no app printer profile', async () => {
  const oldFetch = globalThis.fetch
  const oldStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => JSON.stringify({ token: 'key', printers: {} }) } })
  const jobs = []
  globalThis.fetch = async (_url, options) => {
    const job = JSON.parse(options.body)
    jobs.push(job)
    return new Response(JSON.stringify({ id: job.id, state: 'spooled', spoolJobId: jobs.length }))
  }
  try {
    for (const language of ['TSPL', 'ZPL']) {
      const prn = renderPrn(template, { language, dpi: 203 }, data)
      for (let copy = 0; copy < 2; copy++) {
        await sendRawToQueue('Installed printer', generatedPrnBytes(language, prn))
        assert.equal(Buffer.from(jobs.at(-1).data, 'base64').toString('utf8'), prn)
        assert.equal(jobs.at(-1).printer, 'Installed printer')
      }
    }
    assert.equal(new Set(jobs.map((j) => j.id)).size, 4)
    assert.throws(() => generatedPrnBytes('ESCPOS', 'unsupported'), /not supported/)
    assert.throws(() => generatedPrnBytes('TSPL', '\u0ba4'), /ASCII/)
    assert.equal(jobs.length, 4)
  } finally {
    globalThis.fetch = oldFetch
    if (oldStorage) Object.defineProperty(globalThis, 'localStorage', oldStorage)
    else delete globalThis.localStorage
  }
})

test('asymmetric margins and column gaps position every PRN label at both resolutions', () => {
  for (const dpi of [203, 300]) {
    const k = dpi === 203 ? 8 : 12
    const tpl = { ...template, orientation: 'LANDSCAPE', gapMm: 2, marginsMm: { top: 2, right: 3, bottom: 4, left: 5 } }
    for (const language of ['TSPL', 'ZPL']) {
      const prn = renderPrn(tpl, { language, dpi }, data)
      const coordinates = language === 'TSPL' ? `TEXT ${5*k},${2*k},` : `^FO${5*k},${2*k}`
      const second = language === 'TSPL' ? `TEXT ${57*k},${2*k},` : `^FO${57*k},${2*k}`
      assert.ok(prn.includes(coordinates), prn)
      assert.ok(prn.includes(second), prn)
      assert.ok(prn.includes(language === 'TSPL' ? 'SIZE 102 mm, 25 mm' : `^PW${102*k}`))
      assert.equal((prn.match(language === 'TSPL' ? /TEXT /g : /\^FDAlmonds/g) ?? []).length, 3)
    }
  }
})

test('PRN rejects impossible content boxes and preserves barcode space', () => {
  const tpl = { ...template, orientation: 'LANDSCAPE', marginsMm: { top: 1, right: 1, bottom: 1, left: 1 } }
  for (const language of ['TSPL', 'ZPL']) {
    assert.throws(() => renderPrn({ ...tpl, marginsMm: { ...tpl.marginsMm, bottom: 24 } }, { language, dpi: 203 }, data), /at least 5 mm/)
    assert.throws(() => renderPrn({ ...tpl, marginsMm: { ...tpl.marginsMm, left: -1 } }, { language, dpi: 203 }, data), /zero or greater/)
    assert.throws(() => renderPrn({ ...tpl, fields: { barcode: true }, marginsMm: { ...tpl.marginsMm, right: 40 } }, { language, dpi: 203 }, data), /Barcode does not fit/)
    const fields = { productName: true, packedDate: true }
    const original = renderPrn({ ...tpl, fields }, { language, dpi: 203 }, data)
    const spaced = renderPrn({ ...tpl, fields, fieldGapMm: 1 }, { language, dpi: 203 }, data)
    const pattern = language === 'TSPL' ? /TEXT \d+,(\d+),/g : /\^FO\d+,(\d+)/g
    assert.equal([...spaced.matchAll(pattern)][1][1] - [...original.matchAll(pattern)][1][1], 8)
  }
})

test('full-width barcode rectangles respect margins in both PRN languages', () => {
  const tpl = { ...template, orientation: 'LANDSCAPE', fields: { barcode: true }, marginsMm: { top: 2, right: 3, bottom: 2, left: 4 } }
  for (const language of ['TSPL', 'ZPL']) {
    const prn = renderPrn(tpl, { language, dpi: 203 }, { ...data, product: { ...data.product, productCode: '00000401' }, quantity: 1 })
    const pattern = language === 'TSPL' ? /BAR (\d+),(\d+),(\d+),(\d+)/g : /\^FO(\d+),(\d+)\^GB(\d+),(\d+)/g
    const bars = [...prn.matchAll(pattern)].map((m) => m.slice(1).map(Number))
    assert.ok(bars.length > 10)
    assert.ok(bars[0][0] > 4 * 8)
    const end = bars.at(-1)[0] + bars.at(-1)[2]
    assert.ok(end < (50 - 3) * 8)
    assert.ok(end - bars[0][0] > (50 - 4 - 3) * 8 * 0.7)
    assert.ok(bars.every((bar) => bar[1] === 2 * 8))
  }
})

test('TSPL uses the measured feed gap independently from horizontal column spacing', () => {
  for (const marginsMm of [undefined, { top: 1, right: 1, bottom: 1, left: 1 }]) {
    const tpl = { ...template, orientation: 'LANDSCAPE', gapMm: 0.5, rowGapMm: 3.5, marginsMm }
    const prn = renderPrn(tpl, { language: 'TSPL', dpi: 203 }, { ...data, quantity: 2 })
    assert.ok(prn.includes('SIZE 100.5 mm, 25 mm'))
    assert.ok(prn.includes('GAP 3.5 mm, 0 mm'))
    assert.equal((prn.match(/TEXT /g) ?? []).length, 2)
    const single = renderPrn(tpl, { language: 'TSPL', dpi: 203 }, { ...data, quantity: 1 })
    assert.equal((single.match(/TEXT /g) ?? []).length, 1)
    assert.throws(() => renderPrn({ ...tpl, rowGapMm: -1 }, { language: 'TSPL', dpi: 203 }, data), /Feed gap/)
  }
})

test('zero feed gap cannot silently disable tracking for sticker rolls', () => {
  for (const marginsMm of [undefined, { top: 2, right: 3, bottom: 2, left: 5 }]) {
    const tpl = { ...template, orientation: 'LANDSCAPE', rowGapMm: 0, marginsMm }
    assert.throws(() => renderPrn(tpl, { language: 'TSPL', dpi: 203 }, data), /disables gap tracking/)
    const continuous = renderPrn({ ...tpl, mediaMode: 'CONTINUOUS' }, { language: 'TSPL', dpi: 203 }, data)
    assert.ok(continuous.includes('GAP 0 mm, 0 mm'))
    const gapped = renderPrn({ ...tpl, rowGapMm: 2.5 }, { language: 'TSPL', dpi: 203 }, data)
    assert.ok(gapped.includes('GAP 2.5 mm, 0 mm'))
  }
})
