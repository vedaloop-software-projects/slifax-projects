import type { RequestHandler } from 'express'
import type { Account } from '../../models/auth/contracts.ts'
import { ApiError, AuthService } from '../../routes/auth/service.ts'

export type AuthenticatedLocals = { account: Account }

export function authenticate(service: AuthService): RequestHandler<unknown, unknown, unknown, unknown, AuthenticatedLocals> {
  return async (request, response, next) => {
    try {
      response.locals.account = await service.authenticate(request.header('authorization'))
      next()
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
      next()
    } catch (error) {
      if (error instanceof ApiError) {
        response.status(error.status).json({ errors: error.message, ...(error.details === undefined ? {} : { data: error.details }) })
        return
      }
      next(error)
    }
  }
}
