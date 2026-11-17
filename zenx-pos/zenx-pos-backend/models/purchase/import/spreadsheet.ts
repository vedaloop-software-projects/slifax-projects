import { crc32, inflateRawSync } from 'node:zlib'

// Minimal .xlsx reader/writer (Office Open XML) and CSV reader, without dependencies.
// Reading: the first worksheet, as rows of trimmed strings. Writing: sheets of text cells with
// optional list validations (dropdowns), enough for import templates.

const xmlEscape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const xmlUnescape = (value: string) => value.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_m, code: string) => String.fromCodePoint(Number(code))).replace(/&#x([0-9a-f]+);/gi, (_m, code: string) => String.fromCodePoint(parseInt(code, 16))).replace(/&amp;/g, '&')

// ---------------------------------------------------------------- zip

function unzip(buffer: Buffer) {
  let end = -1
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65_557); i--) if (buffer.readUInt32LE(i) === 0x06054b50) { end = i; break }
  if (end < 0) throw new Error('Not a valid .xlsx file.')
  const count = buffer.readUInt16LE(end + 10), dirOffset = buffer.readUInt32LE(end + 16)
  const files = new Map<string, Buffer>()
  let p = dirOffset
  for (let i = 0; i < count; i++) {
    if (buffer.readUInt32LE(p) !== 0x02014b50) throw new Error('Not a valid .xlsx file.')
    const method = buffer.readUInt16LE(p + 10), compressed = buffer.readUInt32LE(p + 20)
    const nameLength = buffer.readUInt16LE(p + 28), extraLength = buffer.readUInt16LE(p + 30), commentLength = buffer.readUInt16LE(p + 32)
    const localOffset = buffer.readUInt32LE(p + 42), name = buffer.toString('utf8', p + 46, p + 46 + nameLength)
    const dataStart = localOffset + 30 + buffer.readUInt16LE(localOffset + 26) + buffer.readUInt16LE(localOffset + 28)
    const data = buffer.subarray(dataStart, dataStart + compressed)
    files.set(name, method === 0 ? Buffer.from(data) : method === 8 ? inflateRawSync(data) : Buffer.alloc(0))
    p += 46 + nameLength + extraLength + commentLength
  }
  return files
}

function zip(entries: Array<{ name: string; data: Buffer }>) {
  const locals: Buffer[] = [], central: Buffer[] = []
  let offset = 0
  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8'), crc = crc32(entry.data) >>> 0
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(0, 8)
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(entry.data.length, 18); local.writeUInt32LE(entry.data.length, 22); local.writeUInt16LE(name.length, 26)
    const dir = Buffer.alloc(46)
    dir.writeUInt32LE(0x02014b50, 0); dir.writeUInt16LE(20, 4); dir.writeUInt16LE(20, 6); dir.writeUInt16LE(0x0800, 8)
    dir.writeUInt32LE(crc, 16); dir.writeUInt32LE(entry.data.length, 20); dir.writeUInt32LE(entry.data.length, 24); dir.writeUInt16LE(name.length, 28); dir.writeUInt32LE(offset, 42)
    locals.push(local, name, entry.data); central.push(dir, name)
    offset += 30 + name.length + entry.data.length
  }
  const dirBuffer = Buffer.concat(central), endRecord = Buffer.alloc(22)
  endRecord.writeUInt32LE(0x06054b50, 0); endRecord.writeUInt16LE(entries.length, 8); endRecord.writeUInt16LE(entries.length, 10)
  endRecord.writeUInt32LE(dirBuffer.length, 12); endRecord.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, dirBuffer, endRecord])
}

// ---------------------------------------------------------------- read

