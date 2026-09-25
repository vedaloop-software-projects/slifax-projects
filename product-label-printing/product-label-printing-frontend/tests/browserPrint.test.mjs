import { test } from 'node:test'
import assert from 'node:assert/strict'
import { watchPrintDialog } from '../src/print/browserPrint.ts'

function browser() {
  const media = new EventTarget()
  media.matches = false
  const win = new EventTarget()
  win.matchMedia = () => media
  const emit = (event) => win.dispatchEvent(new Event(event))
  const change = (matches) => { media.matches = matches; media.dispatchEvent(new Event('change')) }
  return { win, emit, change }
}

test('two successive print dialogs clean up once each', () => {
  const { win, emit } = browser()
  let completed = 0
  for (let i = 0; i < 2; i++) {
    watchPrintDialog(win, () => completed++)
    emit('beforeprint')
    emit('afterprint')
    emit('focus')
    emit('pointerdown')
    assert.equal(completed, i + 1)
  }
})
test('missing afterprint recovers when focus returns after the dialog', () => {
  const { win, emit, change } = browser()
  let completed = 0
  watchPrintDialog(win, () => completed++)
  emit('focus')
  assert.equal(completed, 0)
  emit('beforeprint')
  emit('blur')
  emit('focus')
  assert.equal(completed, 1)
  change(false)
  emit('afterprint')
  assert.equal(completed, 1)
})
test('print media exit resets a dialog without afterprint', () => {
  const { win, change } = browser()
  let completed = 0
  watchPrintDialog(win, () => completed++)
  change(true)
  assert.equal(completed, 0)
  change(false)
  assert.equal(completed, 1)
})
test('page interaction recovers missing events without clearing while print media is active', () => {
  const { win, emit, change } = browser()
  let completed = 0
  watchPrintDialog(win, () => completed++)
  change(true)
  emit('pointerdown')
  emit('keydown')
  assert.equal(completed, 0)
  // Simulate a browser returning without media/afterprint/focus notifications.
  win.matchMedia().matches = false
  emit('pointerdown')
  assert.equal(completed, 1)
})
test('disposing an old request prevents it from clearing a new print request', () => {
  const { win, emit } = browser()
  let old = 0, current = 0
  const dispose = watchPrintDialog(win, () => old++)
  dispose()
  watchPrintDialog(win, () => current++)
  emit('afterprint')
  assert.equal(old, 0)
  assert.equal(current, 1)
})
