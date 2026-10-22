export type SupportPriority = 'P1' | 'P2' | 'P3'
export type SupportSource = 'system' | 'customer'
export type SupportStatus = 'open' | 'in_progress' | 'resolved'

export type SupportIncidentInput = {
  clientId: bigint | null
  userId: bigint | null
  source: SupportSource
  priority: SupportPriority
  category: string
  title: string
  description: string
  resolutionSteps: string | null
  requestId: string | null
  method: string | null
  path: string | null
  statusCode: number | null
  signature: string | null
}

export type SupportIncident = SupportIncidentInput & {
  id: bigint
  status: SupportStatus
  occurrenceCount: number
  firstSeenAt: Date
  lastSeenAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface SupportIncidentStore {
  create(input: SupportIncidentInput, now: Date): Promise<SupportIncident>
  createOrIncrement(input: SupportIncidentInput, since: Date, now: Date): Promise<{ incident: SupportIncident; created: boolean }>
  list(filters: { priority?: SupportPriority; status?: SupportStatus }): Promise<SupportIncident[]>
  update(id: bigint, status: SupportStatus, resolutionSteps: string | null, now: Date): Promise<boolean>
}

export interface SupportEmailDelivery {
  readonly configured: boolean
  send(incident: SupportIncident): Promise<void>
}
