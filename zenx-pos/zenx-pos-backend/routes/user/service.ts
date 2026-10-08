import { hash } from 'bcryptjs'
import { z } from 'zod'
import type { Account, AuthStore } from '../../models/auth/contracts.ts'
import type { ManagedUserInput, UserStore, UserWriteResult } from '../../models/user/contracts.ts'
import { ApiError } from '../auth/service.ts'

const id = z.number().int().positive().safe(), status = z.union([z.literal(0), z.literal(1)])
const base = z.object({ roleId: id, name: z.string().trim().min(3).max(100), email: z.email().trim().toLowerCase().max(100), mobile: z.string().regex(/^[6-9][0-9]{9}$/), maxDiscountPercentage: z.number().finite().min(0).max(100), status })
const create = base.extend({ password: z.string().min(8).max(72) }).strict(), update = base.extend({ id, password: z.string().min(8).max(72).nullable() }).strict()
const list = z.object({ searchStr: z.string().trim().max(100).nullable(), status: status.nullable(), page: id.nullable() }).strict(), byId = z.object({ id }).strict()
const safeId = (value: bigint) => { const result = Number(value); if (!Number.isSafeInteger(result)) throw new Error('Database ID exceeds the legacy JSON number range.'); return result }
const normalized = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

export class UserService {
  private readonly store: UserStore
  private readonly auth: AuthStore
  private readonly perPage: number
  constructor(store: UserStore, auth: AuthStore, perPage = 25) { if (!Number.isInteger(perPage) || perPage < 1 || perPage > 100) throw new Error('USER_PAGE_SIZE must be between 1 and 100.'); this.store = store; this.auth = auth; this.perPage = perPage }
  private async authorize(account: Account, action: 'view' | 'add' | 'edit') { const rows = await this.auth.listPermissions(account.client.id, account.user.roleId); if (!rows.some((row) => row[action] === 1 && ['user', 'staff'].some((stem) => normalized(row.subFeature ?? row.feature).includes(stem)))) throw new ApiError(403, 'You do not have permission to perform this action.') }
  private result(result: UserWriteResult) { if (result === 'saved') return; if (result === 'missing') throw new ApiError(422, 'User not found.'); if (result === 'role_missing') throw new ApiError(422, 'Role not found.'); if (result === 'mobile_duplicate') throw new ApiError(400, 'Mobile already exists.'); if (result === 'email_duplicate') throw new ApiError(400, 'Email already exists.'); throw new ApiError(403, 'The administrator or current user cannot be changed through this endpoint.') }
  private value(data: z.infer<typeof base>, passwordHash?: string): ManagedUserInput { return { roleId: BigInt(data.roleId), name: data.name, email: data.email, mobile: data.mobile, maxDiscountPercentage: data.maxDiscountPercentage, status: data.status, ...(passwordHash ? { passwordHash } : {}) } }
  private row(row: Awaited<ReturnType<UserStore['getUser']>> & {}) { if (!row) throw new Error('Missing row'); return { id: safeId(row.id), roleId: safeId(row.roleId), roleName: row.roleName, name: row.name, mobile: row.mobile, email: row.email, maxDiscountPercentage: row.maxDiscountPercentage, status: row.status } }
  async add(account: Account, input: unknown) { await this.authorize(account, 'add'); const parsed = create.safeParse(input); if (!parsed.success) throw new ApiError(422, 'Invalid user details.'); this.result(await this.store.createUser(account, this.value(parsed.data, await hash(parsed.data.password, 12)))) }
  async update(account: Account, input: unknown) { await this.authorize(account, 'edit'); const parsed = update.safeParse(input); if (!parsed.success) throw new ApiError(422, 'Invalid user details.'); this.result(await this.store.updateUser(account, BigInt(parsed.data.id), this.value(parsed.data, parsed.data.password ? await hash(parsed.data.password, 12) : undefined))) }
  async one(account: Account, input: unknown) { await this.authorize(account, 'view'); const parsed = byId.safeParse(input); if (!parsed.success) throw new ApiError(422, 'Invalid user ID.'); const row = await this.store.getUser(account.client.id, BigInt(parsed.data.id)); if (!row) throw new ApiError(404, 'User not found.'); return this.row(row) }
  async many(account: Account, input: unknown) { await this.authorize(account, 'view'); const parsed = list.safeParse(input); if (!parsed.success) throw new ApiError(422, 'Invalid user filters.'); const page = parsed.data.page ?? 1, result = await this.store.listUsers(account.client.id, { page, perPage: this.perPage, ...(parsed.data.searchStr ? { search: parsed.data.searchStr } : {}), ...(parsed.data.status === null ? {} : { status: parsed.data.status }) }); return { users: result.rows.map((row) => this.row(row)), pagination: { currentPage: page, lastPage: Math.max(1, Math.ceil(result.total / this.perPage)), perPage: this.perPage, totalRecords: result.total } } }
}
