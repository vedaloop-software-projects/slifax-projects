import assert from 'node:assert/strict'
import { test } from 'node:test'
import { clientNativeError, clientPasswordHelp, mapClientFieldErrors, validateClientForm } from '../src/client-form-validation.ts'

test('password, duplicate mobile and browser errors are displayed together without password values', () => {
  const values = { password: '11111111', mobile: '9123456789', alternate_mobile: '9123456789' }
  const errors = validateClientForm(values, true, { email: 'Enter a valid email address.' })
  assert.deepEqual(Object.keys(errors).sort(), ['alternate_mobile', 'email', 'password'])
  assert.equal(errors.password, clientPasswordHelp)
  assert.match(errors.alternate_mobile!, /leave Alternate mobile blank/)
  assert.equal(JSON.stringify(errors).includes(values.password), false)
})

test('optional fields and an unchanged edit password do not prevent saving', () => {
  assert.deepEqual(validateClientForm({ password: '', alternate_mobile: '', pincode: '' }, false), {})
  assert.match(validateClientForm({ password: '' }, true).password!, /Enter an admin password/)
  assert.deepEqual(validateClientForm({ password: 'StrongTest1!', alternate_mobile: '' }, true), {})
})

test('an invalid date interval identifies the end-date input', () => {
  assert.deepEqual(validateClientForm({ start_date: '2026-10-26', end_date: '2026-10-25' }, false), { end_date: 'End date must be after Start date.' })
})

test('browser constraints use readable field messages', () => {
  const invalid = { valueMissing: false, patternMismatch: false, typeMismatch: true }
  assert.match(clientNativeError('email', invalid, 'Invalid value'), /valid email/)
  assert.match(clientNativeError('pincode', invalid, 'Invalid value'), /six-digit/)
  assert.match(clientNativeError('state_id', { ...invalid, valueMissing: true }, ''), /select state/)
})

test('server payment-row errors target the correct visible payment inputs', () => {
  assert.deepEqual(mapClientFieldErrors({ 'initial_payments.0.payment_date': 'Choose a date.', password: clientPasswordHelp }, ['subscription']), {
    subscription_payment_date: 'Choose a date.', password: clientPasswordHelp,
  })
  assert.deepEqual(mapClientFieldErrors({ 'initial_payments.1.reference_number': 'Reference required.' }, ['installation', 'subscription']), {
    subscription_reference_number: 'Reference required.',
  })
})
