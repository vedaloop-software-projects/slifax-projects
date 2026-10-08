import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { test } from 'node:test'
import { hash } from 'bcryptjs'
import type { AdminIdentity, AdminResource, AdminRow, AdminStore } from '../../../models/admin/contracts.ts'
import { createApp } from '../../system/app.ts'
import { createAdminRouter } from '../router.ts'
import { AdminService } from '../service.ts'
import type { BillFormatStorage } from '../../../models/admin/bill-format-storage.ts'

class MemoryAdminStore implements AdminStore {
  passwordHash = ''
  next = 10n
  rows = new Map<AdminResource, AdminRow[]>()
  deleted: string[] = []
  private admin(): AdminIdentity { return { id: 1n, name: 'Root', mobile: '9876543210', passwordHash: this.passwordHash, status: 1 } }
  async findAdminByMobile(mobile: string) { return mobile === '9876543210' ? this.admin() : null }
  async findAdminById(id: bigint) { return id === 1n ? this.admin() : null }
  async updatePassword(id: bigint, expected: string, password: string) { if (id !== 1n || expected !== this.passwordHash) return false; this.passwordHash = password; return true }
  async list(resource: AdminResource, _fields: string[], _search: string, _status: number | undefined, _filters: Record<string, bigint>, page: number, take: number) { const all = this.rows.get(resource) ?? []; return { items: all.slice((page - 1) * take, page * take), total: all.length } }
  async find(resource: AdminResource, id: bigint) { return (this.rows.get(resource) ?? []).find((row) => row.id === id) ?? null }
  async findDuplicate(resource: AdminResource, values: Record<string, unknown>, exclude?: bigint) { return (this.rows.get(resource) ?? []).some((row) => row.id !== exclude && Object.entries(values).every(([field, value]) => row[field] === value)) }
  async create(resource: AdminResource, data: Record<string, unknown>) { const row = { id: this.next++, ...data }; this.rows.set(resource, [...this.rows.get(resource) ?? [], row]); return row }
  async update(resource: AdminResource, id: bigint, data: Record<string, unknown>) { const row = await this.find(resource, id); if (!row) return null; Object.assign(row, data); return row }
  async softDelete(resource: AdminResource, id: bigint) { const rows = this.rows.get(resource) ?? [], index = rows.findIndex((row) => row.id === id); if (index < 0) return false; rows.splice(index, 1); this.deleted.push(`${resource}:${id}`); return true }
  async activeParent(_resource: 'features' | 'businessTypes', id: bigint) { return id === 1n || id === 2n }
}
class MemoryBillFiles implements BillFormatStorage { removed:string[]=[];async save(file:{buffer:Buffer;mimeType:string}){assert.equal(file.buffer.subarray(0,5).toString(),'%PDF-');assert.equal(file.mimeType,'application/pdf');return{path:'uploads/bill_formats/test.pdf',type:'pdf'}}async remove(path:string){this.removed.push(path)} }

