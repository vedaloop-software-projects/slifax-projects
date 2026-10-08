import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const project = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const assets = ['404.html', '502.html', 'css/style.css', 'csv/sample_product.csv', 'favicon.ico', 'images/active.svg', 'images/client.svg', 'images/expired.svg', 'images/login.png', 'images/logo_dark.png', 'images/logo_light.png', 'robots.txt']

test('migrated public assets remain byte-for-byte equal to the legacy source', async () => {
  for (const asset of assets) {
    const [legacy, migrated] = await Promise.all([
      readFile(resolve(project, '../dev/public', asset)),
      readFile(resolve(project, 'zenx-pos-backend/public', asset)),
    ])
    assert.deepEqual(migrated, legacy, asset)
  }
})

test('PHP entry points and Apache rewrite files are retired from the Node public root', async () => {
  for (const asset of ['.htaccess', 'index.php', 'info.php']) {
    await assert.rejects(access(resolve(project, 'zenx-pos-backend/public', asset)))
  }
  const replacement = await readFile(resolve(project, 'zenx-pos-backend/public/index.html'), 'utf8')
  assert.match(replacement, /ZenxPOS/i)
})
