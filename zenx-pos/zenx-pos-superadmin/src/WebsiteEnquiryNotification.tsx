import { useEffect, useState } from 'react'
import { api } from './api'
import { Icon } from './ui'
import { WEBSITE_ENQUIRIES_CHANGED } from './website-enquiries-events'
import './website-enquiries.css'

/** Mounted only inside the authenticated shell. Poll the count, never the inbox. */
export function WebsiteEnquiryNotification({ onOpen }: { onOpen: () => void }) {
  const [count, setCount] = useState<number | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    let pending: AbortController | null = null
    let refreshQueued = false
    async function refresh(force = false) {
      if (!active || document.hidden) return
      if (pending) { if (force) refreshQueued = true; return }
      const controller = new AbortController()
      pending = controller
      try {
        const summary = await api.websiteEnquirySummary(controller.signal)
        if (active && !controller.signal.aborted) { setCount(summary.unreadCount); setFailed(false) }
      } catch {
        if (active && !controller.signal.aborted) setFailed(true)
      } finally {
        if (pending === controller) pending = null
        if (active && refreshQueued) { refreshQueued = false; void refresh() }
      }
    }
    const onFocus = () => { void refresh() }
    const onChange = () => { void refresh(true) }
    const onVisibility = () => {
      if (document.hidden) { refreshQueued = false; pending?.abort() }
      else void refresh(true)
    }
    void refresh()
    const timer = window.setInterval(() => { void refresh() }, 30_000)
    window.addEventListener('focus', onFocus)
    window.addEventListener(WEBSITE_ENQUIRIES_CHANGED, onChange)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      active = false
      pending?.abort()
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener(WEBSITE_ENQUIRIES_CHANGED, onChange)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const description = failed ? 'Unread count unavailable. Open the inbox to review enquiries.' : count === null ? 'Checking unread enquiries.' : `${count} unread ${count === 1 ? 'enquiry' : 'enquiries'}.`
  return <button type="button" className={`enquiry-notification${failed ? ' enquiry-notification--error' : ''}`} onClick={onOpen} aria-label={`Website enquiries. ${description}`} title={description}>
    <Icon name="bell" />
    <span className="enquiry-notification-label">Enquiries</span>
    <span className="enquiry-notification-badge" aria-hidden="true">{failed ? '!' : count === null ? '…' : count > 99 ? '99+' : count}</span>
  </button>
}