const cases: Array<{ resource: AdminResource; add: string; create: string; list: string; edit: string; update: string; remove: string; body: Record<string, unknown> }> = [
  { resource: 'admins', add: 'add_admin', create: 'add/admin', list: 'admins', edit: 'edit/admin', update: 'update/admin', remove: 'delete/admin', body: { name: 'Second', mobile: '9123456789', password:'StrongAdmin1!', status: 1 } },
  { resource: 'businessTypes', add: 'add_business_type', create: 'add/business_type', list: 'business_types', edit: 'edit/business_type', update: 'update/business_type', remove: 'delete/business_type', body: { business_type: 'Retail', display_name: 'Retail', status: 1 } },
  { resource: 'features', add: 'add_feature', create: 'add/feature', list: 'features', edit: 'edit/feature', update: 'update/feature', remove: 'delete/feature', body: { feature: 'Billing', priority: 1, status: 1 } },
  { resource: 'subFeatures', add: 'add_sub_feature', create: 'add/sub_feature', list: 'sub_features', edit: 'edit/sub_feature', update: 'update/sub_feature', remove: 'delete/sub_feature', body: { feature_id: 1, sub_feature: 'Sales', priority: 1, status: 1 } },
  { resource: 'keyMappings', add: 'add_key_map', create: 'add/key_map', list: 'key_maps', edit: 'edit/key_map', update: 'update/key_map', remove: 'delete/key_map', body: { key_name: 'Save', short_key: 'F2', status: 1 } },
  { resource: 'billColumns', add: 'add_bill_column', create: 'add/bill_column', list: 'bill_columns', edit: 'edit/bill_column', update: 'update/bill_column', remove: 'delete/bill_column', body: { col_name: 'MRP', app_status: 1, status: 1 } },
  { resource: 'couponUsageTypes', add: 'add_coupon_usage_type', create: 'add/coupon_usage_type', list: 'coupon_usage_types', edit: 'edit/coupon_usage_type', update: 'update/coupon_usage_type', remove: 'delete/coupon_usage_type', body: { title: 'Once', status: 1 } },
  { resource: 'billFormats', add: 'add_bill_format', create: 'add/bill_format', list: 'bill_formats', edit: 'edit/bill_format', update: 'update/bill_format', remove: 'delete/bill_format', body: { business_type_id: 1, title: 'A4', size: 'A4', file: 'uploads/bill_formats/a4.pdf', file_type: 'pdf', status: 1 } },
]

