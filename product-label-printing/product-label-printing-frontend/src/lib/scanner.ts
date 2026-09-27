import type { Product } from '../types'

// USB barcode scanners act as keyboards: they "type" the code in a fast burst
// and finish with Enter. People type far slower than this.
export const MAX_KEY_GAP_MS = 50
export const MIN_SCAN_LENGTH = 4

/** Collects keystrokes and reports a completed scanner burst. */
export function createScanDetector(maxGap = MAX_KEY_GAP_MS, minLength = MIN_SCAN_LENGTH) {
  let buffer = ''
  let last = 0
  return {
    /** Returns the scanned code when `key` completes a scanner burst, otherwise null. */
    key(key: string, at: number): string | null {
      const fast = at - last <= maxGap
      last = at
      if (key === 'Enter') {
        const code = fast && buffer.length >= minLength ? buffer : null
        buffer = ''
        return code
      }
      if (key.length !== 1) return null // Shift and other modifiers scanners may send
      buffer = fast ? buffer + key : key
      return null
    },
    reset() {
      buffer = ''
    },
  }
}

/** Exact match on anything a printed label's barcode can contain. */
export function findScannedProduct(products: Product[], raw: string): Product | undefined {
  const code = raw.trim().toLowerCase()
  if (!code) return undefined
  return products.find((p) => p.productCode.toLowerCase() === code || p.eanCode?.toLowerCase() === code)
    ?? products.find((p) => p.pluCode?.toLowerCase() === code || p.globalId.toLowerCase() === code)
}
