export type DeviceInfo = { deviceId: string; deviceName: string | null; platform: string | null; ipAddress: string | null; location: string | null }

export type ActiveSession = { sessionId: string; deviceId: string; deviceName: string | null; platform: string | null; location: string | null; lastSeenAt: Date; createdAt: Date | null }

// 'dismissed': closed without answering; still counts as seen so it is shown once.
export type LoginAlertResponse = 'me' | 'not_me' | 'dismissed'
export type LoginAlert = { id: bigint; deviceName: string | null; platform: string | null; location: string | null; attemptedAt: Date | null }

export type SessionOpenResult =
  | { opened: true }
  | { opened: false; blockedBy: ActiveSession; limit: number }

export interface SessionStore {
  // Atomically opens a session unless the user's other devices already use the
  // client's device limit (users.max_login_devices, else `defaultLimit`).
  open(clientId: bigint, userId: bigint, sessionId: string, device: DeviceInfo, expiresAt: Date, defaultLimit: number): Promise<SessionOpenResult>
  isActive(sessionId: string, userId: bigint): Promise<boolean>
  revoke(sessionId: string, reason: string): Promise<void>
  revokeClient(clientId: bigint, reason: string, userId?: bigint): Promise<number>
  listActive(clientId: bigint): Promise<Array<ActiveSession & { userId: bigint; userName: string | null; ipAddress: string | null }>>
  recordAlert(clientId: bigint, userId: bigint, device: DeviceInfo): Promise<void>
  pendingAlerts(userId: bigint): Promise<LoginAlert[]>
  respondAlert(userId: bigint, alertId: bigint, response: LoginAlertResponse): Promise<boolean>
}

export interface PlatformSettingsStore {
  renewalGraceDays(): Promise<number>
  maxDevicesPerUser(): Promise<number>
  list(): Promise<Record<string, string>>
  update(values: Record<string, string>, adminId: bigint): Promise<void>
}

export type RegistrationInput = {
  businessName: string; contactPersonName: string; mobile: string; email: string
  businessTypeId: bigint | null; city: string | null; address: string | null; notes: string | null; requesterIp: string | null
}
export type RegistrationRow = RegistrationInput & { id: bigint; status: string; clientId: bigint | null; reviewNote: string | null; reviewedAt: Date | null; createdAt: Date | null }

export interface RegistrationStore {
  create(input: RegistrationInput): Promise<'saved' | 'duplicate'>
  list(status: string | undefined, page: number, perPage: number): Promise<{ rows: RegistrationRow[]; total: number }>
  review(id: bigint, status: 'approved' | 'rejected', adminId: bigint, note: string | null, clientId: bigint | null): Promise<boolean>
  businessTypes(): Promise<Array<{ id: bigint; name: string }>>
}
