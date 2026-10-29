import type { NextFunction, RequestHandler, Response } from 'express'
import type { Account } from '../../models/auth/contracts.ts'
import { ApiError, AuthService } from '../../routes/auth/service.ts'
import { withBusinessZone } from '../../models/system/business-time.ts'

export type AuthenticatedLocals = { account: Account }

// The rest of the request runs in the store's timezone. The headers let the app keep
// its clock on server time instead of the device clock.
function inBusinessZone(service: AuthService, response: Response<unknown, AuthenticatedLocals>, next: NextFunction) {
  const clock = service.clock(response.locals.account)
  response.setHeader('X-Server-Time', clock.serverTime)
  response.setHeader('X-Time-Zone', clock.timeZone)
  withBusinessZone(clock.timeZone, next)
}

export function authenticate(service: AuthService): RequestHandler<unknown, unknown, unknown, unknown, AuthenticatedLocals> {
  return async (request, response, next) => {
    try {
      response.locals.account = await service.authenticate(request.header('authorization'))
      inBusinessZone(service, response, next)
    } catch (error) {
      if (error instanceof ApiError) {
        response.status(error.status).json({ errors: error.message, ...(error.details === undefined ? {} : { data: error.details }) })
        return
      }
      next(error)
    }
  }
}

export function authenticateForRenewal(service: AuthService): RequestHandler<unknown, unknown, unknown, unknown, AuthenticatedLocals> {
  return async (request, response, next) => {
    try {
      response.locals.account = await service.authenticateForRenewal(request.header('authorization'))
      inBusinessZone(service, response, next)
    } catch (error) {
      if (error instanceof ApiError) {
        response.status(error.status).json({ errors: error.message, ...(error.details === undefined ? {} : { data: error.details }) })
        return
      }
      next(error)
    }
  }
}
