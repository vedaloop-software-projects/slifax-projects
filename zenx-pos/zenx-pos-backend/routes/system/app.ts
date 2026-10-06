import express, { type Router } from 'express'
import { resolve } from 'node:path'
import { errorHandler, notFound, requestId } from '../../middlewares/http/errors.ts'

export function createApp(database?: { check(): Promise<void> }, apiRouters?: Router | Router[], publicDirectory?: string) {
  const app = express()
  app.disable('x-powered-by')
  app.set('json replacer', (_key: string, value: unknown) => typeof value === 'bigint' ? value.toString() : value)
  app.use(requestId)
  app.use(express.json({ limit: '1mb' }))
  if (publicDirectory) app.use('/uploads', express.static(resolve(publicDirectory, 'uploads'), { dotfiles: 'deny', index: false, maxAge: '1h' }))

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
    } catch {
      response.status(503).json({ errors: 'Database is unavailable.' })
    }
  })

  for (const router of apiRouters ? (Array.isArray(apiRouters) ? apiRouters : [apiRouters]) : []) app.use('/api', router)

  app.use(notFound)
  app.use(errorHandler)
  return app
}
