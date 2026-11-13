export type ResetUser = { id: bigint; clientId: bigint; name: string | null; mobile: string }

export type ResetChallenge = {
  version: 1
  userId: string
  clientId: string
  otpHash: string
  attempts: number
  createdAt: number
  expiresAt: number
  resetTokenHash?: string
  resetExpiresAt?: number
}

export type StoredChallenge = { value: string; challenge: ResetChallenge }

export interface ResetStore {
  findActiveUser(mobile: string, today: string): Promise<ResetUser | null>
  putChallenge(key: string, challenge: ResetChallenge): Promise<void>
  getChallenge(key: string): Promise<StoredChallenge | null>
  compareAndSetChallenge(key: string, expectedValue: string, challenge: ResetChallenge): Promise<boolean>
  deleteChallenge(key: string): Promise<void>
  consumeReset(key: string, expectedValue: string, user: ResetUser, passwordHash: string): Promise<boolean>
}

export interface OtpDelivery {
  readonly available: boolean
  sendPasswordResetOtp(mobile: string, otp: string, expiresInMinutes: number): Promise<void>
}