const columnIndex = (ref: string) => {
  const letters = /^[A-Z]+/.exec(ref)?.[0] ?? 'A'
  let index = 0
  for (const letter of letters) index = index * 26 + letter.charCodeAt(0) - 64
  return index - 1
}
const textOf = (xml: string) => xmlUnescape([...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(match => match[1]).join(''))

// Numbers keep Excel's stored text ("9876543210", "15"); whole numbers stored as 1E+9 style are expanded.
const numberText = (raw: string) => (/e/i.test(raw) && Number.isFinite(Number(raw)) ? (Number.isInteger(Number(raw)) ? BigInt(Math.round(Number(raw))).toString() : String(Number(raw))) : raw)

function readXlsx(buffer: Buffer): string[][] {
  const files = unzip(buffer)
  const shared = files.has('xl/sharedStrings.xml') ? [...files.get('xl/sharedStrings.xml')!.toString('utf8').matchAll(/<si>([\s\S]*?)<\/si>/g)].map(match => textOf(match[1]!)) : []
  // First sheet in workbook order.
  const workbook = files.get('xl/workbook.xml')?.toString('utf8') ?? ''
  const rels = files.get('xl/_rels/workbook.xml.rels')?.toString('utf8') ?? ''
  const firstRid = /<sheet\b[^>]*r:id="([^"]+)"/.exec(workbook)?.[1]
  const target = firstRid ? new RegExp(`<Relationship\\b[^>]*Id="${firstRid}"[^>]*Target="([^"]+)"`).exec(rels)?.[1] ?? new RegExp(`<Relationship\\b[^>]*Target="([^"]+)"[^>]*Id="${firstRid}"`).exec(rels)?.[1] : undefined
  const path = target ? (target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`) : 'xl/worksheets/sheet1.xml'
  const sheet = (files.get(path) ?? files.get('xl/worksheets/sheet1.xml'))?.toString('utf8')
  if (!sheet) throw new Error('The workbook has no worksheet.')
  const rows: string[][] = []
  for (const rowMatch of sheet.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
    const rowNumber = Number(/\br="(\d+)"/.exec(rowMatch[1]!)?.[1] ?? rows.length + 1)
    const cells: string[] = []
    for (const cell of rowMatch[2]!.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cell[1]!, body = cell[2] ?? ''
      const ref = /\br="([A-Z]+\d+)"/.exec(attrs)?.[1], type = /\bt="([^"]+)"/.exec(attrs)?.[1]
      const value = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1]
      let text = ''
      if (type === 's') text = shared[Number(value)] ?? ''
      else if (type === 'inlineStr') text = textOf(body)
      else if (type === 'b') text = value === '1' ? 'TRUE' : 'FALSE'
      else if (value !== undefined) text = type === 'str' || type === 'e' ? xmlUnescape(value) : numberText(value)
      cells[ref ? columnIndex(ref) : cells.length] = text.trim()
    }
    rows[rowNumber - 1] = Array.from(cells, value => value ?? '')
  }
  return Array.from(rows, row => row ?? [])
}

function readCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], field = '', quoted = false
  const source = text.replace(/^﻿/, '')
  for (let i = 0; i < source.length; i++) {
    const ch = source[i]!
    if (quoted) {
      if (ch === '"' && source[i + 1] === '"') { field += '"'; i++ } else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { row.push(field.trim()); field = '' }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && source[i + 1] === '\n') i++; row.push(field.trim()); rows.push(row); row = []; field = '' }
    else field += ch
  }
  if (field || row.length) { row.push(field.trim()); rows.push(row) }
  return rows
}

// Rows of the first sheet (.xlsx) or of a CSV file.
export function readSpreadsheet(buffer: Buffer): string[][] {
  if (buffer.length >= 4 && buffer.readUInt32LE(0) === 0x04034b50) return readXlsx(buffer)
  return readCsv(buffer.toString('utf8'))
}

// ---------------------------------------------------------------- write

export type SheetSpec = {
  name: string
  rows: string[][]
  widths?: number[]
  headerRows?: number
  // Dropdown lists: column letter range (e.g. 'G2:G1000') -> formula ('Lists!$A$2:$A$40').
  validations?: Array<{ range: string; formula: string }>
  hidden?: boolean
}

const columnLetter = (index: number) => { let n = index + 1, s = ''; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26) } return s }

function sheetXml(sheet: SheetSpec) {
  const cols = sheet.widths?.length ? `<cols>${sheet.widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join('')}</cols>` : ''
  const rows = sheet.rows.map((row, r) => `<row r="${r + 1}">${row.map((value, c) => (value === '' ? '' : `<c r="${columnLetter(c)}${r + 1}" t="inlineStr"${r < (sheet.headerRows ?? 0) ? ' s="1"' : ''}><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`)).join('')}</row>`).join('')
  const frozen = sheet.headerRows ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${sheet.headerRows}" topLeftCell="A${sheet.headerRows + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` : ''
  const validations = sheet.validations?.length ? `<dataValidations count="${sheet.validations.length}">${sheet.validations.map(v => `<dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="${v.range}"><formula1>${xmlEscape(v.formula)}</formula1></dataValidation>`).join('')}</dataValidations>` : ''
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${frozen}${cols}<sheetData>${rows}</sheetData>${validations}</worksheet>`
}

export function writeWorkbook(sheets: SheetSpec[]): Buffer {
  const files = [
    { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>` },
    { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${xmlEscape(s.name)}" sheetId="${i + 1}"${s.hidden ? ' state="hidden"' : ''} r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>` },
    { name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: 'xl/styles.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF264B79"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>` },
    ...sheets.map((sheet, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(sheet) })),
  ]
  return zip(files.map(file => ({ name: file.name, data: Buffer.from(file.data, 'utf8') })))
}
