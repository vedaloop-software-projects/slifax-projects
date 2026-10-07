// Fits label text into its box. Product names can be long (zenx-pos allows 200 characters),
// and text must never run past its box: on 2-up rolls it would print onto the next label.
// Order: shrink (down to `minScale` of the designed size) → wrap onto more lines if the box
// is tall enough → cut the last line with "..". Each renderer passes its own `measure`
// (screen font, Zebra font, TSPL bitmap font) so the result matches what it draws.

/** Width of `text` in mm at text height `fontMm`. */
export type Measure = (text: string, fontMm: number) => number

export interface FitOptions {
  widthMm: number
  heightMm: number
  fontMm: number
  measure: Measure
  /** Smallest size allowed, as a share of the designed size. */
  minScale?: number
  /** Line pitch as a multiple of the text height. */
  lineHeight?: number
  /** Allow more than one line when the box is tall enough. */
  wrap?: boolean
}

export interface FitResult {
  fontMm: number
  lines: string[]
  /** True when text had to be cut. */
  truncated: boolean
}

export const ELLIPSIS = '..'

/** Average-width estimate for fonts we cannot measure (ratio = char width / text height). */
export const approxMeasure = (ratio: number): Measure => (text, fontMm) => text.length * fontMm * ratio

/** Longest prefix of `text` (plus ".." when cut) that fits `widthMm`. */
export function truncateToWidth(text: string, widthMm: number, fontMm: number, measure: Measure): string {
  if (measure(text, fontMm) <= widthMm) return text
  let lo = 0
  let hi = text.length
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (measure(text.slice(0, mid).trimEnd() + ELLIPSIS, fontMm) <= widthMm) lo = mid
    else hi = mid - 1
  }
  return lo > 0 ? text.slice(0, lo).trimEnd() + ELLIPSIS : ''
}

/** Greedy word wrap; words wider than the box are split by character. */
export function wrapText(text: string, widthMm: number, fontMm: number, measure: Measure): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word
    if (measure(candidate, fontMm) <= widthMm) {
      line = candidate
      continue
    }
    if (line) lines.push(line)
    if (measure(word, fontMm) <= widthMm) {
      line = word
      continue
    }
    // A single word longer than the box: break it.
    let part = ''
    for (const ch of word) {
      if (part && measure(part + ch, fontMm) > widthMm) {
        lines.push(part)
        part = ch
      } else part += ch
    }
    line = part
  }
  if (line) lines.push(line)
  return lines
}

export function fitText(text: string, { widthMm, heightMm, fontMm, measure, minScale = 0.6, lineHeight = 1.15, wrap = true }: FitOptions): FitResult {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean || widthMm <= 0) return { fontMm, lines: clean ? [clean] : [], truncated: false }
  const minFont = fontMm * minScale
  const maxLines = (size: number) => (wrap ? Math.max(1, Math.floor((heightMm + 1e-6) / (size * lineHeight))) : 1)

  // 1. Designed size, one line.
  if (measure(clean, fontMm) <= widthMm) return { fontMm, lines: [clean], truncated: false }

  // 2. Shrink in 5% steps; at each size try one line, then as many lines as the box holds.
  for (let size = fontMm * 0.95; size >= minFont - 1e-9; size -= fontMm * 0.05) {
    if (measure(clean, size) <= widthMm) return { fontMm: size, lines: [clean], truncated: false }
    const lines = wrapText(clean, widthMm, size, measure)
    if (lines.length <= maxLines(size)) return { fontMm: size, lines, truncated: false }
  }

  // 3. Smallest size and still too long: keep the lines that fit and cut the last one.
  const size = minFont
  const lines = wrapText(clean, widthMm, size, measure)
  const room = maxLines(size)
  const kept = lines.slice(0, room)
  const rest = lines.slice(room - 1).join(' ')
  kept[kept.length - 1] = truncateToWidth(rest, widthMm, size, measure)
  return { fontMm: size, lines: kept.filter(Boolean), truncated: true }
}
