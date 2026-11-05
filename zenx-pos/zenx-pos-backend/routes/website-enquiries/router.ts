import { Router, type RequestHandler, type Response } from 'express'
import { ApiError } from '../auth/service.ts'
import type { WebsiteEnquiryService } from './service.ts'

export function createWebsiteEnquiryRouter(service: WebsiteEnquiryService, limit = 5, windowMs = 60 * 60_000, now = Date.now) {
  const router = Router()
  const attempts = new Map<string, number[]>()
  const throttle: RequestHandler = (request, response, next) => {
    const time = now(), ip = request.ip ?? 'unknown'
    if (attempts.size >= 10_000) for (const [key, values] of attempts) if (!values.some(value => value > time - windowMs)) attempts.delete(key)
    const recent = (attempts.get(ip) ?? []).filter(value => value > time - windowMs)
    if (recent.length >= limit || (!attempts.has(ip) && attempts.size >= 10_000)) {
      response.set('Retry-After', String(Math.max(1, Math.ceil(((recent[0] ?? time) + windowMs - time) / 1000))))
      response.status(429).json({ errors: 'Too many enquiries. Please try again later.' })
      return
    }
    attempts.set(ip, [...recent, time]); next()
  }
  router.post('/website-enquiries', throttle, (request, response, next) => {
    void service.submit(request.body, request.ip ?? null).then(result => {
      response.status(result.created ? 201 : 200).set('Cache-Control', 'no-store').json({ success: true, message: 'Your enquiry has been received. Our team will contact you using the details provided.', data: null })
    }).catch(next)
  })
  router.use((error: unknown, _request: unknown, response: Response, next: (error: unknown) => void) => { if (error instanceof ApiError) { response.status(error.status).json({ errors: error.message }); return } next(error) })
  return router
}
