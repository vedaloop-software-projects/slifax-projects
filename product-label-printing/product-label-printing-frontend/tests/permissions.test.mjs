import { test } from 'node:test'
import assert from 'node:assert/strict'
import { can, homePath, normalizeRole } from '../src/lib/permissions.ts'

test('regular users can only print', () => {
  assert.equal(can('USER', 'print'), true)
  for (const p of ['products.view', 'templates.manage', 'printers.manage', 'analytics.basic', 'audit.view', 'settings.manage', 'clients.manage']) {
    assert.equal(can('USER', p), false, p)
  }
})

test('admins design templates and see analytics, but cannot create products or users', () => {
  for (const p of ['print', 'templates.manage', 'printers.manage', 'analytics.full', 'audit.view']) {
    assert.equal(can('ADMIN', p), true, p)
  }
  for (const p of ['products.manage', 'users.manage', 'settings.manage', 'batches.manage', 'clients.manage']) {
    assert.equal(can('ADMIN', p), false, p)
  }
})

test('legacy super-admin sessions use the barcode admin workspace', () => {
  assert.equal(can('SUPER_ADMIN', 'clients.manage'), false)
  assert.equal(can('SUPER_ADMIN', 'print'), true)
  assert.equal(can('SUPER_ADMIN', 'templates.manage'), true)
})

test('old stored roles map onto the three new ones', () => {
  assert.equal(normalizeRole('OWNER'), 'ADMIN')
  assert.equal(normalizeRole('Admin'), 'ADMIN')
  assert.equal(normalizeRole('STAFF'), 'USER')
  assert.equal(normalizeRole('VIEWER'), 'USER')
  assert.equal(normalizeRole('Cashier'), 'USER')
  assert.equal(normalizeRole('Store Manager'), 'ADMIN')
  assert.equal(normalizeRole('Billing Staff'), 'USER')
  assert.equal(normalizeRole('Administrative assistant'), 'USER')
  assert.equal(normalizeRole('super admin'), 'SUPER_ADMIN')
  assert.equal(normalizeRole(undefined), 'USER')
})

test('the barcode app sends every signed-in role to its workspace', () => {
  assert.equal(homePath('SUPER_ADMIN'), '/dashboard')
  assert.equal(homePath('ADMIN'), '/dashboard')
  assert.equal(homePath('USER'), '/dashboard')
})
