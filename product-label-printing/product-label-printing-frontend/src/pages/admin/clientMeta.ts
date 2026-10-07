import { daysBetween, todayIso } from '../../lib/dates'

export const SUBSCRIPTION_LABEL: Record<number, string> = {
  1: 'Quarterly (3 months)',
  2: 'Half yearly (6 months)',
  3: 'Yearly (12 months)',
}

export type ContractState = 'ACTIVE' | 'ENDING' | 'ENDED' | 'NONE'

/** Contract end within 30 days is "ending"; past end is "ended". */
export function contractState(endDate: string | null): ContractState {
  if (!endDate) return 'NONE'
  const days = daysBetween(todayIso(), endDate)
  if (days < 0) return 'ENDED'
  if (days <= 30) return 'ENDING'
  return 'ACTIVE'
}

export const CONTRACT_TAG: Record<ContractState, { color: string; label: string }> = {
  ACTIVE: { color: 'green', label: 'Contract active' },
  ENDING: { color: 'orange', label: 'Ending soon' },
  ENDED: { color: 'red', label: 'Contract ended' },
  NONE: { color: 'default', label: 'No contract dates' },
}

/** Same maths as the backend (client.rules.js) so the form shows what will be saved. */
export function finalAmount(amount: number, discountType: number, discountValue: number, gst: number) {
  let discounted = amount || 0
  if (discountType === 1) discounted -= discountValue || 0
  else if (discountType === 2) discounted -= (discounted * (discountValue || 0)) / 100
  discounted = Math.max(0, discounted)
  return Math.round((discounted + (discounted * gst) / 100) * 100) / 100
}
