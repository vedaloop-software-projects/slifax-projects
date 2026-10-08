// Printer built-in fonts for direct PRN printing. Thermal printers cannot use PC fonts, so a
// text element can pick one of the printer's own fonts. Each choice maps to the matching
// resident font of each printer language, so a template stays printer-independent:
//
//   choice    ZPL (Zebra)        TSPL (TSC / TVS)
//   standard  font 0 (scalable)  bitmap fonts 1–5, best size picked automatically
//   smooth    font 0             font 0 (same scalable typeface, sized in points)
//   ocrb      font E             fonts 6 / 7
//   ocra      font H             font 8
//
// Bitmap fonts only grow in whole steps (1×, 2×, …), so sizes snap to the nearest step.

import type { Measure } from './textFit'

export type PrinterFontId = 'standard' | 'smooth' | 'ocrb' | 'ocra'

export const PRINTER_FONTS: { id: PrinterFontId; label: string; description: string; previewCss?: string }[] = [
  { id: 'standard', label: 'Standard', description: 'Printer default. The preview uses the screen font.' },
  { id: 'smooth', label: 'Smooth', description: 'Scalable printer font: ZPL font 0, TSPL font 0.', previewCss: '"Arial Narrow", "Roboto Condensed", "Helvetica Neue", Arial, sans-serif' },
  { id: 'ocrb', label: 'OCR-B', description: 'ZPL font E, TSPL font 6 / 7.', previewCss: '"OCR B", "OCR-B", "OCR B Std", "Courier New", monospace' },
  { id: 'ocra', label: 'OCR-A', description: 'ZPL font H, TSPL font 8.', previewCss: '"OCR A Extended", "OCR A", "OCR-A", "Courier New", monospace' },
]

export const DEFAULT_PRINTER_FONT: PrinterFontId = 'standard'
const IDS = new Set(PRINTER_FONTS.map((f) => f.id))
export const isPrinterFont = (v: unknown): v is PrinterFontId => typeof v === 'string' && IDS.has(v as PrinterFontId)

/** CSS used to preview a printer font on screen, or undefined for the standard font. */
export const printerFontPreview = (id?: string) => PRINTER_FONTS.find((f) => f.id === id)?.previewCss

interface BitmapFont {
  id: string
  h: number
  w: number
}

// TSPL resident bitmap fonts (dots): id, height, width.
export const TSPL_FONTS: BitmapFont[] = [
  { id: '1', h: 12, w: 8 },
  { id: '2', h: 20, w: 12 },
  { id: '3', h: 24, w: 16 },
  { id: '4', h: 32, w: 24 },
  { id: '5', h: 48, w: 32 },
]
const TSPL_OCRB: BitmapFont[] = [
  { id: '6', h: 19, w: 14 },
  { id: '7', h: 27, w: 21 },
]
const TSPL_OCRA: BitmapFont[] = [{ id: '8', h: 25, w: 14 }]

/** Largest font × multiplier whose height fits `dots`; the smallest font at 1× when nothing fits. */
export function tsplFontFor(dots: number, fonts: BitmapFont[] = TSPL_FONTS) {
  let best = { font: fonts[0], mult: 1, height: fonts[0].h }
  for (const font of fonts) {
    for (let mult = 1; mult <= 4; mult++) {
      const height = font.h * mult
      // On a tie prefer the native size: scaled bitmap fonts print blockier.
      if (height <= dots && (height > best.height || (height === best.height && mult < best.mult))) best = { font, mult, height }
    }
  }
  return best
}

/**
 * Zebra font 0 is proportional; with the width set to 75% of the height (as we do), an
 * average character is about 0.58 × the height. Slightly generous so text never overruns.
 */
export const ZPL_CHAR_WIDTH = 0.58
/** Scalable condensed font (TSPL font 0) at width = height in points: ~0.5 × height per character. */
const TSPL_SMOOTH_CHAR_WIDTH = 0.5

type Align = 'left' | 'center' | 'right' | undefined

export interface PrinterTextSpec {
  /** Width in mm of `text` at text height `fontMm`, as this printer will draw it. */
  measure: Measure
  /** Height in dots one line takes at `fontMm` (before line spacing). */
  lineDots: (fontMm: number) => number
  /** Printer command drawing one line inside a box `boxW` dots wide. */
  command: (x: number, y: number, boxW: number, line: string, fontMm: number, align: Align) => string
}

