import { hash } from 'bcryptjs'
import { z } from 'zod'
import type { Account, AuthStore } from '../../models/auth/contracts.ts'
import type { ManagedUserInput, UserStore, UserWriteResult } from '../../models/user/contracts.ts'
import { ApiError } from '../auth/service.ts'

const id = z.number().int().positive().safe(), status = z.union([z.literal(0), z.literal(1)])
const base = z.object({ roleId: id, name: z.string().trim().min(3).max(100), email: z.string().trim().toLowerCase().pipe(z.email().max(100)), mobile: z.string().trim().regex(/^[6-9][0-9]{9}$/), maxDiscountPercentage: z.number().finite().min(0).max(100), status })
const userPassword = z.string().min(8).max(72).refine(value => value.trim().length > 0)
const create = base.extend({ password: userPassword }), update = base.extend({ id, password: z.preprocess(value => value === '' || value === undefined ? null : value, userPassword.nullable()) })
const userFields: Record<string, { label: string; message: string }> = {
  name: { label: 'Full name', message: 'Enter a name with 3-100 characters.' },
  email: { label: 'Email', message: 'Enter a valid email address of up to 100 characters.' },
  mobile: { label: 'Mobile number', message: 'Enter a 10-digit Indian mobile number starting with 6, 7, 8 or 9.' },
  roleId: { label: 'Role', message: 'Select a valid role.' },
  password: { label: 'Password', message: 'Use 8-72 characters. Leave it blank when editing to keep the current password.' },
  maxDiscountPercentage: { label: 'Max. discount %', message: 'Enter a percentage from 0 to 100.' },
  status: { label: 'Status', message: 'Select Active or Inactive.' },
  id: { label: 'User', message: 'Select a valid user.' },
}
export class UserValidationError extends ApiError {
  readonly fieldErrors: Record<string, string>
  constructor(fieldErrors: Record<string, string>, message?: string, statusCode = 422) {
    const details = Object.entries(fieldErrors).slice(0, 3).map(([key, value]) => `${userFields[key]?.label ?? key}: ${value}`).join(' ')
    super(statusCode, message ?? `Invalid user details. ${details}`)
    this.fieldErrors = fieldErrors
  }
}
function userValidationError(error: z.ZodError) {
  const fieldErrors: Record<string, string> = {}
  for (const issue of error.issues) { const key = String(issue.path[0] ?? 'user'); fieldErrors[key] ??= userFields[key]?.message ?? 'Check the user details.' }
  return new UserValidationError(fieldErrors)
}
const list = z.object({ searchStr: z.string().trim().max(100).nullable(), status: status.nullable(), page: id.nullable() }), byId = z.object({ id })
const safeId = (value: bigint) => { const result = Number(value); if (!Number.isSafeInteger(result)) throw new Error('Database ID exceeds the legacy JSON number range.'); return result }
const normalized = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

