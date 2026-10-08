import type { Account } from '../auth/contracts.ts'

export type ExpenseHeadInput = { name: string; status: number }
export type ExpenseHeadRow = ExpenseHeadInput & { id: bigint }
export type ExpenseRow = {
  id: bigint; receiptNum: string; transactionDate: Date; expenseHeadId: bigint
  expenseHeadName: string | null; expenseType: number; amount: number
  remarks: string | null; status: number
}
export type ExpenseFilters = {
  fromDate?: Date; toDate?: Date; expenseHeadId?: bigint; expenseType?: number; status?: number
}
export type ExpensePage = { rows: ExpenseRow[]; total: number }
export type ExpenseWriteResult = 'saved' | 'missing' | 'head_missing' | 'name_duplicate'

export interface ExpenseStore {
  createHead(account: Account, value: ExpenseHeadInput): Promise<ExpenseWriteResult>
  updateHead(account: Account, id: bigint, value: ExpenseHeadInput): Promise<ExpenseWriteResult>
  getHead(clientId: bigint, id: bigint): Promise<ExpenseHeadRow | null>
  listHeads(clientId: bigint, filters: { search?: string; status?: number; page: number; perPage: number }): Promise<{ rows: ExpenseHeadRow[]; total: number }>
  createExpense(account: Account, value: { expenseHeadId: bigint; transactionDate: Date; expenseType: number; amount: number; remarks: string | null }): Promise<ExpenseWriteResult>
  cancelExpense(account: Account, id: bigint): Promise<ExpenseWriteResult>
  getExpense(clientId: bigint, id: bigint): Promise<ExpenseRow | null>
  listExpenses(clientId: bigint, filters: ExpenseFilters, page: number, perPage: number): Promise<ExpensePage>
  exportExpenses(clientId: bigint, filters: ExpenseFilters, limit: number): Promise<{ rows: ExpenseRow[]; truncated: boolean }>
  headExists(clientId: bigint, id: bigint): Promise<boolean>
}

export interface ExpenseExportStorage {
  save(clientId: bigint, rows: ExpenseRow[]): Promise<string>
}
