import type { Prisma, PrismaClient } from '@prisma/client'
import type { Account } from '../auth/contracts.ts'
import type { ControlInput, VariantInput } from './contracts.ts'

const variantData = (value: VariantInput) => ({ variant_code: value.variantCode, ean_code: value.eanCode, pack_size: value.packSize, size_id: value.sizeId, colour_id: value.colourId, basic_cost: value.basicCost, cost_price: value.costPrice, mrp: value.mrp, sale_price: value.salePrice, whole_sale_price: value.wholeSalePrice, dine_in_price: value.dineInPrice, take_away_price: value.takeAwayPrice, salon_duration: value.salonDuration, priority: value.priority, status: value.status })
const audit = (account: Account, type: string, description: string, now: Date) => ({ client_id: account.client.id, user_id: account.user.id, type, description, created_at: now, updated_at: now })

export class PrismaProductStore {
  private readonly prisma: PrismaClient
  constructor(prisma: PrismaClient) { this.prisma = prisma }

  private async validateParents(transaction: Prisma.TransactionClient, account: Account, value: VariantInput) {
    if (value.sizeId !== null && !await transaction.sizes.findFirst({ where: { id: value.sizeId, client_id: account.client.id, status: 1, trash: 0 } })) return 'size_missing' as const
    if (value.colourId !== null && !await transaction.colours.findFirst({ where: { id: value.colourId, client_id: account.client.id, status: 1, trash: 0 } })) return 'colour_missing' as const
    return null
  }

  private async duplicateCode(transaction: Prisma.TransactionClient, account: Account, value: VariantInput, excludeId?: bigint) {
    const common = { client_id: account.client.id, trash: 0, ...(excludeId ? { id: { not: excludeId } } : {}) }
    if (await transaction.productVariants.findFirst({ where: { ...common, variant_code: value.variantCode } })) return 'variant_code_duplicate' as const
    if (value.eanCode && await transaction.productVariants.findFirst({ where: { ...common, ean_code: value.eanCode } })) return 'ean_duplicate' as const
    return null
  }

  async createVariant(account: Account, productId: bigint, value: VariantInput) {
    return this.prisma.$transaction(async transaction => {
      const product = await transaction.products.findFirst({ where: { id: productId, client_id: account.client.id, trash: 0 } })
      if (!product) return 'product_missing' as const
      const control = await transaction.productControls.findFirst({ where: { product_id: productId, client_id: account.client.id } })
      if (control?.kit === 1) return 'kit_locked' as const
      const parentError = await this.validateParents(transaction, account, value)
      if (parentError) return parentError
      const codeError = await this.duplicateCode(transaction, account, value)
      if (codeError) return codeError
      if (await transaction.productVariants.findFirst({ where: { product_id: productId, client_id: account.client.id, pack_size: value.packSize, trash: 0 } })) return 'pack_duplicate' as const
      const now = new Date()
      const collision = await transaction.productVariants.findFirst({ where: { product_id: productId, client_id: account.client.id, priority: value.priority, trash: 0 } })
      if (collision) {
        const last = await transaction.productVariants.aggregate({ where: { product_id: productId, client_id: account.client.id, trash: 0 }, _max: { priority: true } })
        await transaction.productVariants.update({ where: { id: collision.id }, data: { priority: (last._max.priority ?? 0) + 1, updated_by: Number(account.user.id), updated_at: now } })
      }
      await transaction.productVariants.create({ data: { product_id: productId, client_id: account.client.id, ...variantData(value), variant_qty: 0, trash: 0, created_by: Number(account.user.id), created_at: now } })
      await transaction.audits.create({ data: audit(account, 'add', `${value.variantCode} variant added`, now) })
      return 'saved' as const
    })
  }

  async updateVariant(account: Account, id: bigint, value: VariantInput) {
    return this.prisma.$transaction(async transaction => {
      const current = await transaction.productVariants.findFirst({ where: { id, client_id: account.client.id, trash: 0 } })
      if (!current) return 'variant_missing' as const
      const parentError = await this.validateParents(transaction, account, value)
      if (parentError) return parentError
      const codeError = await this.duplicateCode(transaction, account, value, id)
      if (codeError) return codeError
      if (await transaction.productVariants.findFirst({ where: { product_id: current.product_id, client_id: account.client.id, pack_size: value.packSize, trash: 0, id: { not: id } } })) return 'pack_duplicate' as const
      const now = new Date()
      if (current.priority !== value.priority) {
        const swap = await transaction.productVariants.findFirst({ where: { product_id: current.product_id, client_id: account.client.id, priority: value.priority, trash: 0, id: { not: id } } })
        if (swap) await transaction.productVariants.update({ where: { id: swap.id }, data: { priority: current.priority, updated_by: Number(account.user.id), updated_at: now } })
      }
      await transaction.productVariants.update({ where: { id }, data: { ...variantData(value), updated_by: Number(account.user.id), updated_at: now } })
      await transaction.audits.create({ data: audit(account, 'update', `${value.variantCode} variant updated`, now) })
      return 'saved' as const
    })
  }

  async updateControls(account: Account, productId: bigint, value: ControlInput) {
    return this.prisma.$transaction(async transaction => {
      const product = await transaction.products.findFirst({ where: { id: productId, client_id: account.client.id, trash: 0 } })
      if (!product) return 'product_missing' as const
      const control = await transaction.productControls.findFirst({ where: { product_id: productId, client_id: account.client.id } })
      if (!control) return 'control_missing' as const
      if (value.kit === 1 && await transaction.productVariants.count({ where: { product_id: productId, client_id: account.client.id, trash: 0 } }) > 1) return 'kit_variant_conflict' as const
      const now = new Date()
      await transaction.productControls.update({ where: { id: control.id }, data: { allow_weighing_scale: value.allowWeighingScale, allow_decimals: value.allowDecimals, allow_discount: value.allowDiscount, allow_price_override: value.allowPriceOverride, kot_required: value.kotRequired, kit: value.kit, updated_by: Number(account.user.id), updated_at: now } })
      await transaction.audits.create({ data: audit(account, 'update', `${product.product_code} product controls updated`, now) })
      return 'saved' as const
    })
  }
}