export class UserService {
  private readonly store: UserStore
  private readonly auth: AuthStore
  private readonly perPage: number
  constructor(store: UserStore, auth: AuthStore, perPage = 25) { if (!Number.isInteger(perPage) || perPage < 1 || perPage > 100) throw new Error('USER_PAGE_SIZE must be between 1 and 100.'); this.store = store; this.auth = auth; this.perPage = perPage }
  private async authorize(account: Account, action: 'view' | 'add' | 'edit') { if (account.user.isAdmin === 1) return; if (action !== 'view') throw new ApiError(403, 'Only the primary admin can create users, change account status, roles or passwords. Contact your primary admin.'); const rows = await this.auth.listPermissions(account.client.id, account.user.roleId); if (!rows.some((row) => row[action] === 1 && ['user', 'staff'].some((stem) => normalized(row.subFeature ?? row.feature).includes(stem)))) throw new ApiError(403, 'You do not have permission to perform this action.') }
  private async result(account: Account, result: UserWriteResult) { if (result === 'saved') return; if (result === 'user_limit') { const limit = await this.store.userLimit(account.client.id); throw new UserValidationError({ status: `Your plan allows ${limit.max} active users and all are in use. Deactivate a user, or contact ZenxPOS support to increase the limit.` }, `User limit reached: your plan allows ${limit.max} active users. Deactivate a user, or contact ZenxPOS support to increase the limit.`) } if (result === 'primary_required') throw new ApiError(403, 'Only the primary admin can manage other users. Contact your primary admin.'); if (result === 'self_protected') throw new ApiError(403, 'You can edit your own name, email, mobile and discount limit, but not deactivate yourself or change your own role here. Use Change Password to change your password.'); if (result === 'missing') throw new ApiError(422, 'User not found.'); if (result === 'role_missing') throw new UserValidationError({ roleId: 'This role is unavailable. Select another role.' }, 'Role not found.'); if (result === 'mobile_duplicate') throw new UserValidationError({ mobile: 'This mobile number is already registered.' }, 'Mobile already exists.', 400); if (result === 'email_duplicate') throw new UserValidationError({ email: 'This email address is already registered.' }, 'Email already exists.', 400); throw new ApiError(403, 'The administrator or current user cannot be changed through this endpoint.') }
  private value(data: z.infer<typeof base>, passwordHash?: string): ManagedUserInput { return { roleId: BigInt(data.roleId), name: data.name, email: data.email, mobile: data.mobile, maxDiscountPercentage: data.maxDiscountPercentage, status: data.status, ...(passwordHash ? { passwordHash } : {}) } }
  private row(row: Awaited<ReturnType<UserStore['getUser']>> & {}) { if (!row) throw new Error('Missing row'); return { id: safeId(row.id), roleId: safeId(row.roleId), roleName: row.roleName, name: row.name, mobile: row.mobile, email: row.email, maxDiscountPercentage: row.maxDiscountPercentage, status: row.status, isPrimaryAdmin: row.isPrimaryAdmin ?? false } }
  async add(account: Account, input: unknown) { await this.authorize(account, 'add'); const parsed = create.safeParse(input); if (!parsed.success) throw userValidationError(parsed.error); await this.result(account, await this.store.createUser(account, this.value(parsed.data, await hash(parsed.data.password, 12)))) }
  async update(account: Account, input: unknown) { await this.authorize(account, 'edit'); const parsed = update.safeParse(input); if (!parsed.success) throw userValidationError(parsed.error); await this.result(account, await this.store.updateUser(account, BigInt(parsed.data.id), this.value(parsed.data, parsed.data.password ? await hash(parsed.data.password, 12) : undefined))) }
  async one(account: Account, input: unknown) { await this.authorize(account, 'view'); const parsed = byId.safeParse(input); if (!parsed.success) throw new ApiError(422, 'Invalid user ID.'); const row = await this.store.getUser(account.client.id, BigInt(parsed.data.id)); if (!row) throw new ApiError(404, 'User not found.'); return { ...this.row(row), canEdit: account.user.isAdmin === 1, isSelf: row.id === account.user.id } }
  async many(account: Account, input: unknown) { await this.authorize(account, 'view'); const parsed = list.safeParse(input); if (!parsed.success) throw new ApiError(422, 'Invalid user filters.'); const page = parsed.data.page ?? 1, userLimit = await this.store.userLimit(account.client.id), result = await this.store.listUsers(account.client.id, { page, perPage: this.perPage, ...(parsed.data.searchStr ? { search: parsed.data.searchStr } : {}), ...(parsed.data.status === null ? {} : { status: parsed.data.status }) }); return { canManageUsers: account.user.isAdmin === 1, userLimit: { ...userLimit, reached: userLimit.max !== null && userLimit.used >= userLimit.max }, userManagementWarning: account.user.isAdmin === 1 ? null : 'Only the primary admin can create users, change account status, roles or passwords. Contact your primary admin.', users: result.rows.map((row) => ({ ...this.row(row), canEdit: account.user.isAdmin === 1, isSelf: row.id === account.user.id })), pagination: { currentPage: page, lastPage: Math.max(1, Math.ceil(result.total / this.perPage)), perPage: this.perPage, totalRecords: result.total } } }
}
