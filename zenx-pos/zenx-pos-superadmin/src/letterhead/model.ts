// Letterhead design shared with the backend (models/documents/letterhead.ts): an A4 page
// with a header band and a footer band of positioned elements, all in mm relative to the
// band. Invoices and quotations print their content between the bands.
export const PAGE = { widthMm: 210, heightMm: 297 } as const
export type Band = 'header' | 'footer'
export type FieldKind = 'companyName' | 'companyAddress' | 'companyGstin' | 'companyEmail' | 'companyPhone' | 'companyWebsite'
export type ElementKind = 'text' | FieldKind | 'image' | 'line' | 'rect'
export type Align = 'left' | 'center' | 'right'

export interface LetterheadElement {
  id: string; band: Band; kind: ElementKind
  xMm: number; yMm: number; wMm: number; hMm: number
  fontMm?: number; bold?: boolean; italic?: boolean; align?: Align; color?: string
  text?: string; prefix?: string
  fill?: string | null; stroke?: string | null; strokeMm?: number; radiusMm?: number
  src?: string
}
export interface Company { name: string; address: string; gstin: string; email: string; phone: string; website: string }
export interface Letterhead { version: 1; company: Company; headerMm: number; footerMm: number; accent: string; elements: LetterheadElement[] }
export type Frame = { width: number; height: number }

export const KIND_INFO: Record<ElementKind, { label: string; shape: 'text' | 'image' | 'line' | 'rect'; field?: keyof Company; hint: string }> = {
  companyName: { label: 'Company name', shape: 'text', field: 'name', hint: 'From company details' },
  companyAddress: { label: 'Address', shape: 'text', field: 'address', hint: 'From company details' },
  companyGstin: { label: 'GSTIN', shape: 'text', field: 'gstin', hint: 'Prints with a prefix' },
  companyEmail: { label: 'Email', shape: 'text', field: 'email', hint: 'From company details' },
  companyPhone: { label: 'Phone', shape: 'text', field: 'phone', hint: 'From company details' },
  companyWebsite: { label: 'Website', shape: 'text', field: 'website', hint: 'From company details' },
  text: { label: 'Text', shape: 'text', hint: 'Your own words' },
  image: { label: 'Logo / image', shape: 'image', hint: 'PNG or JPEG' },
  line: { label: 'Line', shape: 'line', hint: 'Divider rule' },
  rect: { label: 'Box', shape: 'rect', hint: 'Colour band or frame' },
}
export const PALETTE: ElementKind[] = ['companyName', 'companyAddress', 'companyGstin', 'companyEmail', 'companyPhone', 'companyWebsite', 'text', 'image', 'line', 'rect']
export const shapeOf = (kind: ElementKind) => KIND_INFO[kind].shape
export const PT_PER_MM = 72 / 25.4

export const DEFAULT_LETTERHEAD: Letterhead = {
  version: 1,
  company: { name: 'ZenxPOS', address: '', gstin: '', email: '', phone: '', website: '' },
  headerMm: 34, footerMm: 14, accent: '#264B79',
  elements: [
    { id: 'name', band: 'header', kind: 'companyName', xMm: 15, yMm: 9, wMm: 110, hMm: 10, fontMm: 7, bold: true, align: 'left', color: '#264B79' },
    { id: 'address', band: 'header', kind: 'companyAddress', xMm: 15, yMm: 20, wMm: 110, hMm: 5, fontMm: 3.2, align: 'left', color: '#667085' },
    { id: 'gstin', band: 'header', kind: 'companyGstin', xMm: 15, yMm: 25, wMm: 110, hMm: 5, fontMm: 3.2, align: 'left', color: '#667085', prefix: 'GSTIN: ' },
    { id: 'rule', band: 'header', kind: 'line', xMm: 15, yMm: 32, wMm: 180, hMm: 1, stroke: '#D0D5DD', strokeMm: 0.3 },
    { id: 'footer-note', band: 'footer', kind: 'text', xMm: 15, yMm: 4, wMm: 180, hMm: 6, fontMm: 3, align: 'center', color: '#667085', text: 'Thank you for choosing ZenxPOS.' },
  ],
}

