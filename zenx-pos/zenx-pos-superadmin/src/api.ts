import type { Admin, ListResult, Resource, Row } from './model'

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
export const ADMIN_SESSION_EXPIRED = 'zenxpos:admin-session-expired'
export const assetUrl = (path: string) => /^https?:\/\//i.test(path) ? path : `${API_BASE}/${path.replace(/^\//, '')}`

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) { super(message); this.status = status }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const form = init.body instanceof FormData
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: { Accept: 'application/json', ...(form ? {} : { 'Content-Type': 'application/json' }), ...init.headers },
  })
  const payload = await response.json().catch(() => null) as { errors?: string; message?: string } | null
  if (!response.ok) {
    if (response.status === 401 && path !== '/admin/login') window.dispatchEvent(new Event(ADMIN_SESSION_EXPIRED))
    throw new ApiError(payload?.errors ?? payload?.message ?? `Request failed (${response.status})`, response.status)
  }
  return payload as T
}

const query = (input: Record<string, unknown>) => {
  const value = new URLSearchParams()
  Object.entries(input).forEach(([key, item]) => { if (item !== '' && item !== undefined && item !== null) value.set(key, String(item)) })
  return value.toString()
}

export const api = {
  async login(mobile: string, password: string) { return (await request<{ data: Admin }>('/admin/login', { method: 'POST', body: JSON.stringify({ mobile, password }) })).data },
  async session() { return (await request<{ data: Admin }>('/admin/session')).data },
  async logout() { await request('/admin/logout', { method: 'POST', body: '{}' }) },
  async changePassword(body: Record<string, string>) { await request('/admin/update_password', { method: 'POST', body: JSON.stringify(body) }) },
  async listResource(resource: Resource, filters: Record<string, unknown> = {}) { return request<ListResult>(`/admin/${resource.list}?${query(filters)}`) },
  async getResource(resource: Resource, id: string) { return (await request<{ data: Row }>(`/admin/${resource.edit}/${id}`)).data },
  async saveResource(resource: Resource, values: Record<string, unknown>, id?: string, file?: File) {
    const path = `/admin/${id ? `${resource.update}/${id}` : resource.create}`
    if (resource.key === 'bill-formats') {
      const body = new FormData()
      Object.entries(values).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') body.set(key, String(value)) })
      if (file) body.set('file', file)
      return request(path, { method: 'POST', body })
    }
    return request(path, { method: 'POST', body: JSON.stringify(values) })
  },
  async deleteResource(resource: Resource, id: string) { await request(`/admin/${resource.remove}/${id}`, { method: 'POST', body: '{}' }) },
  async prerequisites() { return (await request<{ data: { businessTypes: Row[]; states: Row[]; features: (Row & { subFeatures?: Row[] })[] } }>('/admin/prerequisites')).data },
  async listClients(filters: Record<string, unknown> = {}, contracts = false) { return request<ListResult>(`/admin/${contracts ? 'contrat_details' : 'clients'}?${query(filters)}`) },
  async getClient(id: string) { return (await request<{ data: Row }>(`/admin/edit/client/${id}`)).data },
  async saveClient(values: Record<string, unknown>, id?: string, logo?: File) {
    const body = new FormData()
    Object.entries(values).forEach(([key, value]) => {
      if (value === undefined || value === null) return
      body.set(key, Array.isArray(value) ? JSON.stringify(value) : String(value))
    })
    if (logo) body.set('logo', logo)
    return request<{ data?: { id: string } }>(`/admin/${id ? `update/client/${id}` : 'add/client'}`, { method: 'POST', body })
  },
  async deleteClient(id: string) { await request(`/admin/delete/client/${id}`, { method: 'POST', body: '{}' }) },
  async setClientStatus(id: string, status: number) { await request(`/admin/client/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) }) },
  async getClientFeatures(id: string) { return request<{ client: Row; features: (Row & { subFeatures?: Row[] })[]; clientFeatures: Row[] }>(`/admin/client/features/${id}`) },
  async saveClientFeatures(user_id: string, features: number[], sub_features: number[]) { await request('/admin/client/features/update', { method: 'POST', body: JSON.stringify({ user_id, features, sub_features }) }) },
  async getPayments(id: string) { return request<Record<string, unknown>>(`/admin/get_client_payments/${id}`) },
  async addPayment(values: Record<string, unknown>) { await request('/admin/store_client_payment', { method: 'POST', body: JSON.stringify(values) }) },
  async collections(filters: Record<string, unknown> = {}) { return request<ListResult>(`/admin/collection_details?${query(filters)}`) },
}
