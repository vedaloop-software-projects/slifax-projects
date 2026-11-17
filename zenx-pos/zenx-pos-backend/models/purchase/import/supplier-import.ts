import { readSpreadsheet, writeWorkbook } from './spreadsheet.ts'

// Supplier import template: one column per supplier field, in form order.
export const SUPPLIER_COLUMNS = [
  { key: 'code', title: 'Supplier Code', required: true, width: 16 },
  { key: 'name', title: 'Supplier Name', required: true, width: 30 },
  { key: 'contactPerson', title: 'Contact Person', required: false, width: 22 },
  { key: 'mobile', title: 'Mobile', required: true, width: 14 },
  { key: 'alternateMobile', title: 'Alternate Mobile', required: false, width: 16 },
  { key: 'email', title: 'Email', required: false, width: 26 },
  { key: 'state', title: 'State', required: true, width: 22 },
  { key: 'city', title: 'City', required: false, width: 18 },
  { key: 'pincode', title: 'Pin Code', required: false, width: 10 },
  { key: 'address', title: 'Address', required: false, width: 36 },
  { key: 'gstRegistration', title: 'GST Registration', required: true, width: 18 },
  { key: 'gstin', title: 'GST No', required: false, width: 18 },
  { key: 'pan', title: 'PAN', required: false, width: 13 },
  { key: 'creditDays', title: 'Credit Days', required: false, width: 12 },
  { key: 'openingBalance', title: 'Opening Balance', required: false, width: 16 },
  { key: 'visitDay', title: 'Day of Visit', required: false, width: 14 },
] as const
export type SupplierColumnKey = (typeof SUPPLIER_COLUMNS)[number]['key']
export const SUPPLIER_COLUMN_TITLE = Object.fromEntries(SUPPLIER_COLUMNS.map(column => [column.key, column.title])) as Record<SupplierColumnKey, string>

const GST_LABELS = ['Registered', 'Composition', 'Unregistered']
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export const MAX_IMPORT_ROWS = 500

const letter = (index: number) => String.fromCharCode(65 + index)

// Template workbook: the supplier sheet (header + dropdowns for State, GST registration and
// Day of Visit), a hidden list sheet feeding the dropdowns, and a help sheet.
export function supplierTemplate(states: string[]) {
  const col = (key: SupplierColumnKey) => letter(SUPPLIER_COLUMNS.findIndex(column => column.key === key))
  const rows = Math.max(states.length, GST_LABELS.length, WEEKDAYS.length)
  const lists = [['States', 'GST Registration', 'Day of Visit'], ...Array.from({ length: rows }, (_v, i) => [states[i] ?? '', GST_LABELS[i] ?? '', WEEKDAYS[i] ?? ''])]
  const range = (key: SupplierColumnKey) => `${col(key)}2:${col(key)}${MAX_IMPORT_ROWS + 1}`
  return writeWorkbook([
    {
      name: 'Suppliers', headerRows: 1, widths: SUPPLIER_COLUMNS.map(column => column.width),
      rows: [SUPPLIER_COLUMNS.map(column => (column.required ? `${column.title} *` : column.title))],
      validations: [
        { range: range('state'), formula: `Lists!$A$2:$A$${states.length + 1}` },
        { range: range('gstRegistration'), formula: `Lists!$B$2:$B$${GST_LABELS.length + 1}` },
        { range: range('visitDay'), formula: `Lists!$C$2:$C$${WEEKDAYS.length + 1}` },
      ],
    },
    { name: 'Lists', rows: lists, hidden: true },
    {
      name: 'How to fill', widths: [22, 90], headerRows: 1,
      rows: [
        ['Column', 'What to enter'],
        ['Supplier Code *', 'Unique code for the supplier, for example SUP001.'],
        ['Supplier Name *', 'Name of the supplier business.'],
        ['Mobile *', '10-digit mobile number. Alternate Mobile is optional, also 10 digits.'],
        ['Email', 'Optional. A valid email address.'],
        ['State *', 'Pick from the dropdown.'],
        ['Pin Code', 'Optional. 6 digits.'],
        ['GST Registration *', 'Registered, Composition or Unregistered (dropdown).'],
        ['GST No', 'Required unless Unregistered. 15 characters, for example 36ABCDE1234F1Z5.'],
        ['PAN', 'Optional. Filled from the GST No when left empty.'],
        ['Credit Days', 'Optional. Whole number, 0 or more. Empty = 0.'],
        ['Opening Balance', 'Optional. Amount you already owe the supplier, 0 or more. Empty = 0.'],
        ['Day of Visit', 'Optional. Monday to Sunday (dropdown).'],
        ['', `Fill one supplier per row on the Suppliers sheet, at most ${MAX_IMPORT_ROWS} rows. Columns marked * are required.`],
      ],
    },
  ])
}

