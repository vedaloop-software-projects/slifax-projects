import type { Letterhead } from './letterhead/model'
import type { ActiveSessionSummary, Admin, ClientSessions, IntegrationRequest, ListResult, PasswordResetRequest, RegistrationRequest, Resource, Row, SupportIncident } from './model'

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
export const ADMIN_SESSION_EXPIRED = 'zenxpos:admin-session-expired'
export const assetUrl = (path: string) => /^https?:\/\//i.test(path) ? path : `${API_BASE}/${path.replace(/^\//, '')}`

export class ApiError extends Error {
  status: number
  fieldErrors: Record<string, string>
  constructor(message: string, status: number, fieldErrors: Record<string, string> = {}) { super(message); this.status = status; this.fieldErrors = fieldErrors }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const form = init.body instanceof FormData
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: { Accept: 'application/json', ...(form ? {} : { 'Content-Type': 'application/json' }), ...init.headers },
  })
  const payload = await response.json().catch(() => null) as { errors?: string; message?: string; fieldErrors?: Record<string, string> } | null
  if (!response.ok) {
    if (response.status === 401 && path !== '/admin/login') window.dispatchEvent(new Event(ADMIN_SESSION_EXPIRED))
    throw new ApiError(payload?.errors ?? payload?.message ?? `Request failed (${response.status})`, response.status, payload?.fieldErrors)
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
  async requestPasswordReset(mobile: string) { await request('/admin/forgot-password', { method: 'POST', body: JSON.stringify({ mobile }) }) },
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
  async integrationRequests(status = '') { return (await request<{ data: IntegrationRequest[] }>(`/admin/integration-requests?${query({ status })}`)).data },
  async configureIntegration(id: string, values: Record<string, unknown>) { await request(`/admin/integration-requests/${id}/configure`, { method: 'POST', body: JSON.stringify(values) }) },
  async updateIntegrationRequest(id: string, status: 'in_review' | 'rejected' | 'disabled', notes = '') { await request(`/admin/integration-requests/${id}/status`, { method: 'POST', body: JSON.stringify({ status, notes }) }) },
  async supportIncidents(priority = '', status = '') { return (await request<{ data: SupportIncident[] }>(`/admin/support-incidents?${query({ priority, status })}`)).data },
  async updateSupportIncident(id: string, status: 'open' | 'in_progress' | 'resolved', resolutionSteps: string | null) { await request(`/admin/support-incidents/${id}/status`, { method: 'POST', body: JSON.stringify({ status, resolutionSteps }) }) },
  async passwordResetRequests() { return (await request<{ data: PasswordResetRequest[] }>('/admin/password-reset-requests')).data },
  async platformSettings() { return (await request<{ data: Record<string, string> }>('/admin/platform-settings')).data },
  async letterhead() { return (await request<{ data: { design: Letterhead; updatedAt: string | null; isDefault: boolean } }>('/admin/letterhead')).data },
  async saveLetterhead(design: Letterhead) { return request<{ message: string; data: { design: Letterhead; updatedAt: string | null; isDefault: boolean } }>('/admin/letterhead', { method: 'POST', body: JSON.stringify(design) }) },
  async letterheadPreview(design: Letterhead) {
    const response = await fetch(`${API_BASE}/admin/letterhead/preview`, { method: 'POST', credentials: 'include', headers: { Accept: 'application/pdf', 'Content-Type': 'application/json' }, body: JSON.stringify(design) })
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { errors?: string } | null
      if (response.status === 401) window.dispatchEvent(new Event(ADMIN_SESSION_EXPIRED))
      throw new ApiError(payload?.errors ?? `Preview failed (${response.status})`, response.status)
    }
    return response.blob()
  },
  async savePlatformSettings(values: Record<string, unknown>) { return (await request<{ data: Record<string, string> }>('/admin/platform-settings', { method: 'POST', body: JSON.stringify(values) })).data },
  async activeSessions() { return (await request<{ data: { defaultDeviceLimit: number; clients: ActiveSessionSummary[] } }>('/admin/active-sessions')).data },
  async clientSessions(id: string) { return (await request<{ data: ClientSessions }>(`/admin/client/${id}/sessions`)).data },
  async revokeSessions(id: string, sessionId?: string) { await request(`/admin/client/${id}/sessions/revoke`, { method: 'POST', body: JSON.stringify(sessionId ? { sessionId } : {}) }) },
  async setDeviceLimit(id: string, maxLoginDevices: number | null) { await request(`/admin/client/${id}/device-limit`, { method: 'POST', body: JSON.stringify({ maxLoginDevices }) }) },
  async setTimeZone(id: string, timeZone: string) { await request(`/admin/client/${id}/time-zone`, { method: 'POST', body: JSON.stringify({ timeZone }) }) },
  async dayCloses(id: string) { return (await request<{ data: { pendingDates: string[]; closes: { id: string; date: string; closedAt: string }[] } }>(`/admin/client/${id}/day-close`)).data },
  async changeDayClose(id: string, date: string, action: 'close' | 'reopen') { return request<{ message: string }>(`/admin/client/${id}/day-close`, { method: 'POST', body: JSON.stringify({ date, action }) }) },
  async registrations(status = '', page = 1) { return request<{ data: RegistrationRequest[]; meta: { total: number; pageSize: number } }>(`/admin/registrations?${query({ status, page })}`) },
  async reviewRegistration(id: string, status: 'approved' | 'rejected', note: string, clientId?: string) { await request(`/admin/registrations/${id}/review`, { method: 'POST', body: JSON.stringify({ status, note, clientId: clientId ?? null }) }) },
  async resetRequestedPassword(requestId: string, newPassword: string, confirmPassword: string) { await request(`/admin/password-reset-requests/${requestId}/reset`, { method: 'POST', body: JSON.stringify({ newPassword, confirmPassword }) }) },
}
