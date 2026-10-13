import pino from 'pino'
import type { RequestHandler, Response } from 'express'

const sensitive = /pass(word)?|token|secret|authorization|cookie|otp|database.?url/i

function clean(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[truncated]'
  if (value instanceof Error) return { name: value.name, message: 'Request processing failed' }
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => clean(item, depth + 1))
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).slice(0, 50).map(([key, item]) => [key, sensitive.test(key) ? '[redacted]' : clean(item, depth + 1)]))
  if (typeof value === 'string' && value.length > 500) return value.slice(0, 500) + '[truncated]'
  return value
}

const options = {
  level: process.env.LOG_LEVEL?.trim() || 'info',
  base: { service: 'zenx-pos-backend', environment: process.env.NODE_ENV || 'development' },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: ['password', 'token', 'secret', 'authorization', 'cookie', '*.password', '*.token', '*.secret', '*.authorization', '*.cookie'],
    censor: '[redacted]',
  },
}
const logFile = process.env.LOG_FILE_PATH?.trim()
const output = logFile ? pino.multistream([
  { stream: process.stdout },
  { stream: pino.destination({ dest: logFile, mkdir: true, sync: false }) },
]) : undefined

export const logger = output ? pino(options, output) : pino(options)

export function responseErrorMessage(body: unknown): string | undefined {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return undefined
  const value = (body as Record<string, unknown>).errors ?? (body as Record<string, unknown>).message
  if (typeof value !== 'string' || !value.trim()) return undefined
  return value.slice(0, 500)
}

export function programmingErrorForLog(error: unknown): { errorType: string; errorMessage?: string } {
  if (!(error instanceof Error)) return { errorType: typeof error }
  const result: { errorType: string; errorMessage?: string } = { errorType: error.name }
  // Runtime programming errors are safe and actionable. Other exception messages can
  // contain SQL values, URLs or third-party secrets, so they remain redacted.
  if (error instanceof TypeError || error instanceof ReferenceError || error instanceof RangeError) {
    result.errorMessage = error.message.slice(0, 500)
  }
  return result
}

export const requestLogger: RequestHandler = (request, response, next) => {
  const started = process.hrtime.bigint()
  let completed = false
  const json = response.json.bind(response)
  response.json = ((body: unknown) => {
    const message = responseErrorMessage(body)
    if (message) response.locals.errorMessage = message
    return json(body)
  }) as Response['json']
  const write = (aborted: boolean) => {
    if (completed) return
    completed = true
    const durationMs = Number(process.hrtime.bigint() - started) / 1_000_000
    const context = { event: 'http_request', requestId: response.locals.requestId, method: request.method, path: request.path, statusCode: response.statusCode, durationMs: Math.round(durationMs * 100) / 100, aborted, remoteAddress: request.ip, ...(response.statusCode >= 400 && response.locals.errorMessage ? { errorMessage: response.locals.errorMessage } : {}) }
    if (response.statusCode >= 500) logger.error(context, 'request completed')
    else if (response.statusCode >= 400) logger.warn(context, 'request completed')
    else logger.info(context, 'request completed')
  }
  response.once('finish', () => write(false))
  response.once('close', () => { if (!response.writableEnded) write(true) })
  next()
}

export function logError(event: string, context: Record<string, unknown> = {}) {
  logger.error({ event, ...clean(context) as Record<string, unknown> }, event)
}

export const redactForLog = clean
