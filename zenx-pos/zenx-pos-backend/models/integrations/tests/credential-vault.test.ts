import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import test from 'node:test'
import { CredentialVault } from '../credential-vault.ts'

test('encrypts tenant credentials and binds them to tenant and provider', () => {
  const vault = new CredentialVault(randomBytes(32).toString('base64'))
  const clear = { clientId: 'tenant-client', clientSecret: 'top-secret' }
  const encrypted = vault.encrypt(clear, 8n, 'pinelabs')
  assert.equal(encrypted.includes('top-secret'), false)
  assert.deepEqual(vault.decrypt(encrypted, 8n, 'pinelabs'), clear)
  assert.throws(() => vault.decrypt(encrypted, 9n, 'pinelabs'))
  assert.throws(() => vault.decrypt(encrypted, 8n, 'phonepe'))
})

test('rejects invalid master key lengths', () => {
  assert.throws(() => new CredentialVault(Buffer.from('too-short').toString('base64')), /32-byte key/)
})
