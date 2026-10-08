import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { routeNames } from '../router.ts'

test('super-admin resource screens target every registered Node resource workflow', async () => {
  const source = await readFile(new URL('../../../../zenx-pos-superadmin/src/model.ts', import.meta.url), 'utf8')
  const definitions = [...source.matchAll(/list: '([^']+)', create: '([^']+)', edit: '([^']+)', update: '([^']+)', remove: '([^']+)'/g)]
  const frontend = definitions.flatMap((match) => [match[2]!, match[1]!, match[3]!, match[4]!, match[5]!]).sort()
  const backend = Object.values(routeNames).flatMap(({ create, list, edit, update, remove }) => [create, list, edit, update, remove]).sort()

  assert.deepEqual(frontend, backend)
  assert.equal(definitions.length, 8)
})
