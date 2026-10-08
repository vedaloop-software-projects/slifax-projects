import { randomUUID } from 'node:crypto'
import type { Prisma, PrismaClient } from '@prisma/client'
import type { Account } from '../auth/contracts.ts'
import type { ExpenseFilters, ExpenseHeadInput, ExpenseStore } from './contracts.ts'

const headRow = (row: { id: bigint; expense_head: string; status: number }) => ({ id: row.id, name: row.expense_head, status: row.status })
const expenseRow = (row: { id: bigint; receipt_num: string; transaction_date: Date; expense_head_id: bigint; expense_type: number; amount: number; remarks: string | null; status: number }, headName: string | null) => ({ id: row.id, receiptNum: row.receipt_num, transactionDate: row.transaction_date, expenseHeadId: row.expense_head_id, expenseHeadName: headName, expenseType: row.expense_type, amount: row.amount, remarks: row.remarks, status: row.status })

export class PrismaExpenseStore implements ExpenseStore {
  private readonly prisma: PrismaClient
  constructor(prisma: PrismaClient) { this.prisma = prisma }

  async createHead(account: Account, value: ExpenseHeadInput) {
    return this.prisma.$transaction(async (tx) => {
      const duplicate = await tx.expenseHeads.findFirst({ where: { client_id: account.client.id, expense_head: value.name, trash: 0 } })
      if (duplicate) return 'name_duplicate' as const
      const now = new Date()
      await tx.expenseHeads.create({ data: { client_id: account.client.id, expense_head: value.name, status: value.status, trash: 0, created_by: Number(account.user.id), created_at: now } })
      await tx.audits.create({ data: { client_id: account.client.id, user_id: account.user.id, type: 'add', description: `${value.name} Expense Head added`, created_at: now, updated_at: now } })
      return 'saved' as const
    })
  }

  async updateHead(account: Account, id: bigint, value: ExpenseHeadInput) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.expenseHeads.findFirst({ where: { id, client_id: account.client.id, trash: 0 } }); if (!current) return 'missing' as const
      const duplicate = await tx.expenseHeads.findFirst({ where: { client_id: account.client.id, expense_head: value.name, trash: 0, id: { not: id } } }); if (duplicate) return 'name_duplicate' as const
      const now = new Date(); await tx.expenseHeads.update({ where: { id }, data: { expense_head: value.name, status: value.status, updated_by: Number(account.user.id), updated_at: now } })
      await tx.audits.create({ data: { client_id: account.client.id, user_id: account.user.id, type: 'update', description: `${value.name} Expense Head updated`, created_at: now, updated_at: now } })
      return 'saved' as const
    })
  }

  async getHead(clientId: bigint, id: bigint) { const row = await this.prisma.expenseHeads.findFirst({ where: { id, client_id: clientId, trash: 0 } }); return row ? headRow(row) : null }
  async listHeads(clientId: bigint, filters: { search?: string; status?: number; page: number; perPage: number }) {
    const where: Prisma.ExpenseHeadsWhereInput = { client_id: clientId, trash: 0, ...(filters.status === undefined ? {} : { status: filters.status }), ...(filters.search ? { expense_head: { contains: filters.search } } : {}) }
    const [rows, total] = await Promise.all([this.prisma.expenseHeads.findMany({ where, orderBy: { id: 'desc' }, skip: (filters.page - 1) * filters.perPage, take: filters.perPage }), this.prisma.expenseHeads.count({ where })])
    return { rows: rows.map(headRow), total }
  }

  async createExpense(account: Account, value: { expenseHeadId: bigint; transactionDate: Date; expenseType: number; amount: number; remarks: string | null }) {
    return this.prisma.$transaction(async (tx) => {
      const head = await tx.expenseHeads.findFirst({ where: { id: value.expenseHeadId, client_id: account.client.id, status: 1, trash: 0 } }); if (!head) return 'head_missing' as const
      const now = new Date(); const created = await tx.expenses.create({ data: { client_id: account.client.id, expense_head_id: value.expenseHeadId, receipt_num: `pending_${randomUUID()}`, transaction_date: value.transactionDate, expense_type: value.expenseType, amount: value.amount, remarks: value.remarks, status: 1, trash: 0, created_by: Number(account.user.id), created_at: now } })
      const receipt = `${now.getUTCFullYear()}_${account.client.id}_${created.id}`
      await tx.expenses.update({ where: { id: created.id }, data: { receipt_num: receipt } })
      await tx.audits.create({ data: { client_id: account.client.id, user_id: account.user.id, type: 'add', description: `${value.remarks ?? ''} Expense added`, created_at: now, updated_at: now } })
      return 'saved' as const
    })
  }

  async cancelExpense(account: Account, id: bigint) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.expenses.findFirst({ where: { id, client_id: account.client.id, trash: 0 } }); if (!current) return 'missing' as const
      const now = new Date(); await tx.expenses.update({ where: { id }, data: { status: 0, updated_by: Number(account.user.id), updated_at: now } })
      await tx.audits.create({ data: { client_id: account.client.id, user_id: account.user.id, type: 'cancel', description: 'Expense cancelled', created_at: now, updated_at: now } })
      return 'saved' as const
    })
  }

  private where(clientId: bigint, filters: ExpenseFilters): Prisma.ExpensesWhereInput { return { client_id: clientId, trash: 0, ...(filters.fromDate || filters.toDate ? { transaction_date: { ...(filters.fromDate ? { gte: filters.fromDate } : {}), ...(filters.toDate ? { lte: filters.toDate } : {}) } } : {}), ...(filters.expenseHeadId === undefined ? {} : { expense_head_id: filters.expenseHeadId }), ...(filters.expenseType === undefined ? {} : { expense_type: filters.expenseType }), ...(filters.status === undefined ? {} : { status: filters.status }) } }
  private async withHeads<T extends { expense_head_id: bigint }>(clientId: bigint, rows: T[]) {
    const ids = [...new Set(rows.map((row) => row.expense_head_id))]
    const heads = ids.length ? await this.prisma.expenseHeads.findMany({ where: { client_id: clientId, id: { in: ids } }, select: { id: true, expense_head: true } }) : []
    const names = new Map(heads.map((head) => [head.id, head.expense_head]))
    return rows.map((row) => expenseRow(row as T & { id: bigint; receipt_num: string; transaction_date: Date; expense_type: number; amount: number; remarks: string | null; status: number }, names.get(row.expense_head_id) ?? null))
  }
  async getExpense(clientId: bigint, id: bigint) { const row = await this.prisma.expenses.findFirst({ where: { id, client_id: clientId, trash: 0 } }); return row ? (await this.withHeads(clientId, [row]))[0]! : null }
  async listExpenses(clientId: bigint, filters: ExpenseFilters, page: number, perPage: number) { const where = this.where(clientId, filters); const [rows, total] = await Promise.all([this.prisma.expenses.findMany({ where, orderBy: { id: 'desc' }, skip: (page - 1) * perPage, take: perPage }), this.prisma.expenses.count({ where })]); return { rows: await this.withHeads(clientId, rows), total } }
  async exportExpenses(clientId: bigint, filters: ExpenseFilters, limit: number) { const rows = await this.prisma.expenses.findMany({ where: this.where(clientId, filters), orderBy: { id: 'desc' }, take: limit + 1 }); return { rows: await this.withHeads(clientId, rows.slice(0, limit)), truncated: rows.length > limit } }
  async headExists(clientId: bigint, id: bigint) { return (await this.prisma.expenseHeads.count({ where: { id, client_id: clientId, trash: 0 } })) === 1 }
}
