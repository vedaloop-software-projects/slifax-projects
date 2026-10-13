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
