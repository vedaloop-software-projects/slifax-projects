import type { RequestHandler } from 'express'

function parseOrigins(value: string | undefined) {
  return new Set((value ?? '').split(',').map((origin) => origin.trim()).filter(Boolean).map((origin) => {
    const url = new URL(origin)
    if (url.origin !== origin || (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1')) {
      throw new Error('CORS_ALLOWED_ORIGINS must contain comma-separated HTTPS origins without paths.')
    }
    return origin
  }))
}

export function cors(value = process.env.CORS_ALLOWED_ORIGINS ?? 'https://barcode.zenxpos.com'): RequestHandler {
  const allowed = parseOrigins(value)
  return (request, response, next) => {
    const origin = request.get('Origin')
    if (!origin) { next(); return }
    if (!allowed.has(origin)) {
      if (request.method === 'OPTIONS') response.status(403).json({ errors: 'Origin is not allowed.' })
      else next()
      return
    }
    response.setHeader('Access-Control-Allow-Origin', origin)
    response.setHeader('Vary', 'Origin')
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
    response.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type,X-Request-ID')
    response.setHeader('Access-Control-Max-Age', '600')
    if (request.method === 'OPTIONS') { response.status(204).end(); return }
    next()
  }
}
