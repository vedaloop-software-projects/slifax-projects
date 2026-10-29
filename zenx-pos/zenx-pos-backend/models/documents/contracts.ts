import type { Letterhead } from './letterhead.ts'

export interface LetterheadStore {
  /** The saved design, or null when none has been saved yet. */
  get(key?: string): Promise<{ design: Letterhead; updatedAt: Date | null } | null>
  save(design: Letterhead, actorId: bigint, key?: string): Promise<void>
}
