import type { Printer, PrinterLanguage } from '../types'

const KEY = 'label-print-agent-v1'
const BASE = 'http://127.0.0.1:17846'
export interface AgentSettings { token: string; printers: Record<string, string> }
export interface SpoolResult { id: string; state: 'spooled' | 'unknown'; spoolJobId?: number; error?: string }

export function agentSettings(): AgentSettings {
  try { return JSON.parse(localStorage.getItem(KEY) ?? 'null') ?? { token: '', printers: {} } }
  catch { return { token: '', printers: {} } }
}
export function saveAgentSettings(settings: AgentSettings) {
  localStorage.setItem(KEY, JSON.stringify(settings))
}

/**
 * Auto-connect: agents from this version on give their key to websites already paired on
 * this PC, so nobody copies it by hand. Saves and returns the key, or null (older agent,
 * agent not running, website not paired, or browser permission not granted).
 */
export async function autoPair(): Promise<string | null> {
  try {
    const res = await fetch(BASE + '/pair', { signal: AbortSignal.timeout(await waitMs(5000)), credentials: 'omit' })
    if (!res.ok) return null
    const { token } = (await res.json()) as { token?: unknown }
    if (typeof token !== 'string' || token.length < 20) return null
    saveAgentSettings({ ...agentSettings(), token })
    return token
  } catch {
    return null
  }
}

async function request<T>(path: string, body?: unknown, token = agentSettings().token, retried = false): Promise<T> {
  if (!token) {
    // First time on this PC/browser: fetch the key from the agent instead of asking for it.
    const paired = retried ? null : await autoPair()
    if (!paired) throw new Error('This PC is not connected to the print agent. An admin needs to set up printing on this PC (Printers & Templates).')
    return request<T>(path, body, paired, true)
  }
  let response: Response
  const before = (await queryNetworkPermission()).state
  try {
    response = await fetch(BASE + path, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(body ? 60000 : await waitMs(10000)),
      credentials: 'omit',
    })
  } catch {
    if (body) throw new Error('No reply from the print agent. The job may already be queued in Windows. Check the Windows queue before reprinting; no automatic retry was made.')
    // Staff allowed access while this request waited: it ran before the decision, so try once more.
    const after = (await queryNetworkPermission()).state
    if (!retried && before !== 'granted' && after === 'granted') return request<T>(path, body, token, true)
    // Tell staff whether the browser is blocking it, the website is not paired, or the agent is not running.
    throw new Error(await diagnoseUnreachable(after))
  }
  // The agent was reinstalled with a new key: re-pair once and retry. Never for print jobs
  // (POST), so a job can't be sent twice.
  if (response.status === 401 && !body && !retried) {
    const fresh = await autoPair()
    if (fresh && fresh !== token) return request<T>(path, body, fresh, true)
  }
  const result = await response.json()
  if (!response.ok) throw new Error(result.error ?? 'Print agent request failed')
  return result as T
}

export async function localPrinters(token?: string): Promise<string[]> {
  return (await request<{ printers: string[] }>('/printers', undefined, token)).printers
}
export function mappedPrinter(printerId: string): string {
  const name = agentSettings().printers[printerId]
  if (!name) throw new Error('Open Printers and select the Windows queue for this printer profile.')
  return name
}
export async function sendRaw(printerId: string, bytes: Uint8Array, id: string = crypto.randomUUID()): Promise<SpoolResult> {
  return sendRawToQueue(mappedPrinter(printerId), bytes, id)
}

/** Existing PRN already contains the layout/language; only a Windows queue is needed. */
export async function sendRawToQueue(printer: string, bytes: Uint8Array, id: string = crypto.randomUUID()): Promise<SpoolResult> {
  if (!printer.trim()) throw new Error('Select a Windows printer.')
  if (!bytes.length || bytes.length > 4 * 1024 * 1024) throw new Error('PRN must be between 1 byte and 4 MB.')
  let binary = ''
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
  const result = await request<SpoolResult>('/jobs', { id, printer, data: btoa(binary) })
  if (result.state !== 'spooled') throw new Error(result.error ?? 'Submission uncertain. Check the Windows queue before reprinting.')
  return result
}
export function sendPrn(printer: Printer, prn: string, id?: string) {
  return sendRaw(printer.id, generatedPrnBytes(printer.language, prn), id)
}