export const bandFrame = (letterhead: Letterhead, band: Band): Frame => ({ width: PAGE.widthMm, height: band === 'header' ? letterhead.headerMm : letterhead.footerMm })

/** Text an element prints; company fields use the details card (empty when blank). */
export function elementText(letterhead: Letterhead, element: LetterheadElement) {
  if (element.kind === 'text') return element.text ?? ''
  const field = KIND_INFO[element.kind].field
  const value = field ? letterhead.company[field] : ''
  return value ? `${element.prefix ?? ''}${value}` : ''
}

let sequence = 0
export function newElementId() {
  sequence = (sequence + 1) % 1e6
  return `el_${Date.now().toString(36)}${sequence.toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

const round1 = (value: number) => Math.round(value * 10) / 10
const floor1 = (value: number) => Math.floor(value * 10 + 1e-6) / 10

/** Keep an element inside its band and above a usable minimum size. */
export function clampElement(element: LetterheadElement, frame: Frame): LetterheadElement {
  const shape = shapeOf(element.kind)
  const fontMm = shape === 'text' ? Math.min(25, Math.max(1, element.fontMm ?? 3.5)) : undefined
  const minW = shape === 'line' ? 1 : shape === 'image' ? 4 : 3
  const minH = shape === 'text' ? fontMm! * 1.05 : shape === 'line' ? 0.5 : shape === 'image' ? 4 : 1
  const wMm = floor1(Math.min(frame.width, Math.max(minW, element.wMm)))
  const hMm = floor1(Math.min(frame.height, Math.max(minH, element.hMm)))
  const xMm = Math.min(floor1(frame.width - wMm), Math.max(0, round1(element.xMm)))
  const yMm = Math.min(floor1(frame.height - hMm), Math.max(0, round1(element.yMm)))
  return { ...element, xMm, yMm, wMm, hMm, ...(fontMm !== undefined ? { fontMm: round1(fontMm) } : {}) }
}

/** A new element of `kind` in `band`, centred on `at` (mm) when dropped. */
export function defaultElement(kind: ElementKind, band: Band, frame: Frame, accent: string, at?: { xMm: number; yMm: number }): LetterheadElement {
  const base = { id: newElementId(), band, kind, xMm: 15, yMm: 2 }
  const shape = shapeOf(kind)
  let element: LetterheadElement
  if (shape === 'image') element = { ...base, wMm: 22, hMm: Math.min(22, frame.height - 4), align: 'left' }
  else if (shape === 'line') element = { ...base, wMm: 180, hMm: 1, stroke: accent, strokeMm: 0.4 }
  else if (shape === 'rect') element = { ...base, xMm: 0, yMm: 0, wMm: 210, hMm: Math.min(6, frame.height), fill: accent, stroke: null, strokeMm: 0, radiusMm: 0 }
  else {
    const fontMm = kind === 'companyName' ? 7 : 3.2
    element = { ...base, wMm: kind === 'companyName' ? 110 : 90, hMm: round1(fontMm * 1.5), fontMm, bold: kind === 'companyName', align: 'left', color: kind === 'companyName' ? accent : '#475467',
      ...(kind === 'text' ? { text: 'Your text' } : {}), ...(kind === 'companyGstin' ? { prefix: 'GSTIN: ' } : {}), ...(kind === 'companyPhone' ? { prefix: 'Ph: ' } : {}) }
  }
  if (at) element = { ...element, xMm: at.xMm - element.wMm / 2, yMm: at.yMm - element.hMm / 2 }
  return clampElement(element, frame)
}

/** Elements that no longer fit after a band was made shorter. */
export const outsideBand = (letterhead: Letterhead) => letterhead.elements.filter(element => element.yMm + element.hMm > bandFrame(letterhead, element.band).height + 0.05)
