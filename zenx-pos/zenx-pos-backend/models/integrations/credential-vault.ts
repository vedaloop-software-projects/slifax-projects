import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

type Envelope = { v: 1; iv: string; tag: string; data: string }

export class CredentialVault {
  readonly key: Buffer

  constructor(encodedKey: string) {
    const key = Buffer.from(encodedKey, 'base64')
    if (key.length !== 32) throw new Error('INTEGRATION_CREDENTIALS_MASTER_KEY must be a base64-encoded 32-byte key.')
    this.key = key
  }

  encrypt(value: Record<string, string>, tenantId: bigint, providerCode: string) {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', this.key, iv)
    cipher.setAAD(Buffer.from(`${tenantId}:${providerCode}`))
    const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
    const envelope: Envelope = { v: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') }
    return JSON.stringify(envelope)
  }

  decrypt(payload: string, tenantId: bigint, providerCode: string) {
    const envelope = JSON.parse(payload) as Envelope
    if (envelope.v !== 1) throw new Error('Unsupported credential envelope version.')
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(envelope.iv, 'base64'))
    decipher.setAAD(Buffer.from(`${tenantId}:${providerCode}`))
    decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'))
    const clear = Buffer.concat([decipher.update(Buffer.from(envelope.data, 'base64')), decipher.final()]).toString('utf8')
    return JSON.parse(clear) as Record<string, string>
  }
}