async function fixture(action: (base: string, cookie: string, store: MemoryAdminStore) => Promise<void>) {
  const store = new MemoryAdminStore()
  store.passwordHash = await hash('Admin1!x', 4)
  const router = createAdminRouter(new AdminService(store, 10), 'admin-test-secret-that-is-longer-than-thirty-two-bytes', '/admin',new MemoryBillFiles())
  const server = createServer(createApp(undefined, undefined, undefined, router))
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  const address = server.address(); assert.ok(address && typeof address !== 'string')
  const base = `http://127.0.0.1:${address.port}`
  try {
    const login = await fetch(base + '/admin/login', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Forwarded-Proto': 'https' }, body: JSON.stringify({ mobile: '9876543210', password: 'Admin1!x' }) })
    assert.equal(login.status, 200)
    assert.deepEqual((await login.json() as any).data, { id: '1', name: 'Root', mobile: '9876543210' })
    assert.match(login.headers.get('set-cookie') ?? '', /HttpOnly; SameSite=Strict; Max-Age=28800; Secure/)
    const cookie = login.headers.get('set-cookie')?.split(';')[0] ?? ''
    assert.match(cookie, /^zenx_admin=/)
    await action(base, cookie, store)
  } finally {
    server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
}

test('admin login page is branded, sessions are required, and passwords change securely', async () => {
  await fixture(async (base, cookie, store) => {
    const page = await fetch(base + '/admin'); assert.equal(page.status, 200); assert.match(await page.text(), /Zenx<b>POS/)
    const denied = await fetch(base + '/admin/admins', { headers: { Accept: 'application/json' } }); assert.equal(denied.status, 401)
    const session = await fetch(base + '/admin/session', { headers: { Accept: 'application/json', Cookie: cookie } }); assert.equal(session.status, 200); assert.deepEqual((await session.json() as any).data, { id: '1', name: 'Root', mobile: '9876543210' })
    const changed = await fetch(base + '/admin/update_password', { method: 'POST', headers: { Accept: 'application/json', Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ current_password: 'Admin1!x', password: 'Changed2!', password_confirmation: 'Changed2!' }) })
    assert.equal(changed.status, 200); assert.match(store.passwordHash, /^\$2/)
    const logout = await fetch(base + '/admin/logout', { redirect: 'manual' }); assert.equal(logout.status, 303); assert.match(logout.headers.get('set-cookie') ?? '', /Max-Age=0/)
    const apiLogout = await fetch(base + '/admin/logout', { method: 'POST', headers: { Accept: 'application/json', Cookie: cookie } }); assert.equal(apiLogout.status, 200); assert.match(apiLogout.headers.get('set-cookie') ?? '', /Max-Age=0/)
  })
})

test('all 64 resource routes create, list, edit, update, refresh, and soft-delete', async () => {
  await fixture(async (base, cookie, store) => {
    const headers = { Accept: 'application/json', Cookie: cookie, 'Content-Type': 'application/json' }
    for (const scenario of cases) {
      assert.equal((await fetch(`${base}/admin/${scenario.add}`, { headers: { Cookie: cookie } })).status, 200)
      let created:Response
      if(scenario.resource==='billFormats'){const form=new FormData();for(const[key,value]of Object.entries(scenario.body))form.set(key,String(value));form.set('file',new Blob(['%PDF-1.7 test'],{type:'application/pdf'}),'bill.pdf');created=await fetch(`${base}/admin/${scenario.create}`,{method:'POST',headers:{Accept:'application/json',Cookie:cookie},body:form})}
      else created=await fetch(`${base}/admin/${scenario.create}`, { method: 'POST', headers, body: JSON.stringify(scenario.body) })
      assert.equal(created.status, 201, scenario.resource)
      const createdBody = await created.json() as { data: { id: string } }
      const recordId = createdBody.data.id
      assert.equal((await fetch(`${base}/admin/${scenario.list}`, { headers })).status, 200)
      assert.equal((await fetch(`${base}/admin/${scenario.list}`, { method: 'POST', headers, body: '{}' })).status, 200)
      assert.equal((await fetch(`${base}/admin/${scenario.list}/refresh`, { headers, redirect: 'manual' })).status, 303)
      assert.equal((await fetch(`${base}/admin/${scenario.edit}/${recordId}`, { headers })).status, 200)
      assert.equal((await fetch(`${base}/admin/${scenario.update}/${recordId}`, { method: 'POST', headers, body: JSON.stringify(scenario.body) })).status, 200)
      assert.equal((await fetch(`${base}/admin/${scenario.remove}/${recordId}`, { headers })).status, 200)
      assert.ok(!store.deleted.includes(`${scenario.resource}:${recordId}`), 'GET must not mutate state')
      assert.equal((await fetch(`${base}/admin/${scenario.remove}/${recordId}`, { method: 'POST', headers, body: '{}' })).status, 200)
      assert.ok(store.deleted.includes(`${scenario.resource}:${recordId}`))
    }
  })
})

test('admin validation blocks duplicates, foreign parents, invalid status, and forged sessions', async () => {
  await fixture(async (base, cookie) => {
    const headers = { Accept: 'application/json', Cookie: cookie, 'Content-Type': 'application/json' }
    const path = base + '/admin/add/business_type'
    assert.equal((await fetch(path, { method: 'POST', headers, body: JSON.stringify({ business_type: 'Retail', display_name: 'Retail', status: 9 }) })).status, 422)
    assert.equal((await fetch(path, { method: 'POST', headers, body: JSON.stringify({ business_type: 'Retail', display_name: 'Retail', status: 1 }) })).status, 201)
    assert.equal((await fetch(path, { method: 'POST', headers, body: JSON.stringify({ business_type: 'Retail', display_name: 'Retail', status: 1 }) })).status, 409)
    assert.equal((await fetch(base + '/admin/add/sub_feature', { method: 'POST', headers, body: JSON.stringify({ feature_id: 999, sub_feature: 'X', priority: 1, status: 1 }) })).status, 422)
    const sub = (feature_id: number) => fetch(base + '/admin/add/sub_feature', { method: 'POST', headers, body: JSON.stringify({ feature_id, sub_feature: 'Sales', priority: 1, status: 1 }) })
    assert.equal((await sub(1)).status, 201)
    assert.equal((await sub(1)).status, 409)
    assert.equal((await sub(2)).status, 201, 'the same sub-feature name is valid under another feature')
    const key = (key_name: string, short_key: string) => fetch(base + '/admin/add/key_map', { method: 'POST', headers, body: JSON.stringify({ key_name, short_key, status: 1 }) })
    assert.equal((await key('Save', 'F2')).status, 201)
    assert.equal((await key('Checkout', 'F2')).status, 409)
    assert.equal((await fetch(base + '/admin/admins', { headers: { Accept: 'application/json', Cookie: cookie + 'tampered' } })).status, 401)
  })
})
