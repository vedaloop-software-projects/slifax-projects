import type { PrismaClient } from '@prisma/client'

// ZenxPOS AI credits: each store gets users.ai_daily_credits (default 50) per business day
// in its time zone, and every run takes its feature's cost from that day's credits. The
// same run (same feature and input) again on the same day is free.

export const AI_FEATURES = {
  productFill: { label: 'Product creation', credits: 1 },
  stockAlerts: { label: 'Stock alerts', credits: 2 },
  customerGroups: { label: 'Customer groups', credits: 2 },
  dailyBrief: { label: 'Daily brief', credits: 1 },
  dayCheck: { label: 'Unusual activity check', credits: 1 },
  offerIdeas: { label: 'Offer ideas', credits: 3 },
  priceCheck: { label: 'Price check', credits: 2 },
  smartReorder: { label: 'AI reorder', credits: 5 },
  prepForecast: { label: 'Kitchen prep forecast', credits: 2 },
} as const
export type AiFeature = keyof typeof AI_FEATURES
export const isAiFeature = (value: string): value is AiFeature => Object.hasOwn(AI_FEATURES, value)

export type UsageRow = { feature: string; runs: number; credits: number }
export type ChargeResult = 'charged' | 'repeat' | 'short'
export type ChargeInput = { clientId: bigint; userId: bigint; day: Date; feature: AiFeature; inputKey: string; credits: number; daily: number; now: Date }

export interface AiCreditStore {
  usage(clientId: bigint, day: Date): Promise<UsageRow[]>
  hasRun(clientId: bigint, day: Date, feature: AiFeature, inputKey: string): Promise<boolean>
  charge(input: ChargeInput): Promise<ChargeResult>
}

export class PrismaAiCreditStore implements AiCreditStore {
  private readonly prisma: PrismaClient
  constructor(prisma: PrismaClient) { this.prisma = prisma }

  async usage(clientId: bigint, day: Date) {
    const rows = await this.prisma.aiUsage.groupBy({ by: ['feature'], where: { client_id: clientId, usage_date: day }, _count: { _all: true }, _sum: { credits: true } })
    return rows.map(row => ({ feature: row.feature, runs: row._count._all, credits: row._sum.credits ?? 0 }))
  }

  async hasRun(clientId: bigint, day: Date, feature: AiFeature, inputKey: string) {
    return !!await this.prisma.aiUsage.findFirst({ where: { client_id: clientId, usage_date: day, feature, input_key: inputKey }, select: { id: true } })
  }

  // The store's client row is locked while the day's total is checked and the run is
  // written, so two runs at the same moment cannot both spend the last credits.
  async charge(input: ChargeInput): Promise<ChargeResult> {
    return this.prisma.$transaction(async transaction => {
      await transaction.$queryRaw`SELECT id FROM users WHERE id = ${input.clientId} FOR UPDATE`
      const where = { client_id: input.clientId, usage_date: input.day }
      if (await transaction.aiUsage.findFirst({ where: { ...where, feature: input.feature, input_key: input.inputKey }, select: { id: true } })) return 'repeat'
      const used = (await transaction.aiUsage.aggregate({ where, _sum: { credits: true } }))._sum.credits ?? 0
      if (used + input.credits > input.daily) return 'short'
      await transaction.aiUsage.create({ data: { ...where, feature: input.feature, input_key: input.inputKey, credits: input.credits, created_by: input.userId, created_at: input.now } })
      return 'charged'
    })
  }
}