export function generatedPrnBytes(language: PrinterLanguage, prn: string): Uint8Array {
  if (language === 'ESCPOS') throw new Error('Generated ESC/POS is not supported yet. You can send a verified binary PRN file from Printers.')
  if (language === 'TSPL' && Array.from(prn).some((c) => c.charCodeAt(0) > 127)) throw new Error('Generated TSPL currently supports ASCII text only. Use a verified PRN file for other scripts.')
  return new TextEncoder().encode(prn)
}

// Chrome / Edge ask once per website before it may talk to devices on this PC or the local
// network ("Local Network Access"), which includes the print agent on 127.0.0.1. A website
// cannot skip that prompt; we can only read its state and guide staff through it.

export type NetworkPermission = 'granted' | 'prompt' | 'denied' | 'unknown'

// Chrome has used several names for this permission, and newer versions keep the agent's
// address (127.0.0.1, "loopback") separate from other local devices. Every name the browser
// knows is checked: allowing "Local network" alone does not cover the agent if loopback is
// still blocked or not yet asked.
const NAMES = ['loopback-network', 'local-network-access', 'local-network']

/** Combined permission state, plus every PermissionStatus to watch for changes (when supported). */
export async function queryNetworkPermission(): Promise<{ state: NetworkPermission; status: PermissionStatus | null; statuses: PermissionStatus[] }> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) return { state: 'unknown', status: null, statuses: [] }
  const statuses: PermissionStatus[] = []
  for (const name of NAMES) {
    try {
      statuses.push(await navigator.permissions.query({ name } as unknown as PermissionDescriptor))
    } catch {
      /* this browser does not know this name */
    }
  }
  const states = statuses.map((status) => status.state as NetworkPermission)
  const state: NetworkPermission = !states.length ? 'unknown' : states.includes('denied') ? 'denied' : states.includes('prompt') ? 'prompt' : 'granted'
  return { state, status: statuses[0] ?? null, statuses }
}

// While the browser's Allow / Block prompt may be open, the request waits for the answer;
// a short timeout would abort it before staff click Allow.
async function waitMs(normal: number) {
  return (await queryNetworkPermission()).state === 'granted' ? normal : 120000
}

/**
 * Whether anything answers on the agent's port. A no-cors request needs no pairing, so it
 * succeeds when the agent runs and the browser allows access, even if this website is not
 * paired (a CORS refusal looks like a network failure to fetch()).
 */
export async function agentReachable(): Promise<boolean> {
  try {
    await fetch(BASE + '/health', { mode: 'no-cors', credentials: 'omit', signal: AbortSignal.timeout(3000) })
    return true
  } catch {
    return false
  }
}

export const BLOCKED_STEPS =
  'This browser is blocking the print agent for this website. Click the icon left of the address (ⓘ or padlock) → Site settings → set Local network access (and, if listed, Apps on device / Loopback network) to Allow, then reload the page.'

export const notPairedMessage = (origin = typeof location === 'undefined' ? 'this website' : location.origin) =>
  `The print agent is running, but this website (${origin}) is not paired with it. Open the print agent installer on this PC and pair ${origin}, then click Connect / refresh.`

/** unreachableMessage, after checking whether the agent answers at all. */
export async function diagnoseUnreachable(state: NetworkPermission): Promise<string> {
  if (state !== 'denied' && await agentReachable()) return notPairedMessage()
  return unreachableMessage(state)
}

/** What to tell staff when the agent could not be reached, given the permission state. */
export function unreachableMessage(state: NetworkPermission): string {
  if (state === 'denied') return BLOCKED_STEPS
  if (state === 'prompt') {
    return 'Your browser needs permission to reach the print agent on this PC. Click Connect / refresh and choose "Allow" when the browser asks about devices on your local network.'
  }
  return 'Cannot reach the print agent on this PC. Make sure it is installed and running (open the Windows installer from the Printers page), then click Connect / refresh.'
}
