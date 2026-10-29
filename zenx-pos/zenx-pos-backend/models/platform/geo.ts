import { isIP } from 'node:net'

export interface IpLocator { locate(ip: string | null): Promise<string | null>; timeZone?(ip: string | null): Promise<string | null> }

const privateIp = (ip: string) => /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1$|fc|fd|fe80)/i.test(ip.replace(/^::ffff:/, ''))

// "City, Region, Country" from ipinfo.io. Lookups are best effort: a slow or
// failing provider never delays a login by more than the timeout.
export class IpInfoLocator implements IpLocator {
  private readonly token: string | undefined
  private readonly timeoutMs: number
  private readonly cache = new Map<string, { at: number; value: string | null; timeZone: string | null }>()
  constructor(token = process.env.IPINFO_TOKEN?.trim() || undefined, timeoutMs = 1500) { this.token = token; this.timeoutMs = timeoutMs }

  async locate(raw: string | null) {
    const ip = raw?.replace(/^::ffff:/, '') ?? ''
    if (isIP(ip) && privateIp(ip)) return 'Local network'
    return (await this.lookup(ip))?.value ?? null
  }

  // IANA zone ipinfo reports for the address; used only when the device sends none.
  async timeZone(raw: string | null) {
    return (await this.lookup(raw?.replace(/^::ffff:/, '') ?? ''))?.timeZone ?? null
  }

  private async lookup(ip: string) {
    if (!isIP(ip) || privateIp(ip) || !this.token) return null
    const hit = this.cache.get(ip)
    if (hit && Date.now() - hit.at < 86_400_000) return hit
    let value: string | null = null, timeZone: string | null = null
    try {
      const response = await fetch(`https://ipinfo.io/${encodeURIComponent(ip)}/json`, { headers: { Authorization: `Bearer ${this.token}`, Accept: 'application/json' }, signal: AbortSignal.timeout(this.timeoutMs) })
      if (response.ok) {
        const body = await response.json() as { city?: string; region?: string; country?: string; timezone?: string }
        value = [body.city, body.region, body.country].filter(part => typeof part === 'string' && part.trim()).join(', ') || null
        timeZone = typeof body.timezone === 'string' ? body.timezone : null
      }
    } catch { value = null }
    if (this.cache.size > 5_000) this.cache.clear()
    const entry = { at: Date.now(), value, timeZone }
    this.cache.set(ip, entry)
    return entry
  }
}
