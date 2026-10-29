import type { Prisma } from '@prisma/client'

type StockTransaction = Pick<Prisma.TransactionClient, 'billingSettings' | 'productVariants'>

export async function allowsNegativeInventory(transaction: StockTransaction, clientId: bigint): Promise<boolean> {
  const settings = await transaction.billingSettings.findFirst({
    where: { client_id: clientId },
    select: { allow_negative_inventory: true },
  })
  return (settings?.allow_negative_inventory ?? 1) === 1
}

export async function decrementVariantStock(
  transaction: StockTransaction,
  input: { clientId: bigint; productId: bigint; variantId: bigint; quantity: number; allowNegative: boolean; userId?: bigint },
): Promise<boolean> {
  const result = await transaction.productVariants.updateMany({
    where: {
      id: input.variantId,
      product_id: input.productId,
      client_id: input.clientId,
      status: 1,
      trash: 0,
      ...(input.allowNegative ? {} : { variant_qty: { gte: input.quantity } }),
    },
    data: {
      variant_qty: { decrement: input.quantity },
      ...(input.userId === undefined ? {} : { updated_by: Number(input.userId) }),
      updated_at: new Date(),
    },
  })
  return result.count === 1
}

export async function incrementVariantStock(
  transaction: StockTransaction,
  input: { clientId: bigint; productId: bigint; variantId: bigint; quantity: number; userId?: bigint },
): Promise<boolean> {
  const result = await transaction.productVariants.updateMany({
    where: { id: input.variantId, product_id: input.productId, client_id: input.clientId, status: 1, trash: 0 },
    data: { variant_qty: { increment: input.quantity }, ...(input.userId === undefined ? {} : { updated_by: Number(input.userId) }), updated_at: new Date() },
  })
  return result.count === 1
}

// products.qoh is the stock the product screens show; keep it equal to the sum of its variants.
export async function syncProductQoh(
  transaction: Pick<Prisma.TransactionClient, 'productVariants' | 'products'>,
  clientId: bigint,
  productIds: Iterable<bigint>,
): Promise<void> {
  const now = new Date()
  for (const productId of new Set(productIds)) {
    const total = await transaction.productVariants.aggregate({ where: { client_id: clientId, product_id: productId, trash: 0 }, _sum: { variant_qty: true } })
    await transaction.products.updateMany({ where: { id: productId, client_id: clientId, trash: 0 }, data: { qoh: Number(total._sum.variant_qty ?? 0), updated_at: now } })
  }
}
