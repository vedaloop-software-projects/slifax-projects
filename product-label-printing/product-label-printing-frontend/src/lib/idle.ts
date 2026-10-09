// Inactivity sign-out. The last activity time is shared through localStorage, so working in
// one tab keeps the other tabs signed in too.

export const IDLE_LIMIT_MS = 5 * 60 * 1000
const KEY = 'sl-last-activity'

export function markActivity(now = Date.now()) {
  try {
    localStorage.setItem(KEY, String(now))
  } catch {
    /* storage unavailable: this tab's own timer still runs */
  }
}

export function lastActivity(): number | null {
  try {
    const v = Number(localStorage.getItem(KEY))
    return Number.isFinite(v) && v > 0 ? v : null
  } catch {
    return null
  }
}

/** True when nothing has happened for longer than the limit. */
export const isIdle = (last: number | null, now = Date.now(), limit = IDLE_LIMIT_MS) => last !== null && now - last >= limit
