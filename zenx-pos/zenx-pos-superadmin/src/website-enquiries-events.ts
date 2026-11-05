export const WEBSITE_ENQUIRIES_CHANGED = 'zenxpos:website-enquiries-changed'

export function notifyWebsiteEnquiriesChanged() {
  window.dispatchEvent(new Event(WEBSITE_ENQUIRIES_CHANGED))
}
