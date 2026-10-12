import { Router, type RequestHandler, type Response } from 'express'
import multer from 'multer'
import { authenticate, type AuthenticatedLocals } from '../../middlewares/auth/authenticate.ts'
import { normalizeLegacyInput } from '../../middlewares/http/legacy-input.ts'
import { ApiError, type AuthService } from '../auth/service.ts'
import type { AccountService } from './service.ts'

type AsyncHandler = (request: Parameters<RequestHandler>[0], response: Parameters<RequestHandler>[1]) => Promise<void>
function handle(action: AsyncHandler): RequestHandler {
  return (request, response, next) => { void action(request, response).catch(next) }
}
const jsonOnly: RequestHandler = (request, response, next) => {
  if (!request.is('application/json')) {
    response.status(400).json({ errors: 'Content-Type must be application/json.' })
    return
  }
  next()
}

export function createAccountRouter(auth: AuthService, service: AccountService) {
  const router = Router()
  const protectedRoute = authenticate(auth)
  const upload = multer({
    storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 1 },
    fileFilter: (_request, file, callback) => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
        callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname))
        return
      }
      callback(null, true)
    },
  })
  router.post('/getAuditReports', protectedRoute, jsonOnly, handle(async (request, response) => {
    const data = await service.audits((response.locals as AuthenticatedLocals).account, request.body)
    response.json({ success: true, message: 'Audit reports fetched successfully.', data })
  }))
  router.post('/updateBillFormat', protectedRoute, jsonOnly, handle(async (request, response) => {
    await service.updateBillFormat((response.locals as AuthenticatedLocals).account, request.body)
    response.json({ success: true, message: 'Bill format updated successfully.', data: null })
  }))
  router.get('/getBillFormatId', protectedRoute, handle(async (_request, response) => {
    const data = await service.billFormat((response.locals as AuthenticatedLocals).account)
    response.json({ success: true, message: 'Bill format fetched successfully.', data })
  }))
  router.post('/updateProfile', protectedRoute, upload.single('logo'), handle(async (request, response) => {
    let data: unknown
    try { data = normalizeLegacyInput(JSON.parse(request.body.data)) } catch { throw new ApiError(400, 'Invalid data format.') }
    const file = request.file ? { buffer: request.file.buffer, mimeType: request.file.mimetype } : undefined
    await service.updateProfile((response.locals as AuthenticatedLocals).account, data, file)
    response.json({ success: true, message: 'Profile updated successfully.', data: null })
  }))
  router.use((error: unknown, _request: unknown, response: Response, next: (error: unknown) => void) => {
    if (error instanceof ApiError) {
      response.status(error.status).json({ errors: error.message })
      return
    }
    if (error instanceof multer.MulterError) {
      response.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 422).json({ errors: error.code === 'LIMIT_FILE_SIZE' ? 'Logo must not exceed 2 MB.' : 'Invalid profile upload.' })
      return
    }
    next(error)
  })
  return router
}
