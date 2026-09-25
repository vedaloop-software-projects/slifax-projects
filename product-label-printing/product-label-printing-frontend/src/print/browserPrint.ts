/** Observe dialog closure without a timer that could remove labels mid-print. */
export function watchPrintDialog(win: Window, done: () => void): () => void {
  const media = win.matchMedia('print')
  let closed = false
  let started = false
  let lostFocus = false
  const dispose = () => {
    win.removeEventListener('beforeprint', before)
    win.removeEventListener('afterprint', finish)
    win.removeEventListener('blur', blur)
    win.removeEventListener('focus', focus)
    win.removeEventListener('pointerdown', interaction, true)
    win.removeEventListener('keydown', interaction, true)
    media.removeEventListener('change', change)
  }
  const finish = () => {
    if (closed) return
    closed = true
    dispose()
    done()
  }
  const before = () => { started = true }
  const blur = () => { lostFocus = true }
  const focus = () => { if ((started || lostFocus) && !media.matches) finish() }
  const change = () => {
    if (media.matches) started = true
    else if (started) finish()
  }
  // Some system dialogs omit afterprint and focus events. The next interaction
  // with the actual page proves control has returned, so the sheet can be reset.
  const interaction = () => { if (!media.matches) finish() }
  win.addEventListener('beforeprint', before)
  win.addEventListener('afterprint', finish)
  win.addEventListener('blur', blur)
  win.addEventListener('focus', focus)
  win.addEventListener('pointerdown', interaction, true)
  win.addEventListener('keydown', interaction, true)
  media.addEventListener('change', change)
  return () => { closed = true; dispose() }
}
