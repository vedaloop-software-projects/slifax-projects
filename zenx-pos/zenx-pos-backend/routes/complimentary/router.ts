import { Router, type ErrorRequestHandler, type RequestHandler } from 'express'
import type { ComplimentaryRules, PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { authenticate, type AuthenticatedLocals } from '../../middlewares/auth/authenticate.ts'
import type { Account, AuthStore } from '../../models/auth/contracts.ts'
import { businessZone } from '../../models/system/business-time.ts'
import { ApiError, type AuthService } from '../auth/service.ts'

const id = z.number().int().positive().safe()
const page = z.object({ afterId: id.nullable().default(null) })
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(value)
  return Number.isFinite(+parsed) && parsed.toISOString().slice(0, 10) === value
})
const common = {
  name: z.string().trim().min(1).max(100),
  reason: z.enum(['celebration', 'recovery', 'staff', 'vip', 'promotion', 'other']),
  description: z.string().trim().max(500),
  orderType: z.enum(['all', 'dine-in', 'takeaway', 'delivery']),
  validFrom: date.nullable(),
  validTo: date.nullable(),
  status: z.union([z.literal(0), z.literal(1)]),
}
const rule = z.discriminatedUnion('type', [
  z.object({
    ...common, id: id.optional(), type: z.literal('item'),
    categoryId: id, itemId: id.nullable(),
    maxQuantity: z.number().int().min(1).max(999),
    maxBillValue: z.null(), approvalRequired: z.boolean(),
  }),
  z.object({
    ...common, id: id.optional(), type: z.literal('bill'),
    categoryId: z.null(), itemId: z.null(), maxQuantity: z.null(),
    maxBillValue: z.number().positive().max(999999999).multipleOf(0.01).nullable(),
    approvalRequired: z.literal(true),
  }),
])

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success) throw new ApiError(422, result.error.issues[0]?.message ?? 'Invalid complimentary details.')
  return result.data
}

const isoDate = (value: Date | null) => value?.toISOString().slice(0, 10) ?? null
function response(row: ComplimentaryRules) {
  return {
    id: Number(row.id), name: row.name, reason: row.reason, description: row.description,
    type: row.rule_type, orderType: row.order_type,
    categoryId: row.category_id === null ? null : Number(row.category_id),
    itemId: row.product_id === null ? null : Number(row.product_id),
    maxQuantity: row.max_quantity, maxBillValue: row.max_bill_value?.toNumber() ?? null,
    approvalRequired: row.approval_required, status: row.status,
    validFrom: isoDate(row.valid_from), validTo: isoDate(row.valid_to),
    createdAt: row.created_at, timeZone: businessZone(),
  }
}

