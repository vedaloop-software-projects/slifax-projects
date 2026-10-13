import assert from 'node:assert/strict'
import { test } from 'node:test'
import { programmingErrorForLog, redactForLog, responseErrorMessage } from '../logger.ts'

test('structured logging redacts credentials and bounds nested input', () => {
  assert.deepEqual(redactForLog({ mobile: '9876543210', password: 'secret', nested: { otp: 123456, token: 'jwt' } }), {
    mobile: '9876543210', password: '[redacted]', nested: { otp: '[redacted]', token: '[redacted]' },
  })
  assert.equal((redactForLog('x'.repeat(600)) as string).length, 511)
  assert.deepEqual(redactForLog(new Error('mysql://user:password@host/database')), { name: 'Error', message: 'Request processing failed' })
})

test('structured logging records safe API and programming error details', () => {
  assert.equal(responseErrorMessage({ errors: 'Invalid product search.' }), 'Invalid product search.')
  assert.equal(responseErrorMessage({ data: [] }), undefined)
  assert.deepEqual(programmingErrorForLog(new TypeError("Cannot read properties of undefined (reading 'productId')")), {
    errorType: 'TypeError', errorMessage: "Cannot read properties of undefined (reading 'productId')",
  })
  assert.deepEqual(programmingErrorForLog(new Error('mysql://user:password@host/database')), { errorType: 'Error' })
})
