import { Router, type RequestHandler } from 'express'
import { z } from 'zod'
import type { RegistrationStore } from '../../models/platform/contracts.ts'

const optional = (limit: number) => z.preprocess(value => typeof value === 'string' && value.trim() ? value.trim() : null, z.string().max(limit).nullable())
const registrationSchema = z.object({
  businessName: z.string().trim().min(2, 'Business name is required.').max(255),
  contactPersonName: z.string().trim().min(2, 'Contact person is required.').max(255),
  mobile: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number.'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(255),
  businessTypeId: z.preprocess(value => value === '' || value === undefined ? null : value, z.coerce.number().int().positive().nullable()),
  city: optional(100), address: optional(1000), notes: optional(1000),
})

// Public, unauthenticated: a small per-IP window keeps the form from being flooded.
export function createRegistrationRouter(store: RegistrationStore, limit = 5, windowMs = 60 * 60_000) {
  const router = Router(), hits = new Map<string, number[]>()
  const throttle: RequestHandler = (request, response, next) => {
    const key = request.ip ?? 'unknown', now = Date.now(), recent = (hits.get(key) ?? []).filter(at => now - at < windowMs)
    if (recent.length >= limit) { response.status(429).json({ errors: 'Too many registration attempts. Please try again later.' }); return }
    recent.push(now); hits.set(key, recent)
    if (hits.size > 10_000) hits.clear()
    next()
  }
  router.get('/registrationBusinessTypes', (_request, response, next) => {
    void store.businessTypes().then(rows => response.json({ success: true, message: 'Business types fetched successfully.', data: rows.map(row => ({ id: Number(row.id), name: row.name })) })).catch(next)
  })
  router.post('/registerBusiness', throttle, (request, response, next) => {
    const parsed = registrationSchema.safeParse(request.body)
    if (!parsed.success) { response.status(422).json({ errors: parsed.error.issues[0]?.message ?? 'Invalid registration details.' }); return }
    const input = parsed.data
    void store.create({ ...input, businessTypeId: input.businessTypeId ? BigInt(input.businessTypeId) : null, requesterIp: request.ip ?? null })
      .then(result => {
        if (result === 'duplicate') { response.status(409).json({ errors: 'A registration or account already exists for this mobile number or email.' }); return }
        response.status(201).json({ success: true, message: 'Thank you! Our team will review your registration and contact you shortly.', data: null })
      }).catch(next)
  })
  return router
}
