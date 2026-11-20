import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

// One template message to one recipient. `idempotencyKey` makes a retried request
// return the first message instead of sending again.
export type OutgoingMessage = { idempotencyKey: string; to: string; template: string; language: string; variables: string[] }
export type SendResult = { idempotencyKey: string; ok: true; providerId: string; status: string } | { idempotencyKey: string; ok: false; code: string; error: string; retryable: boolean }
export type ProviderTemplate = { name: string; language: string; category: string; status: string; body: string; variables: number }

export interface WhatsAppProvider {
  // false: sending is not configured on this server.
  readonly available: boolean
  // true: messages are logged, not delivered (staging / local).
  readonly simulated: boolean
  sendBatch(messages: OutgoingMessage[]): Promise<SendResult[]>
  templates(): Promise<ProviderTemplate[]>
}

export const VEDALOOP_BASE_URL = 'https://api.vedaloop.in/v1/api/whatsapp'
export const VEDALOOP_BATCH_LIMIT = 500

type Fetch = typeof globalThis.fetch
type ProviderError = { code?: string; message?: string }

// VedaLoop WhatsApp API (https://tech.vedaloop.in/developers/whatsapp). The sending number
// is the one connected to the organization that owns the key.
export class VedaloopWhatsAppProvider implements WhatsAppProvider {
  readonly available = true
  readonly simulated = false
  private readonly key: string
  private readonly base: string
  private readonly request: Fetch
  constructor(key: string, base = VEDALOOP_BASE_URL, request: Fetch = globalThis.fetch) {
    this.key = key; this.base = base.replace(/\/+$/, ''); this.request = request
  }

  private headers() { return { Authorization: `Bearer ${this.key}`, 'Content-Type': 'application/json', Accept: 'application/json' } }

  async sendBatch(messages: OutgoingMessage[]): Promise<SendResult[]> {
    const results: SendResult[] = []
    for (let start = 0; start < messages.length; start += VEDALOOP_BATCH_LIMIT) {
      const chunk = messages.slice(start, start + VEDALOOP_BATCH_LIMIT)
      let response: Response
      try {
        response = await this.request(`${this.base}/messages/batch`, {
          method: 'POST', headers: this.headers(), signal: AbortSignal.timeout(30_000),
          body: JSON.stringify({ messages: chunk.map(message => ({ to: message.to, idempotencyKey: message.idempotencyKey, template: { name: message.template, language: message.language, variables: message.variables } })) }),
        })
      } catch {
        // Network failure: nothing is known to be sent; the idempotency keys make a retry safe.
        results.push(...chunk.map(message => ({ idempotencyKey: message.idempotencyKey, ok: false as const, code: 'NETWORK', error: 'WhatsApp provider could not be reached.', retryable: true })))
        continue
      }
      const payload = await response.json().catch(() => null) as { results?: Array<{ index?: number; id?: string; status?: string; error?: ProviderError }> } & ProviderError | null
      if (!response.ok || !Array.isArray(payload?.results)) {
        const retryable = response.status >= 500 || response.status === 429
        results.push(...chunk.map(message => ({ idempotencyKey: message.idempotencyKey, ok: false as const, code: payload?.code ?? `HTTP_${response.status}`, error: payload?.message ?? `WhatsApp provider error (${response.status}).`, retryable })))
        continue
      }
      chunk.forEach((message, index) => {
        const item = payload.results!.find(result => result.index === index) ?? payload.results![index]
        if (item?.id && !item.error) results.push({ idempotencyKey: message.idempotencyKey, ok: true, providerId: item.id, status: item.status ?? 'queued' })
        else results.push({ idempotencyKey: message.idempotencyKey, ok: false, code: item?.error?.code ?? 'UNKNOWN', error: item?.error?.message ?? 'Not accepted by the WhatsApp provider.', retryable: false })
      })
    }
    return results
  }

  async templates(): Promise<ProviderTemplate[]> {
    const response = await this.request(`${this.base}/templates?fresh=1`, { headers: this.headers(), signal: AbortSignal.timeout(15_000) })
    const payload = await response.json().catch(() => null) as { templates?: Array<{ name: string; language: string; category?: string; status?: string; body?: { text?: string; variables?: number } }> } & ProviderError | null
    if (!response.ok || !Array.isArray(payload?.templates)) throw new Error(payload?.message ?? `WhatsApp provider error (${response.status}).`)
    return payload.templates.map(template => ({ name: template.name, language: template.language, category: template.category ?? '', status: template.status ?? '', body: template.body?.text ?? '', variables: Number(template.body?.variables ?? 0) }))
  }
}

// Accepts everything and logs nothing outside the database. Only enabled with WHATSAPP_SIMULATE=true.
export class SimulatedWhatsAppProvider implements WhatsAppProvider {
  readonly available = true
  readonly simulated = true
  async sendBatch(messages: OutgoingMessage[]): Promise<SendResult[]> {
    return messages.map(message => ({ idempotencyKey: message.idempotencyKey, ok: true, providerId: `sim_${randomUUID()}`, status: 'sent' }))
  }
  async templates(): Promise<ProviderTemplate[]> { return [] }
}

export class UnavailableWhatsAppProvider implements WhatsAppProvider {
  readonly available = false
  readonly simulated = false
  async sendBatch(): Promise<SendResult[]> { throw new Error('WHATSAPP_NOT_CONFIGURED') }
  async templates(): Promise<ProviderTemplate[]> { throw new Error('WHATSAPP_NOT_CONFIGURED') }
}

export function whatsAppProviderFromEnv(env: NodeJS.ProcessEnv = process.env): WhatsAppProvider {
  const key = env.VEDALOOP_WHATSAPP_API_KEY?.trim()
  if (key) return new VedaloopWhatsAppProvider(key, env.VEDALOOP_WHATSAPP_API_URL?.trim() || VEDALOOP_BASE_URL)
  if (env.WHATSAPP_SIMULATE === 'true') return new SimulatedWhatsAppProvider()
  return new UnavailableWhatsAppProvider()
}

// Indian mobile numbers are stored as 10 digits; the provider wants the country code.
export const toInternational = (mobile: string) => `91${mobile}`

// VedaLoop signs `timestamp + "." + raw body` with HMAC-SHA256 (X-VedaLoop-Signature: sha256=<hex>)
// and the timestamp must be within five minutes.
export function verifyVedaloopSignature(rawBody: Buffer | string, timestamp: string | undefined, signature: string | undefined, secret: string, now = Date.now()) {
  if (!timestamp || !signature || !/^\d+$/.test(timestamp)) return false
  if (Math.abs(now / 1000 - Number(timestamp)) > 300) return false
  const expected = `sha256=${createHmac('sha256', secret).update(`${timestamp}.`).update(rawBody).digest('hex')}`
  const a = Buffer.from(expected), b = Buffer.from(signature.trim())
  return a.length === b.length && timingSafeEqual(a, b)
}
