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

async function request<T>(path: string, body?: unknown, token = agentSettings().token): Promise<T> {
  if (!token) throw new Error('Open Printers and pair the Local Print Agent first.')
  let response: Response
  try {
    response = await fetch(BASE + path, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(body ? 60000 : 10000),
      credentials: 'omit',
    })
  } catch {
    throw new Error(body
      ? 'No reply from the print agent. The job may already be queued in Windows. Check the Windows queue before reprinting; no automatic retry was made.'
      : 'Cannot reach the print agent. Open the Windows print agent installer on this PC, pair this website URL, and allow local network access in your browser.')
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
