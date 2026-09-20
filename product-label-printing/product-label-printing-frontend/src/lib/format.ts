const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, minimumFractionDigits: 0 })
const num = new Intl.NumberFormat('en-IN')

export const money = (n: number) => inr.format(n)
export const count = (n: number) => num.format(n)
export const pct = (n: number, digits = 1) => `${(n * 100).toFixed(digits)}%`

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}