/** Everything needed to fit and draw text in one printer font. */
export function printerTextSpec(language: 'ZPL' | 'TSPL', font: PrinterFontId = 'standard', dpi = 203): PrinterTextSpec {
  const k = dpi === 300 ? 12 : 8
  const dots = (mm: number) => Math.max(8, Math.round(mm * k))
  const shiftFor = (align: Align, boxW: number, textW: number) =>
    align === 'center' ? Math.max(0, Math.round((boxW - textW) / 2)) : align === 'right' ? Math.max(0, boxW - textW) : 0
  const zplJustify = (align: Align) => (align === 'center' ? 'C' : align === 'right' ? 'R' : 'L')

  if (language === 'ZPL') {
    if (font === 'ocrb' || font === 'ocra') {
      // Bitmap fonts E (OCR-B) and H (OCR-A); base cell differs at 300 dpi.
      const base = font === 'ocrb' ? (dpi === 300 ? { h: 42, w: 20 } : { h: 28, w: 15 }) : dpi === 300 ? { h: 34, w: 22 } : { h: 21, w: 13 }
      const letter = font === 'ocrb' ? 'E' : 'H'
      const mag = (mm: number) => Math.min(10, Math.max(1, Math.round(dots(mm) / base.h)))
      return {
        measure: (t, f) => (t.length * base.w * mag(f)) / k,
        lineDots: (f) => base.h * mag(f),
        command: (x, y, boxW, line, f, align) => `^FO${x},${y}^A${letter}N,${base.h * mag(f)},${base.w * mag(f)}^FB${boxW},1,0,${zplJustify(align)},0^FD${line}^FS`,
      }
    }
    // standard and smooth: scalable font 0; the field block keeps the line inside the box.
    return {
      measure: (t, f) => (t.length * dots(f) * ZPL_CHAR_WIDTH) / k,
      lineDots: (f) => dots(f),
      command: (x, y, boxW, line, f, align) => `^FO${x},${y}^A0N,${dots(f)},${Math.round(dots(f) * 0.75)}^FB${boxW},1,0,${zplJustify(align)},0^FD${line}^FS`,
    }
  }

  if (font === 'smooth') {
    // TSPL font "0": scalable; width and height are given in points (1 pt = 1/72 inch).
    const points = (mm: number) => Math.max(4, Math.round((dots(mm) * 72) / dpi))
    const width = (t: string, f: number) => Math.round(t.length * dots(f) * TSPL_SMOOTH_CHAR_WIDTH)
    return {
      measure: (t, f) => width(t, f) / k,
      lineDots: (f) => dots(f),
      command: (x, y, boxW, line, f, align) => `TEXT ${x + shiftFor(align, boxW, width(line, f))},${y},"0",0,${points(f)},${points(f)},"${line}"`,
    }
  }

  const table = font === 'ocrb' ? TSPL_OCRB : font === 'ocra' ? TSPL_OCRA : TSPL_FONTS
  return {
    measure: (t, f) => {
      const { font: bf, mult } = tsplFontFor(dots(f), table)
      return (t.length * bf.w * mult) / k
    },
    lineDots: (f) => tsplFontFor(dots(f), table).height,
    command: (x, y, boxW, line, f, align) => {
      const { font: bf, mult } = tsplFontFor(dots(f), table)
      return `TEXT ${x + shiftFor(align, boxW, line.length * bf.w * mult)},${y},"${bf.id}",0,${mult},${mult},"${line}"`
    },
  }
}

/**
 * One label with a sample line per printer font, to check on paper which fonts a printer
 * really has (a missing font prints blank, garbled, or in the default font).
 */
export function fontTestPrn(language: 'ZPL' | 'TSPL', dpi: number, widthMm: number, heightMm: number): string {
  const k = dpi === 300 ? 12 : 8
  const fontMm = Math.min(3, (heightMm - 2) / PRINTER_FONTS.length / 1.3)
  const boxW = Math.round((widthMm - 2) * k)
  const lines = PRINTER_FONTS.map((f, i) => {
    const spec = printerTextSpec(language, f.id, dpi)
    const y = Math.round((1 + i * fontMm * 1.3) * k)
    return spec.command(8, y, boxW, `${f.label.toUpperCase()} 0123456789`, fontMm, 'left')
  })
  return language === 'ZPL'
    ? ['^XA', `^PW${Math.round(widthMm * k)}`, `^LL${Math.round(heightMm * k)}`, '^CI28', ...lines, '^PQ1,0,1,Y', '^XZ', ''].join('\r\n')
    : [`SIZE ${widthMm} mm, ${heightMm} mm`, 'GAP 2 mm, 0 mm', 'DIRECTION 1', 'REFERENCE 0,0', 'CLS', ...lines, 'PRINT 1,1', ''].join('\r\n')
}