export function createComplimentaryRouter(auth: AuthService, authStore: AuthStore, db: PrismaClient) {
  const router = Router()
  const protectedRoute = authenticate(auth)

  function post(path: string, permission: 'view' | 'add' | 'edit', run: (account: Account, body: unknown) => Promise<unknown>) {
    const handler: RequestHandler = (request, res, next) => {
      void (async () => {
        if (!request.is('application/json')) throw new ApiError(400, 'Content-Type must be application/json.')
        const { account } = res.locals as AuthenticatedLocals
        const grants = await authStore.listPermissions(account.client.id, account.user.roleId)
        if (!grants.some(grant => grant[permission] === 1 &&
          ['complimentary', 'bill buster'].includes((grant.subFeature ?? grant.feature).trim().toLowerCase()))) {
          throw new ApiError(403, 'You do not have permission to manage complimentary rules.')
        }
        res.json({ success: true, data: await run(account, request.body) })
      })().catch(next)
    }
    router.post(path, protectedRoute, handler)
  }

  post('/getComplimentaryRules', 'view', async (account, body) => {
    const { afterId } = parse(page, body)
    const rows = await db.complimentaryRules.findMany({
      where: { client_id: account.client.id, id: { gt: BigInt(afterId ?? 0) } },
      orderBy: { id: 'asc' }, take: 101,
    })
    const visible = rows.slice(0, 100)
    return { rows: visible.map(response), nextAfterId: rows.length > 100 ? Number(visible.at(-1)?.id) : null }
  })

  post('/getComplimentaryCatalog', 'view', async (account, body) => {
    const { afterId } = parse(page, body)
    const client_id = account.client.id
    const [categories, products] = await Promise.all([
      afterId === null ? db.categories.findMany({
        where: { client_id, trash: 0 },
        orderBy: { category_name: 'asc' },
        select: { id: true, category_name: true, status: true },
      }) : [],
      db.products.findMany({
        where: { client_id, trash: 0, id: { gt: BigInt(afterId ?? 0) } },
        orderBy: { id: 'asc' }, take: 201,
        select: { id: true, product_full_name: true, category_id: true, status: true },
      }),
    ])
    const visible = products.slice(0, 200)
    return {
      categories: categories.map(row => ({ label: row.category_name, value: Number(row.id), status: row.status })),
      menuItems: visible.map(row => ({
        id: Number(row.id), categoryId: Number(row.category_id), productName: row.product_full_name, status: row.status,
      })),
      nextAfterId: products.length > 200 ? Number(visible.at(-1)?.id) : null,
    }
  })

  function save(editing: boolean) {
    return async (account: Account, body: unknown) => {
      const input = parse(rule, body)
      if (editing !== (input.id !== undefined)) throw new ApiError(422, 'Invalid rule ID.')
      if (input.validFrom && input.validTo && input.validFrom > input.validTo)
        throw new ApiError(422, 'End date cannot be before the start date.')
      const client_id = account.client.id
      return db.$transaction(async tx => {
        if (input.type === 'item') {
          const category = await tx.categories.findFirst({
            where: { id: BigInt(input.categoryId), client_id, trash: 0, status: 1 },
            select: { id: true },
          })
          if (!category) throw new ApiError(422, 'Select an active category.')
          if (input.itemId !== null) {
            const product = await tx.products.findFirst({
              where: { id: BigInt(input.itemId), client_id, category_id: category.id, trash: 0, status: 1 },
              select: { id: true },
            })
            if (!product) throw new ApiError(422, 'Select an active item in this category.')
          }
        }
        const fields = {
          name: input.name, reason: input.reason, description: input.description,
          rule_type: input.type, order_type: input.orderType, status: input.status,
          category_id: input.categoryId === null ? null : BigInt(input.categoryId),
          product_id: input.itemId === null ? null : BigInt(input.itemId),
          max_quantity: input.maxQuantity, max_bill_value: input.maxBillValue,
          approval_required: input.approvalRequired,
          valid_from: input.validFrom ? new Date(input.validFrom) : null,
          valid_to: input.validTo ? new Date(input.validTo) : null,
          updated_by: account.user.id, updated_at: new Date(),
        }
        if (input.id === undefined) {
          return response(await tx.complimentaryRules.create({ data: { ...fields, client_id, created_by: account.user.id } }))
        }
        const where = { id: BigInt(input.id), client_id }
        if (!(await tx.complimentaryRules.updateMany({ where, data: fields })).count)
          throw new ApiError(404, 'Complimentary rule not found.')
        return response(await tx.complimentaryRules.findFirstOrThrow({ where }))
      })
    }
  }

  post('/createComplimentaryRule', 'add', save(false))
  post('/updateComplimentaryRule', 'edit', save(true))
  post('/deactivateComplimentaryRule', 'edit', async (account, body) => {
    const input = parse(z.object({ id }), body)
    const result = await db.complimentaryRules.updateMany({
      where: { id: BigInt(input.id), client_id: account.client.id },
      data: { status: 0, updated_by: account.user.id, updated_at: new Date() },
    })
    if (!result.count) throw new ApiError(404, 'Complimentary rule not found.')
    return null
  })

  const handleApiError: ErrorRequestHandler = (error, _request, response, next) => {
    if (!(error instanceof ApiError)) return next(error)
    response.status(error.status).json({ errors: error.message })
  }
  router.use(handleApiError)

  return router
}