const normalise = (value: string) => value.toLowerCase().replace(/\*/g, '').replace(/[^a-z0-9]/g, '')
const HEADER_ALIASES: Record<string, SupplierColumnKey> = {
  ...Object.fromEntries(SUPPLIER_COLUMNS.map(column => [normalise(column.title), column.key])),
  code: 'code', suppliername: 'name', name: 'name', contact: 'contactPerson', phone: 'mobile', mobileno: 'mobile', alternatemobileno: 'alternateMobile',
  emailid: 'email', pincode: 'pincode', pin: 'pincode', gstregistrationtype: 'gstRegistration', gstin: 'gstin', gstnumber: 'gstin', panno: 'pan',
  creditdays: 'creditDays', openingbalance: 'openingBalance', dayofvisit: 'visitDay', visitday: 'visitDay',
}

export type ImportRow = { row: number; values: Record<SupplierColumnKey, string> }

// Rows of the uploaded sheet keyed by column (header matched by title, case-insensitive).
export function readSupplierRows(buffer: Buffer): { rows: ImportRow[]; missing: string[] } {
  const sheet = readSpreadsheet(buffer)
  const headerIndex = sheet.findIndex(row => row.some(cell => cell.trim() !== ''))
  if (headerIndex < 0) return { rows: [], missing: SUPPLIER_COLUMNS.filter(column => column.required).map(column => column.title) }
  const header = sheet[headerIndex]!.map(cell => HEADER_ALIASES[normalise(cell)] ?? null)
  const missing = SUPPLIER_COLUMNS.filter(column => column.required && !header.includes(column.key)).map(column => column.title)
  const rows: ImportRow[] = []
  for (let i = headerIndex + 1; i < sheet.length; i++) {
    const cells = sheet[i] ?? []
    if (!cells.some(cell => cell && cell.trim() !== '')) continue
    const values = Object.fromEntries(SUPPLIER_COLUMNS.map(column => [column.key, ''])) as Record<SupplierColumnKey, string>
    header.forEach((key, index) => { if (key) values[key] = (cells[index] ?? '').trim() })
    rows.push({ row: i + 1, values })
  }
  return { rows, missing }
}

// The body the supplier form would send, from one spreadsheet row.
export function supplierBody(values: Record<SupplierColumnKey, string>, stateIdByName: Map<string, number>) {
  const blank = (value: string) => (value === '' ? undefined : value)
  const gst = values.gstRegistration.toLowerCase().trim()
  const day = WEEKDAYS.find(name => name.toLowerCase() === values.visitDay.toLowerCase().trim() || name.slice(0, 3).toLowerCase() === values.visitDay.toLowerCase().trim())
  return {
    code: values.code, name: values.name, contactPerson: blank(values.contactPerson), mobile: values.mobile.replace(/\s+/g, ''),
    alternateMobile: blank(values.alternateMobile.replace(/\s+/g, '')), email: blank(values.email),
    stateId: values.state ? stateIdByName.get(values.state.toLowerCase().trim()) ?? -1 : '',
    city: blank(values.city), pincode: blank(values.pincode), address: blank(values.address),
    gstRegistration: gst || undefined, gstin: blank(values.gstin), pan: blank(values.pan),
    creditDays: values.creditDays === '' ? 0 : values.creditDays, openingBalance: values.openingBalance === '' ? 0 : values.openingBalance.replace(/,/g, ''),
    visitDay: values.visitDay === '' ? null : day ?? values.visitDay, status: 1,
  }
}
