import bcrypt from 'bcryptjs'
import { createHash, timingSafeEqual } from 'node:crypto'
import type { AdminResource, AdminStore } from '../../models/admin/contracts.ts'

type Field = { name: string; type: 'text' | 'status' | 'positive' | 'mobile' | 'optional' | 'password'; max?: number }
export type ResourceDefinition = { resource: AdminResource; title: string; singular: string; searchFields: string[]; duplicateFields: string[][]; fields: Field[]; parent?: { field: string; resource: 'features' | 'businessTypes' }; filter?: { query: string; field: string } }

export const resources: ResourceDefinition[] = [
  { resource: 'admins', title: 'Admins', singular: 'admin', searchFields: ['name', 'mobile'], duplicateFields: [['mobile']], fields: [{ name: 'name', type: 'text', max: 100 }, { name: 'mobile', type: 'mobile' }, { name: 'password', type: 'password', max: 128 }, { name: 'status', type: 'status' }] },
  { resource: 'businessTypes', title: 'Business types', singular: 'business_type', searchFields: ['business_type'], duplicateFields: [['business_type']], fields: [{ name: 'business_type', type: 'text', max: 100 }, { name: 'display_name', type: 'text', max: 100 }, { name: 'status', type: 'status' }] },
  { resource: 'features', title: 'Features', singular: 'feature', searchFields: ['feature'], duplicateFields: [['feature']], fields: [{ name: 'feature', type: 'text', max: 100 }, { name: 'priority', type: 'positive' }, { name: 'status', type: 'status' }] },
  { resource: 'subFeatures', title: 'Sub features', singular: 'sub_feature', searchFields: ['sub_feature'], duplicateFields: [['feature_id', 'sub_feature']], parent: { field: 'feature_id', resource: 'features' }, filter: { query: 'feature_id', field: 'feature_id' }, fields: [{ name: 'feature_id', type: 'positive' }, { name: 'sub_feature', type: 'text', max: 100 }, { name: 'priority', type: 'positive' }, { name: 'status', type: 'status' }] },
  { resource: 'keyMappings', title: 'Key mappings', singular: 'key_map', searchFields: ['key_name'], duplicateFields: [['key_name'], ['short_key']], fields: [{ name: 'key_name', type: 'text', max: 255 }, { name: 'short_key', type: 'optional', max: 255 }, { name: 'status', type: 'status' }] },
  { resource: 'billColumns', title: 'Bill columns', singular: 'bill_column', searchFields: ['col_name'], duplicateFields: [['col_name']], fields: [{ name: 'col_name', type: 'text', max: 255 }, { name: 'app_status', type: 'status' }, { name: 'status', type: 'status' }] },
  { resource: 'couponUsageTypes', title: 'Coupon usage types', singular: 'coupon_usage_type', searchFields: ['title'], duplicateFields: [['title']], fields: [{ name: 'title', type: 'text', max: 255 }, { name: 'status', type: 'status' }] },
  { resource: 'billFormats', title: 'Bill formats', singular: 'bill_format', searchFields: ['title'], duplicateFields: [], parent: { field: 'business_type_id', resource: 'businessTypes' }, filter: { query: 'business_type_id', field: 'business_type_id' }, fields: [{ name: 'business_type_id', type: 'positive' }, { name: 'title', type: 'text', max: 255 }, { name: 'size', type: 'text', max: 100 }, { name: 'status', type: 'status' }] },
]

export class AdminService {
  readonly store: AdminStore
  readonly pageSize: number
  constructor(store: AdminStore, pageSize = 25) {
    if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new Error('ADMIN_PAGE_SIZE must be from 1 to 100.')
    this.store = store
    this.pageSize = pageSize
  }

