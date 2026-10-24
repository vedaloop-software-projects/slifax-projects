import { hash } from 'bcryptjs'
import { z } from 'zod'
import type { Account } from '../../models/auth/contracts.ts'
import type { PasswordResetRequestStore } from '../../models/password-reset/contracts.ts'
import { ApiError } from '../auth/service.ts'

const mobileSchema = z.object({ mobile: z.string().trim().regex(/^[6-9]\d{9}$/) })
const resetSchema = z.object({
  requestId: z.coerce.bigint().positive(),
  newPassword: z.string().min(8).max(128).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).+$/),
  confirmPassword: z.string().min(1).max(128),
}).refine((body) => body.newPassword === body.confirmPassword, { message: 'Passwords do not match.' })

export class PasswordResetRequestService {
  private readonly store: PasswordResetRequestStore
  private readonly now: () => Date
  constructor(store: PasswordResetRequestStore, now = () => new Date()) { this.store = store; this.now = now }

  async request(input: unknown) {
    const parsed = mobileSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Enter a valid 10-digit mobile number.')
    const requester = await this.store.findRequester(parsed.data.mobile)
    if (requester) await this.store.createOrRefresh(requester, requester.type === 'admin' || requester.isAdmin ? 'super_admin' : 'tenant_admin', this.now())
  }

  async tenantList(account: Account) {
    if (account.user.isAdmin !== 1) throw new ApiError(403, 'Only the primary admin can manage password reset requests. Contact your primary admin.')
    return this.store.listTenant(account.client.id)
  }

  async tenantReset(account: Account, input: unknown) {
    if (account.user.isAdmin !== 1) throw new ApiError(403, 'Only the primary admin can manage password reset requests. Contact your primary admin.')
    const parsed = resetSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, parsed.error.issues.some((issue) => issue.message === 'Passwords do not match.') ? 'Passwords do not match.' : 'Password must contain uppercase, lowercase, number, and @$!%*?&.')
    if (!await this.store.resetTenantRequest(parsed.data.requestId, account.client.id, account.user.id, await hash(parsed.data.newPassword, 12), this.now())) throw new ApiError(404, 'Pending password reset request not found.')
  }

  superAdminList() { return this.store.listSuperAdmin() }
  async superAdminReset(adminId: bigint, input: unknown) {
    const parsed = resetSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, parsed.error.issues.some((issue) => issue.message === 'Passwords do not match.') ? 'Passwords do not match.' : 'Password must contain uppercase, lowercase, number, and @$!%*?&.')
    if (!await this.store.resetSuperAdminRequest(parsed.data.requestId, adminId, await hash(parsed.data.newPassword, 12), this.now())) throw new ApiError(404, 'Pending password reset request not found.')
  }
}
