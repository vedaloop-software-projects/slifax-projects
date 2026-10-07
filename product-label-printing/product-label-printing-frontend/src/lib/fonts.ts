// Font library for label text. Each element stores the font `id`; renderers turn it into
// CSS. To add a font later, add an entry here (and load it, e.g. with an @font-face rule,
// if it is not a system font). These five ship with Windows, so every shop PC renders them
// identically without downloading anything.
//
// Scope: fonts apply to the screen preview, browser print and PDF. Direct PRN printing uses
// the printer's built-in fonts (thermal printers cannot use PC fonts unless they are
// downloaded to the printer, which this library may support later).

export interface LabelFont {
  id: string
  label: string
  /** CSS font-family stack, with close fallbacks. */
  css: string
}

export const LABEL_FONTS: LabelFont[] = [
  { id: 'arial', label: 'Arial', css: 'Arial, Helvetica, sans-serif' },
  { id: 'verdana', label: 'Verdana', css: 'Verdana, Geneva, sans-serif' },
  { id: 'tahoma', label: 'Tahoma', css: 'Tahoma, "Segoe UI", Geneva, sans-serif' },
  { id: 'times', label: 'Times New Roman', css: '"Times New Roman", Times, serif' },
  { id: 'courier', label: 'Courier New', css: '"Courier New", Courier, monospace' },
]

export const DEFAULT_FONT_ID = 'arial'

const BY_ID = new Map(LABEL_FONTS.map((f) => [f.id, f]))

export const isLabelFont = (id: unknown): id is string => typeof id === 'string' && BY_ID.has(id)

/** CSS font-family for an element; unknown or unset ids fall back to the default. */
export function fontCss(id?: string): string {
  return (id && BY_ID.get(id)?.css) || BY_ID.get(DEFAULT_FONT_ID)!.css
}
