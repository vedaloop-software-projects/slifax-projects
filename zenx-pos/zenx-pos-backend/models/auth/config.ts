export type AuthConfig = {
  jwtSecret: Uint8Array
  jwtIssuer: string
  jwtAudience: string
  jwtLifetime: `${number}${'s' | 'm' | 'h' | 'd'}`
  publicBaseUrl: string
}

export function loadAuthConfig(environment: NodeJS.ProcessEnv = process.env): AuthConfig {
  const secret = environment.JWT_SECRET ?? ''
  if (Buffer.byteLength(secret) < 32) throw new Error('JWT_SECRET must contain at least 32 bytes.')
  const lifetime = environment.JWT_LIFETIME ?? '8h'
  if (!/^\d+[smhd]$/.test(lifetime)) throw new Error('JWT_LIFETIME must use a value such as 30m, 8h, or 7d.')
  const publicBaseUrl = (environment.PUBLIC_BASE_URL ?? '').replace(/\/$/, '')
  return {
    jwtSecret: new TextEncoder().encode(secret),
    jwtIssuer: environment.JWT_ISSUER ?? 'zenx-pos-api',
    jwtAudience: environment.JWT_AUDIENCE ?? 'zenx-pos-client',
    jwtLifetime: lifetime as AuthConfig['jwtLifetime'],
    publicBaseUrl,
  }
}
