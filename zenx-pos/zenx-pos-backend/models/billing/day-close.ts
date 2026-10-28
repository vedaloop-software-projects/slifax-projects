import type { PrismaClient } from '@prisma/client'
import { ApiError } from '../../routes/auth/service.ts'

// Business dates are IST calendar days; DD-MM-YYYY is the legacy wire format.
export const indiaParts = (value: Date) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(value)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? ''
  return { year: part('year'), month: part('month'), day: part('day') }
}
export const dayRange = (value: Date) => {
  const { year, month, day } = indiaParts(value)
  const gte = new Date(`${year}-${month}-${day}T00:00:00+05:30`)
  return { gte, lt: new Date(gte.getTime() + 86_400_000) }
}
export const businessDate = (value: string) => {
  if (!/^\d{2}-\d{2}-\d{4}$/.test(value)) throw new ApiError(422, 'Date must be DD-MM-YYYY.')
  const [day, month, year] = value.split('-')
  const parsed = new Date(`${year}-${month}-${day}T00:00:00+05:30`)
  if (Number.isNaN(parsed.getTime()) || indiaParts(parsed).day !== day) throw new ApiError(422, 'Invalid date.')
  return parsed
}
export const formatBusinessDate = (value: Date) => { const { year, month, day } = indiaParts(value); return `${day}-${month}-${year}` }

type Db = Pick<PrismaClient, '$transaction' | 'billMaster' | 'dayCloseDetails'>

// Unarchived bills dated before today are days that were never closed.
export async function pendingDayCloses(db: Db, clientId: bigint, now = new Date()) {
  const rows = await db.billMaster.findMany({ where: { client_id: clientId, bill_date: { lt: dayRange(now).gte } }, select: { bill_date: true }, distinct: ['bill_date'], orderBy: { bill_date: 'asc' }, take: 10_000 })
  return [...new Set(rows.map(row => formatBusinessDate(row.bill_date)))]
}

export async function recentDayCloses(db: Db, clientId: bigint, take = 60) {
  const rows = await db.dayCloseDetails.findMany({ where: { client_id: clientId }, orderBy: { day_close_date: 'desc' }, take, select: { id: true, user_id: true, day_close_date: true, updated_at: true } })
  return rows.map(row => ({ id: row.id, userId: row.user_id, date: formatBusinessDate(row.day_close_date), closedAt: row.updated_at ?? row.day_close_date }))
}

export type DayCloseActor = { clientId: bigint; userId: bigint; auditDescription: string }

// Archives every live bill up to the end of `target` and records the close.
// Earlier open days must be closed first so each day keeps its own close row.
export async function closeBusinessDay(db: Db, actor: DayCloseActor, target: Date, now = new Date()) {
  const range = dayRange(target), today = dayRange(now)
  if (range.gte > today.gte) throw new ApiError(422, 'A future date cannot be closed.')
  return db.$transaction(async transaction => {
    await transaction.$queryRaw`SELECT id FROM users WHERE id = ${actor.clientId} FOR UPDATE`
    const earlier = await transaction.billMaster.findFirst({ where: { client_id: actor.clientId, bill_date: { lt: range.gte } }, orderBy: { bill_date: 'asc' }, select: { bill_date: true } })
    if (earlier) throw new ApiError(409, `Close ${formatBusinessDate(earlier.bill_date)} first.`)
    // An existing row (e.g. from KOT day close) is re-stamped, matching the legacy behaviour.
    const existing = await transaction.dayCloseDetails.findFirst({ where: { client_id: actor.clientId, day_close_date: range } })
    const scope = { client_id: actor.clientId, bill_date: { lt: range.lt } }
    const [masters, transactions, payments] = await Promise.all([
      transaction.billMaster.findMany({ where: scope }),
      transaction.billTran.findMany({ where: scope }),
      transaction.billPayments.findMany({ where: scope }),
    ])
    if (masters.length) await transaction.prevBillMaster.createMany({ data: masters.map(({ id: _id, ...row }) => row) })
    if (transactions.length) await transaction.prevBillTran.createMany({ data: transactions.map(({ id: _id, ...row }) => row) })
    if (payments.length) await transaction.prevBillPayments.createMany({ data: payments.map(({ id: _id, ...row }) => row) })
    await transaction.billPayments.deleteMany({ where: scope })
    await transaction.billTran.deleteMany({ where: scope })
    await transaction.billMaster.deleteMany({ where: scope })
    // A past day is stamped at its last second so day-range lookups still match it.
    const stamp = range.gte.getTime() === today.gte.getTime() ? now : new Date(range.lt.getTime() - 1000)
    if (existing) await transaction.dayCloseDetails.update({ where: { id: existing.id }, data: { user_id: actor.userId, day_close_date: stamp, updated_at: now } })
    else await transaction.dayCloseDetails.create({ data: { client_id: actor.clientId, user_id: actor.userId, day_close_date: stamp, created_at: now, updated_at: now } })
    await transaction.audits.create({ data: { client_id: actor.clientId, user_id: actor.userId, type: 'Day end', description: actor.auditDescription, created_at: now, updated_at: now } })
    return { date: formatBusinessDate(target), billMasterCount: masters.length, billTranCount: transactions.length, billPaymentCount: payments.length, closedAt: now }
  }, { isolationLevel: 'Serializable' })
}

// Moves the day's archived bills back to the live tables and removes its close row,
// so billing (and a fresh close) is possible for that date again.
export async function reopenBusinessDay(db: Db, actor: DayCloseActor, target: Date, now = new Date()) {
  const range = dayRange(target)
  return db.$transaction(async transaction => {
    await transaction.$queryRaw`SELECT id FROM users WHERE id = ${actor.clientId} FOR UPDATE`
    const closes = await transaction.dayCloseDetails.findMany({ where: { client_id: actor.clientId, day_close_date: range }, select: { id: true } })
    if (!closes.length) throw new ApiError(404, `Day ${formatBusinessDate(target)} is not closed.`)
    const scope = { client_id: actor.clientId, bill_date: range }
    const [masters, transactions, payments] = await Promise.all([
      transaction.prevBillMaster.findMany({ where: scope }),
      transaction.prevBillTran.findMany({ where: scope }),
      transaction.prevBillPayments.findMany({ where: scope }),
    ])
    if (masters.length) await transaction.billMaster.createMany({ data: masters.map(({ id: _id, ...row }) => row) })
    if (transactions.length) await transaction.billTran.createMany({ data: transactions.map(({ id: _id, ...row }) => row) })
    if (payments.length) await transaction.billPayments.createMany({ data: payments.map(({ id: _id, ...row }) => row) })
    await transaction.prevBillPayments.deleteMany({ where: scope })
    await transaction.prevBillTran.deleteMany({ where: scope })
    await transaction.prevBillMaster.deleteMany({ where: scope })
    await transaction.dayCloseDetails.deleteMany({ where: { id: { in: closes.map(row => row.id) } } })
    await transaction.audits.create({ data: { client_id: actor.clientId, user_id: actor.userId, type: 'Day reopen', description: actor.auditDescription, created_at: now, updated_at: now } })
    return { date: formatBusinessDate(target), billMasterCount: masters.length, billTranCount: transactions.length, billPaymentCount: payments.length }
  }, { isolationLevel: 'Serializable' })
}
