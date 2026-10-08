import assert from 'node:assert/strict'
import { test } from 'node:test'
import { redactForLog } from '../logger.ts'

test('structured logging redacts credentials and bounds nested input', () => {
  assert.deepEqual(redactForLog({ mobile: '9876543210', password: 'secret', nested: { otp: 123456, token: 'jwt' } }), {
    mobile: '9876543210', password: '[redacted]', nested: { otp: '[redacted]', token: '[redacted]' },
  })
  assert.equal((redactForLog('x'.repeat(600)) as string).length, 511)
  assert.deepEqual(redactForLog(new Error('mysql://user:password@host/database')), { name: 'Error', message: 'Request processing failed' })
})
