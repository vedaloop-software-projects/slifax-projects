export type DeviceInfo = { deviceId: string; deviceName: string | null; platform: string | null; ipAddress: string | null; location: string | null }

export type ActiveSession = { sessionId: string; deviceId: string; deviceName: string | null; platform: string | null; location: string | null; lastSeenAt: Date; createdAt: Date | null }

// 'dismissed': closed without answering; still counts as seen so it is shown once.
export type LoginAlertResponse = 'me' | 'not_me' | 'dismissed'
export type LoginAlert = { id: bigint; deviceName: string | null; platform: string | null; location: string | null; attemptedAt: Date | null }

export type SessionOpenResult =
  // newDevice: no session of this client has used the device before.
  // signedOut: devices whose sessions were ended to make room (takeOver).
  | { opened: true; newDevice: boolean; signedOut: ActiveSession[] }
  // blockedBy: the device a takeOver would sign out first.
  | { opened: false; blockedBy: ActiveSession; limit: number }

export interface SessionStore {
  // Atomically opens a session unless the user's other devices already use the
  // client's device limit (users.max_login_devices, else `defaultLimit`). With `takeOver`
  // (approved by the other device, or by an OTP to the account's mobile), the least
  // recently active other devices are signed out until the new one fits.
  open(clientId: bigint, userId: bigint, sessionId: string, device: DeviceInfo, expiresAt: Date, defaultLimit: number, takeOver?: boolean): Promise<SessionOpenResult>
  isActive(sessionId: string, userId: bigint): Promise<boolean>
  // Why an inactive session ended (revoked_reason), or null if it expired or never existed.
  endedReason?(sessionId: string, userId: bigint): Promise<string | null>
  revoke(sessionId: string, reason: string): Promise<void>
  revokeClient(clientId: bigint, reason: string, userId?: bigint): Promise<number>
  listActive(clientId: bigint): Promise<Array<ActiveSession & { userId: bigint; userName: string | null; ipAddress: string | null }>>
  recordAlert(clientId: bigint, userId: bigint, device: DeviceInfo): Promise<bigint>
  // The signed-in device's answer to a blocked login (null while unanswered).
  alertStatus(alertId: bigint, userId: bigint): Promise<{ response: string | null; createdAt: Date } | null>
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
