import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { ExpenseExportStorage, ExpenseRow } from './contracts.ts'

const quote = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`
const date = (value: Date) => `${String(value.getUTCDate()).padStart(2, '0')}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${value.getUTCFullYear()}`

export class CsvExpenseExportStorage implements ExpenseExportStorage {
  private readonly root: string
  private readonly baseUrl: string
  constructor(root: string, baseUrl: string) { this.root = resolve(root); this.baseUrl = baseUrl.replace(/\/$/, '') }

  async save(clientId: bigint, rows: ExpenseRow[]) {
    const directory = resolve(this.root, 'uploads', 'expense_files')
    await mkdir(directory, { recursive: true })
    const name = `expense_${clientId}_${randomUUID()}.csv`
    const header = ['Receipt Number', 'Transaction Date', 'Expense Head', 'Expense Type', 'Amount', 'Remarks', 'Status']
    const lines = rows.map((row) => [row.receiptNum, date(row.transactionDate), row.expenseHeadName ?? '', row.expenseType === 1 ? 'In' : 'Out', row.amount, row.remarks ?? '', row.status === 1 ? 'Active' : 'Cancelled'].map(quote).join(','))
    await writeFile(resolve(directory, name), `\uFEFF${header.map(quote).join(',')}\r\n${lines.join('\r\n')}\r\n`, { flag: 'wx', mode: 0o640 })
    return `${this.baseUrl}/uploads/expense_files/${name}`
  }
}
