import type { PrismaClient } from '@prisma/client'
import type { LetterheadStore } from './contracts.ts'
import { parseLetterhead, type Letterhead } from './letterhead.ts'

export class PrismaLetterheadStore implements LetterheadStore {
  private readonly prisma: PrismaClient
  constructor(prisma: PrismaClient) { this.prisma = prisma }
  async get(key = 'default') {
    const row = await this.prisma.documentLetterheads.findFirst({ where: { letterhead_key: key } })
    if (!row) return null
    // A stored design that no longer validates falls back to the built-in default.
    let parsed: ReturnType<typeof parseLetterhead>
    try { parsed = parseLetterhead(JSON.parse(row.design)) } catch { return null }
    return parsed.success ? { design: parsed.data, updatedAt: row.updated_at } : null
  }
  async save(design: Letterhead, actorId: bigint, key = 'default') {
    const now = new Date(), json = JSON.stringify(design)
    await this.prisma.documentLetterheads.upsert({ where: { letterhead_key: key }, create: { letterhead_key: key, design: json, updated_by: actorId, created_at: now, updated_at: now }, update: { design: json, updated_by: actorId, updated_at: now } })
  }
}
