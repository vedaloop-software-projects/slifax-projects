import { randomUUID } from 'node:crypto'
import type { ErrorRequestHandler, RequestHandler } from 'express'

export const requestId: RequestHandler = (_request, response, next) => {
  response.setHeader('X-Request-Id', randomUUID())
  next()
}

// Match the legacy failure envelope; domain-specific messages are migrated per route.
export const notFound: RequestHandler = (_request, response) => {
  response.status(404).json({ errors: 'Route not found.' })
}

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, next) => {
  if (response.headersSent) {
    next(error)
    return
  }
  const type = error && typeof error === 'object' && 'type' in error ? error.type : undefined
  if (type === 'entity.parse.failed') {
    response.status(400).json({ errors: 'Invalid JSON body.' })
    return
  }
  if (type === 'entity.too.large') {
    response.status(413).json({ errors: 'Request body is too large.' })
    return
  }
  console.error('Unhandled request error', { requestId: response.getHeader('X-Request-Id') })
  response.status(500).json({ errors: 'Internal Server Error.' })
}
