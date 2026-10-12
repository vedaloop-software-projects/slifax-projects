import { z } from 'zod'
import type { Account, AuthStore } from '../../models/auth/contracts.ts'
import type { BillingOperation, BillingPayload, BillingStore } from '../../models/billing/contracts.ts'
import { ApiError } from '../auth/service.ts'

const id = z.number().int().positive().safe()
const money = z.number().finite().min(0).max(1_000_000_000)
const positive = z.number().finite().positive().max(1_000_000)
const text = z.string().trim().max(255).nullable().optional()
const date = z.string().regex(/^\d{2}-\d{2}-\d{4}$/)
const payment = z.object({ paymentModeId: id, amount: positive }).strict()
const pair = { productId: id, variantId: id }
const object = (shape: z.ZodRawShape) => z.object(shape).strict()
const schemas: Partial<Record<BillingOperation, z.ZodType>> = {
  searchEanCode: object({ searchStr: z.string().trim().min(1).max(100) }),
  getCustomerByMobile: object({ mobile: z.string().regex(/^[6-9]\d{9}$/) }),
  addProductToTemp: object({ ...pair, qty: positive, mrp: positive, salePrice: positive, wholeSalePrice: positive, costPrice: positive, gstPercentage: money.max(100), billMode: z.number().int().min(1).max(3), customerType: z.number().int().min(0).max(2).nullable().optional(), smId: id.nullable().optional() }),
  updateTempProductQty: object({ ...pair, qty: positive }),
  updateTempProductSalePrice: object({ ...pair, salePrice: positive }),
  updateVoid: object({ ...pair, voidFlag: z.union([z.literal(0), z.literal(1)]) }),
  updateTempProductDiscount: object({ ...pair, discountPercentage: money.max(100).optional(), discountValue: money.optional() }).refine(v => (v.discountPercentage === undefined) !== (v.discountValue === undefined), 'Choose one discount type.'),
  suspendBill: object({ customerName: text, customerMobile: z.string().regex(/^[6-9]\d{9}$/).nullable().optional() }).refine(v => Boolean(v.customerName || v.customerMobile), 'Customer is required.'),
  getProductDetails: object(pair),
  getSuspendedItems: object({ searchStr: z.string().trim().max(100).nullable() }),
  resumeSuspendedBill: object({ suspendedNumber: z.string().trim().min(1).max(255) }),
  getTempBillItem: object(pair),
  updateManualDiscount: object({ discountPercentage: money.max(100).optional(), discountValue: money.optional(), customerId: id.nullable().optional() }).refine(v => (v.discountPercentage === undefined) !== (v.discountValue === undefined), 'Choose one discount type.'),
  saveBill: object({ subTotal: positive, total: positive, billMode: z.number().int().min(1).max(4), paymentModes: z.array(payment).min(1).max(20), discount: money.optional(), gst: money.optional(), roundOffValue: z.number().finite().min(-1000).max(1000).optional(), additionalCharges: money.optional(), customerId: id.nullable().optional(), smId: id.nullable().optional(), narration: text }),
  getApplicableBillBuster: object({ totalAmount: positive }),
  applyBillBuster: object({ ...pair, qty: positive, discountPercentage: money.max(100).optional() }),
  overingBill: object({ billDate: date, billNo: id }),
  checkRefundBill: object({ billDate: date, billNo: id }),
  addRefundProductToTemp: object({ ...pair, qty: positive, billDate: date, billNumber: id }),
  saveRefundBill: object({ subTotal: positive, total: positive, billDate: date, billNumber: id, paymentModes: z.array(payment).min(1).max(20), discount: money.optional(), gst: money.optional(), roundOffValue: z.number().finite().min(-1000).max(1000).optional(), additionalCharges: money.optional(), customerId: id.nullable().optional(), narration: text }),
  getPrint: object({ billNumber: z.union([id, z.string().trim().min(1).max(255)]), billDate: date }),
  getDayCloseReport: object({ date }),
}
const edit = new Set<BillingOperation>(['updateTempProductQty','updateTempProductSalePrice','clearTempBill','updateVoid','updateTempProductDiscount','resumeSuspendedBill','updateManualDiscount','clearManualDiscount','overingBill','dayClose'])
const add = new Set<BillingOperation>(['addProductToTemp','suspendBill','saveBill','applyBillBuster','addRefundProductToTemp','saveRefundBill'])
const normalize = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, '')

export class BillingService {
  private readonly store: BillingStore
  private readonly authStore: AuthStore
  constructor(store: BillingStore, authStore: AuthStore) { this.store = store; this.authStore = authStore }
  private async authorize(account: Account, operation: BillingOperation) {
    const grant = edit.has(operation) ? 'edit' : add.has(operation) ? 'add' : 'view'
    const permissions = await this.authStore.listPermissions(account.client.id, account.user.roleId)
    if (!permissions.some(p => p[grant] === 1 && normalize(p.subFeature ?? p.feature).includes('bill'))) throw new ApiError(403, 'You do not have permission to perform this action.')
  }
  async execute(operation: BillingOperation, account: Account, body: unknown = {}) {
    await this.authorize(account, operation)
    const schema = schemas[operation] ?? object({})
    const parsed = schema.safeParse(body)
    if (!parsed.success) throw new ApiError(422, 'Invalid billing request.')
    try { return await this.store.execute(operation, account, parsed.data as BillingPayload) }
    catch (error) {
      if (error instanceof Error && /^(Invalid|No |Temporary|Insufficient|Discount|Payment|Bill |Search |Product |A bill|A suspended|Clear |Day is|Refund |Suspended)/.test(error.message)) {
        const status = /not found|unavailable/i.test(error.message) ? 404 : /changed|already|current bill/i.test(error.message) ? 409 : 422
        throw new ApiError(status, error.message)
      }
      throw error
    }
  }
}
