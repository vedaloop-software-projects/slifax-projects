import { z } from 'zod'

// A letterhead is designed in super admin on an A4 page: a header band at the top and a
// footer band at the bottom, each holding positioned elements (all sizes in mm, relative
// to the band). Invoices and quotations print their own content between the two bands.
export const PAGE = { widthMm: 210, heightMm: 297 } as const
export const FIELD_KINDS = ['companyName', 'companyAddress', 'companyGstin', 'companyEmail', 'companyPhone', 'companyWebsite'] as const
export const ELEMENT_KINDS = ['text', ...FIELD_KINDS, 'image', 'line', 'rect'] as const
export type FieldKind = typeof FIELD_KINDS[number]
export type ElementKind = typeof ELEMENT_KINDS[number]
export type Band = 'header' | 'footer'

const colour = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Colours must be #RRGGBB.')
const mm = (max: number) => z.number().finite().min(0).max(max)
// Logos are resized in the browser; together they must fit the 1 MB request limit.
const image = z.string().max(700_000, 'Each image must be under about 500 KB.').regex(/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/, 'Images must be PNG or JPEG.')

const element = z.object({
  id: z.string().min(1).max(60),
  band: z.enum(['header', 'footer']),
  kind: z.enum(ELEMENT_KINDS),
  xMm: mm(PAGE.widthMm), yMm: mm(120), wMm: mm(PAGE.widthMm), hMm: mm(120),
  fontMm: z.number().finite().min(1).max(25).optional(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  align: z.enum(['left', 'center', 'right']).optional(),
  color: colour.optional(),
  text: z.string().max(500).optional(),
  prefix: z.string().max(40).optional(),
  fill: colour.nullable().optional(),
  stroke: colour.nullable().optional(),
  strokeMm: z.number().finite().min(0).max(5).optional(),
  radiusMm: z.number().finite().min(0).max(20).optional(),
  src: image.optional(),
})

export const letterheadSchema = z.object({
  version: z.literal(1),
  company: z.object({
    name: z.string().trim().min(1, 'Enter the company name.').max(120),
    address: z.string().trim().max(300),
    gstin: z.string().trim().toUpperCase().regex(/^$|^[0-9]{2}[A-Z0-9]{13}$/, 'GSTIN must be 15 characters.'),
    email: z.string().trim().max(120).regex(/^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address.'),
    phone: z.string().trim().max(40),
    website: z.string().trim().max(120),
  }),
  headerMm: z.number().finite().min(15).max(120),
  footerMm: z.number().finite().min(0).max(60),
  accent: colour,
  elements: z.array(element).max(60, 'A letterhead can have at most 60 elements.'),
}).superRefine((value, context) => {
  if (value.elements.filter(item => item.kind === 'image').length > 3) context.addIssue({ code: 'custom', message: 'Use at most 3 images.' })
  value.elements.forEach((item, index) => {
    const height = item.band === 'header' ? value.headerMm : value.footerMm
    if (item.xMm + item.wMm > PAGE.widthMm + 0.5 || item.yMm + item.hMm > height + 0.5) context.addIssue({ code: 'custom', path: ['elements', index], message: `An element sits outside the ${item.band}. Move it inside before saving.` })
    if (item.kind === 'image' && !item.src) context.addIssue({ code: 'custom', path: ['elements', index], message: 'Choose an image for every image element.' })
  })
})
export type Letterhead = z.infer<typeof letterheadSchema>
export type LetterheadElement = Letterhead['elements'][number]

export function fieldValue(letterhead: Letterhead, kind: ElementKind) {
  const company = letterhead.company
  return ({ companyName: company.name, companyAddress: company.address, companyGstin: company.gstin, companyEmail: company.email, companyPhone: company.phone, companyWebsite: company.website } as Record<string, string>)[kind]
}

/** Printed text of a text or company-field element; empty when the field is blank. */
export function elementText(letterhead: Letterhead, element: LetterheadElement) {
  if (element.kind === 'text') return element.text ?? ''
  const value = fieldValue(letterhead, element.kind)
  return value ? `${element.prefix ?? ''}${value}` : ''
}

// Used until a super admin saves a design.
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

export function parseLetterhead(value: unknown) {
  return letterheadSchema.safeParse(value)
}