  async login(mobile: unknown, password: unknown) {
    if (typeof mobile !== 'string' || !/^[6-9]\d{9}$/.test(mobile) || typeof password !== 'string' || password.length > 128) return null
    const admin = await this.store.findAdminByMobile(mobile)
    if (!admin) return null
    const bcryptHash = /^\$2[aby]\$/.test(admin.passwordHash)
    const valid = bcryptHash ? await bcrypt.compare(password, admin.passwordHash) : this.matchesLegacy(password, admin.passwordHash)
    if (!valid) return null
    if (!bcryptHash) await this.store.updatePassword(admin.id, admin.passwordHash, await bcrypt.hash(password, 12))
    return admin
  }

  private matchesLegacy(password: string, hash: string) {
    const calculated = createHash('md5').update(password).digest('hex')
    const left = Buffer.from(calculated)
    const right = Buffer.from(hash)
    return left.length === right.length && timingSafeEqual(left, right)
  }

  async changePassword(adminId: bigint, current: unknown, next: unknown, confirmation: unknown) {
    if (typeof current !== 'string' || typeof next !== 'string' || next !== confirmation || next.length < 8 || next.length > 128) return false
    const admin = await this.store.findAdminById(adminId)
    if (!admin) return false
    const valid = /^\$2[aby]\$/.test(admin.passwordHash) ? await bcrypt.compare(current, admin.passwordHash) : this.matchesLegacy(current, admin.passwordHash)
    return valid && this.store.updatePassword(adminId, admin.passwordHash, await bcrypt.hash(next, 12))
  }

  async list(definition: ResourceDefinition, query: Record<string, unknown>) {
    const page = Math.max(1, Math.min(1_000_000, Number(query.page) || 1))
    const search = typeof query.search_str === 'string' ? query.search_str.trim().slice(0, 100) : ''
    const rawStatus = query.status === '' || query.status === undefined ? undefined : Number(query.status)
    const status = rawStatus === 2 ? 0 : rawStatus === 0 || rawStatus === 1 ? rawStatus : undefined
    const filters: Record<string, bigint> = {}
    if (definition.filter) {
      const value = Number(query[definition.filter.query])
      if (Number.isSafeInteger(value) && value > 0) filters[definition.filter.field] = BigInt(value)
    }
    return this.store.list(definition.resource, definition.searchFields, search, status, filters, page, this.pageSize)
  }

  async validate(definition: ResourceDefinition, input: Record<string, unknown>, create = false) {
    const data: Record<string, unknown> = {}
    for (const field of definition.fields) {
      const raw = input[field.name]
      if(field.type==='password'){
        const value=typeof raw==='string'?raw:''
        if(!value&&!create)continue
        if(value.length<10||value.length>128||!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/.test(value))throw new Error('Password must be at least 10 characters with upper, lower, number, and symbol.')
        data.password=await bcrypt.hash(value,12)
      } else if (field.type === 'status') {
        const value = Number(raw)
        if (value !== 0 && value !== 1) throw new Error(`${field.name} must be 0 or 1.`)
        data[field.name] = value
      } else if (field.type === 'positive') {
        const value = Number(raw)
        if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${field.name} must be a positive integer.`)
        data[field.name] = field.name.endsWith('_id') ? BigInt(value) : value
      } else if (field.type === 'mobile') {
        if (typeof raw !== 'string' || !/^[6-9]\d{9}$/.test(raw)) throw new Error('Enter a valid Indian mobile number.')
        data[field.name] = raw
      } else {
        if (raw === undefined || raw === null || (field.type !== 'optional' && String(raw).trim() === '')) throw new Error(`${field.name} is required.`)
        const value = String(raw ?? '').trim()
        if ((field.max ?? 255) < value.length) throw new Error(`${field.name} is too long.`)
        data[field.name] = value || null
      }
    }
    if (definition.parent) {
      const parentId = data[definition.parent.field]
      if (typeof parentId !== 'bigint' || !await this.store.activeParent(definition.parent.resource, parentId)) throw new Error('Selected parent is not active.')
    }
    return data
  }
}
