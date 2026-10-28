import type { PrismaClient } from '@prisma/client'
import type { PlatformSettingsStore } from './contracts.ts'

export const platformSettingDefaults: Record<string, string> = { renewal_grace_days: '7', max_devices_per_user: '1' }
const CACHE_MS = 60_000

export class PrismaPlatformSettingsStore implements PlatformSettingsStore {
  private readonly prisma: PrismaClient
  private cached?: { at: number; values: Record<string, string> }
  constructor(prisma: PrismaClient) { this.prisma = prisma }

  async list() {
    if (this.cached && Date.now() - this.cached.at < CACHE_MS) return this.cached.values
    const rows = await this.prisma.platformSettings.findMany({ select: { setting_key: true, setting_value: true } })
    const values = { ...platformSettingDefaults, ...Object.fromEntries(rows.map(row => [row.setting_key, row.setting_value])) }
    this.cached = { at: Date.now(), values }
    return values
  }

  async renewalGraceDays() {
    const value = Number((await this.list()).renewal_grace_days)
    return Number.isInteger(value) && value >= 0 ? value : 7
  }

  async maxDevicesPerUser() {
    const value = Number((await this.list()).max_devices_per_user)
    return Number.isInteger(value) && value >= 1 ? value : 1
  }

  async update(values: Record<string, string>, adminId: bigint) {
    const now = new Date()
    await this.prisma.$transaction(Object.entries(values).map(([key, value]) => this.prisma.platformSettings.upsert({
      where: { setting_key: key },
      create: { setting_key: key, setting_value: value, updated_by: adminId, created_at: now, updated_at: now },
      update: { setting_value: value, updated_by: adminId, updated_at: now },
    })))
    this.cached = undefined
  }
}
