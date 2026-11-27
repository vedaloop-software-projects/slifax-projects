import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { AiCreditStore, ChargeInput, UsageRow } from '../../../models/ai/credits.ts'
import type { AiDataStore } from '../../../models/ai/data-store.ts'
import { withBusinessZone } from '../../../models/system/business-time.ts'
import { AiService } from '../service.ts'

class MemoryCredits implements AiCreditStore {
  rows: { day: string; feature: string; key: string; credits: number }[] = []
  async usage(_clientId: bigint, day: Date): Promise<UsageRow[]> {
    const map = new Map<string, UsageRow>()
    for (const row of this.rows.filter(item => item.day === day.toISOString())) {
      const entry = map.get(row.feature) ?? { feature: row.feature, runs: 0, credits: 0 }
      entry.runs++; entry.credits += row.credits; map.set(row.feature, entry)
    }
    return [...map.values()]
  }
  async hasRun(_clientId: bigint, day: Date, feature: string, key: string) { return this.rows.some(row => row.day === day.toISOString() && row.feature === feature && row.key === key) }
  async charge(input: ChargeInput) {
    if (await this.hasRun(input.clientId, input.day, input.feature, input.inputKey)) return 'repeat' as const
    const used = this.rows.filter(row => row.day === input.day.toISOString()).reduce((sum, row) => sum + row.credits, 0)
    if (used + input.credits > input.daily) return 'short' as const
    this.rows.push({ day: input.day.toISOString(), feature: input.feature, key: input.inputKey, credits: input.credits })
    return 'charged' as const
  }
}

const data = (daily: number, sales = true): AiDataStore => ({
  dailyCredits: async () => daily,
  itemDays: async () => sales ? [{ variantId: 1, productId: 1, day: '2026-11-20', qty: 10 }] : [],
  variants: async () => [{ variantId: 1, productId: 1, name: 'Milk', packSize: '500 ml', code: 'V1', stock: 2, costPrice: 20, salePrice: 25, mrp: 28, createdAt: null }],
  lastSales: async () => new Map([[1, '2026-11-20']]),
  hourTotals: async () => [], customerDays: async () => [], customers: async () => new Map(), userDays: async () => [], userNames: async () => new Map(),
  baskets: async () => [], productNames: async () => new Map(), costLines: async () => [], kotDays: async () => [],
  draftMasters: async () => ({ categories: [], subCategories: [], brands: [], units: [], taxes: [], products: [] }),
})
const account = { client: { id: 7n }, user: { id: 1n } } as never
const clock = () => new Date('2026-11-25T06:00:00Z')
const service = (daily: number, credits = new MemoryCredits(), sales = true) => new AiService({ credits, data: data(daily, sales), reorder: async () => ({ rows: [] }) }, clock)
const inZone = <T>(run: () => Promise<T>) => withBusinessZone('Asia/Kolkata', run)

describe('ZenxPOS AI credits', () => {
  it('takes the feature cost from the daily credits and shows what is left', async () => {
    const result = await inZone(() => service(50).run(account, 'stockAlerts', {}))
    assert.equal(result.charged, 2)
    assert.deepEqual([result.credits.daily, result.credits.used, result.credits.left], [50, 2, 48])
    assert.deepEqual(result.credits.usage.map(row => [row.label, row.runs, row.credits]), [['Stock alerts', 1, 2]])
  })

  it('does not charge the same run twice on a day', async () => {
    const credits = new MemoryCredits(), ai = service(50, credits)
    await inZone(() => ai.run(account, 'stockAlerts', {}))
    const again = await inZone(() => ai.run(account, 'stockAlerts', {}))
    assert.deepEqual([again.charged, again.repeat, again.credits.used], [0, true, 2])
  })

  it('refuses a run that needs more credits than are left', async () => {
    await assert.rejects(inZone(() => service(4).run(account, 'smartReorder', {})), { status: 429, message: /needs 5 credits and only 4 are left today/ })
  })

  it('does not charge when there is nothing to analyse', async () => {
    const result = await inZone(() => service(50, new MemoryCredits(), false).run(account, 'dailyBrief', {}))
    assert.deepEqual([result.charged, result.result.chargeable], [0, false])
  })

  it('is off when the store has no daily credits, and checks input', async () => {
    await assert.rejects(inZone(() => service(0).run(account, 'stockAlerts', {})), { status: 403 })
    await assert.rejects(inZone(() => service(50).run(account, 'productFill', { name: 'ab' })), { status: 422 })
    await assert.rejects(inZone(() => service(50).run(account, 'unknown', {})), { status: 404 })
  })

  it('reports the allowance and costs', async () => {
    const status = await inZone(() => service(50).status(account))
    assert.deepEqual([status.daily, status.left, status.day, status.costs.smartReorder], [50, 50, '2026-11-25', 5])
  })
})
