import express, { type Router } from 'express'
import { resolve } from 'node:path'
import type { ServerResponse } from 'node:http'
import { errorHandler, notFound, requestId } from '../../middlewares/http/errors.ts'
import { classifyDatabaseFailure } from '../../models/database/errors.ts'
import { requestLogger } from '../../models/system/logger.ts'
import { legacyInput } from '../../middlewares/http/legacy-input.ts'

export function createApp(database?: { check(): Promise<void> }, apiRouters?: Router | Router[], publicDirectory?: string, webRouters?: Router | Router[]) {
  const app = express()
  app.disable('x-powered-by')
  app.set('json replacer', (_key: string, value: unknown) => typeof value === 'bigint' ? value.toString() : value)
  app.use(requestId)
  app.use(requestLogger)
  app.use(express.json({ limit: '1mb' }))
  app.use(legacyInput)
  const staticHeaders = (response: ServerResponse, path: string) => {
    response.setHeader('X-Content-Type-Options', 'nosniff')
    if (path.includes('bill_formats')) { response.setHeader('Content-Disposition', 'attachment'); response.setHeader('Content-Security-Policy', 'sandbox') }
  }
  if (publicDirectory) app.use('/uploads', express.static(resolve(publicDirectory, 'uploads'), { dotfiles: 'deny', index: false, maxAge: '1h', setHeaders: staticHeaders }))

  // Liveness remains independent of database availability.
  app.get(['/up', '/api/health'], (_request, response) => {
    response.json({ success: true, message: 'ZenxPOS API is running.', data: { status: 'ok' } })
  })

  app.get('/api/ready', async (_request, response) => {
    if (!database) {
      response.status(503).json({ errors: 'Database is not configured.' })
      return
    }
    try {
      await database.check()
      response.json({ success: true, message: 'Database is ready.', data: { status: 'ok' } })
    } catch (error) {
      response.status(503).json({ errors: classifyDatabaseFailure(error)?.message ?? 'Database is unavailable.' })
    }
  })

  for (const router of apiRouters ? (Array.isArray(apiRouters) ? apiRouters : [apiRouters]) : []) app.use('/api', router)
  for (const router of webRouters ? (Array.isArray(webRouters) ? webRouters : [webRouters]) : []) app.use(router)
  if (publicDirectory) app.use(express.static(publicDirectory, { dotfiles: 'deny', index: 'index.html', maxAge: '1h', redirect: false, setHeaders: staticHeaders }))

  app.use(notFound)
  app.use(errorHandler)
  return app
}
