import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { api } from '../api'
import type { ActiveSessionSummary, ClientSessions, LoginSession, RegistrationRequest } from '../model'
import { Empty, FieldLabel, Icon, Modal, PageHeader } from '../ui'
import { ClientForm } from './Clients'
import { Pagination } from './Resources'

type Lookups = Awaited<ReturnType<typeof api.prerequisites>>

const when = (value: string | null | undefined) => value ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
const ago = (value: string) => {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000))
  if (minutes < 1) return 'Active now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  return hours < 24 ? `${hours} h ago` : `${Math.round(hours / 24)} d ago`
}
const todayApi = () => { const [y, m, d] = new Date().toISOString().slice(0, 10).split('-'); return `${d}-${m}-${y}` }
const toApiDate = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}-${m}-${y}` }
const toIsoDate = (api: string) => { const [d, m, y] = api.split('-'); return `${y}-${m}-${d}` }
const errorText = (reason: unknown) => (reason as Error).message

function DeviceCell({ session }: { session: LoginSession }) {
  return <div className="device-cell"><span className="device-icon"><Icon name="dashboard"/></span><div><strong>{session.deviceName ?? 'Unknown device'}</strong><small>{[session.platform, session.deviceId === 'unknown' ? 'older app build' : null].filter(Boolean).join(' · ') || '—'}</small></div></div>
}

export function ActiveLoginsPage() {
  const [data, setData] = useState<{ defaultDeviceLimit: number; clients: ActiveSessionSummary[] }>(), [error, setError] = useState(''), [open, setOpen] = useState<string | null>(null)
  const load = useCallback(async () => { try { setData(await api.activeSessions()); setError('') } catch (reason) { setError(errorText(reason)) } }, [])
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0), refresh = window.setInterval(() => void load(), 30_000); return () => { window.clearTimeout(timer); window.clearInterval(refresh) } }, [load])
  const clients = data?.clients ?? []
  const cards: [string, number, string][] = [
    ['Clients online', clients.length, 'Businesses with at least one signed-in device'],
    ['Users signed in', clients.reduce((sum, row) => sum + row.activeUsers, 0), 'Distinct staff logins'],
    ['Active devices', clients.reduce((sum, row) => sum + row.activeDevices, 0), 'Phones and tablets with a live session'],
    ['Default device limit', data?.defaultDeviceLimit ?? 1, 'Per login · change in Platform Settings'],
  ]
  return <>
    <PageHeader eyebrow="Access & security" title="Active Logins" description="Who is signed in right now, on which devices and from where. Refreshes every 30 seconds." actions={<button className="button ghost" onClick={() => void load()}>Refresh</button>}/>
    {error && <div className="alert error">{error}</div>}
    <section className="metric-grid">{cards.map(([label, value, hint]) => <article className="metric" key={label}><div className="metric-icon"><Icon name="clients"/></div><div className="metric-value">{value.toLocaleString('en-IN')}</div><strong>{label}</strong><span>{hint}</span></article>)}</section>
    <section className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>Business</th><th>Users</th><th>Devices</th><th>Device limit</th><th>Last activity</th><th className="actions-col">Actions</th></tr></thead><tbody>
      {clients.map((row) => <tr key={row.clientId}><td><button className="business-link" onClick={() => setOpen(row.clientId)}>{row.businessName}</button><small>{row.activeSessions} live session{row.activeSessions === 1 ? '' : 's'}</small></td><td>{row.activeUsers}</td><td>{row.activeDevices}</td><td>{row.maxLoginDevices ?? `${data?.defaultDeviceLimit ?? 1} (default)`}<small>per login</small></td><td>{ago(row.lastActiveAt)}<small>{when(row.lastActiveAt)}</small></td><td className="row-actions"><button onClick={() => setOpen(row.clientId)}>View sessions</button></td></tr>)}
    </tbody></table>{data && clients.length === 0 && <Empty title="Nobody is signed in" text="Sessions appear here as soon as a client logs in from the app."/>}{!data && !error && <div className="loading-bar">Loading sessions…</div>}</div></section>
    {open && <ClientSessionsModal clientId={open} onClose={() => { setOpen(null); void load() }}/>}
  </>
}

export function ClientSessionsModal({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const [data, setData] = useState<ClientSessions>(), [limit, setLimit] = useState(''), [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false)
  const load = useCallback(async () => { try { const value = await api.clientSessions(clientId); setData(value); setLimit(value.maxLoginDevices === null ? '' : String(value.maxLoginDevices)); setError('') } catch (reason) { setError(errorText(reason)) } }, [clientId])
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer) }, [load])
  async function act(work: () => Promise<void>, message: string) { setBusy(true); setNotice(''); try { await work(); setNotice(message); await load() } catch (reason) { setError(errorText(reason)) } finally { setBusy(false) } }
  const signOut = (session?: LoginSession) => {
    const label = session ? `${session.deviceName ?? 'this device'} (${session.userName ?? 'user'})` : 'every device of this client'
    if (!confirm(`Sign out ${label}? They will need to log in again.`)) return
    void act(() => api.revokeSessions(clientId, session?.sessionId), session ? 'Device signed out.' : 'All devices signed out.')
  }
  const byUser = new Map<string, LoginSession[]>()
  for (const session of data?.sessions ?? []) byUser.set(session.userId, [...(byUser.get(session.userId) ?? []), session])
  return <Modal title={`Logins · ${data?.businessName ?? '…'}`} onClose={onClose} wide>
    {error && <div className="alert error">{error}</div>}{notice && <div className="alert success">{notice}</div>}
    <div className="form-section"><h3>Device limit per login</h3><p className="section-help">How many devices one staff login may use at the same time. Leave on default to follow Platform Settings.</p>
      <div className="inline-form"><label><FieldLabel>Allowed devices</FieldLabel><select value={limit} onChange={(e) => setLimit(e.target.value)}><option value="">Platform default ({data?.defaultDeviceLimit ?? 1})</option>{Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n} device{n === 1 ? '' : 's'}</option>)}</select></label>
        <button className="button primary" disabled={busy || !data} onClick={() => void act(() => api.setDeviceLimit(clientId, limit ? Number(limit) : null), 'Device limit saved.')}>Save limit</button></div></div>
    <div className="form-section"><div className="section-row"><h3>Signed-in devices ({data?.sessions.length ?? 0})</h3>{Boolean(data?.sessions.length) && <button className="button ghost danger-link" disabled={busy} onClick={() => signOut()}>Sign out all</button>}</div>
      <div className="table-wrap"><table><thead><tr><th>User</th><th>Device</th><th>Location</th><th>Signed in</th><th>Last active</th><th className="actions-col">Actions</th></tr></thead><tbody>
        {[...byUser.values()].flatMap((sessions) => sessions.map((session, index) => <tr key={session.sessionId}><td>{index === 0 ? <><strong>{session.userName ?? `User #${session.userId}`}</strong><small>{sessions.length} device{sessions.length === 1 ? '' : 's'}</small></> : null}</td><td><DeviceCell session={session}/></td><td>{session.location ?? 'Unknown location'}<small>{session.ipAddress ?? ''}</small></td><td>{when(session.createdAt)}</td><td>{ago(session.lastSeenAt)}</td><td className="row-actions"><button className="danger-link" disabled={busy} onClick={() => signOut(session)}>Sign out</button></td></tr>))}
      </tbody></table>{data && data.sessions.length === 0 && <Empty title="No active sessions" text="Nobody from this client is signed in right now."/>}{!data && !error && <div className="loading-bar">Loading sessions…</div>}</div></div>
    <div className="form-actions"><button className="button ghost" onClick={onClose}>Close</button></div>
  </Modal>
}

export function DayCloseModal({ clientId, businessName, onClose }: { clientId: string; businessName: string; onClose: () => void }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.dayCloses>>>(), [date, setDate] = useState(toIsoDate(todayApi())), [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false)
  const load = useCallback(async () => { try { setData(await api.dayCloses(clientId)); setError('') } catch (reason) { setError(errorText(reason)) } }, [clientId])
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer) }, [load])
  async function change(apiDate: string, action: 'close' | 'reopen') {
    const text = action === 'close' ? `Close ${apiDate} for ${businessName}? Its bills will be archived and billing for that date stops.` : `Reopen ${apiDate} for ${businessName}? Its bills move back so billing and a fresh day close are possible again.`
    if (!confirm(text)) return
    setBusy(true); setNotice(''); setError('')
    try { setNotice((await api.changeDayClose(clientId, apiDate, action)).message); await load() } catch (reason) { setError(errorText(reason)) } finally { setBusy(false) }
  }
  const closed = new Set(data?.closes.map((row) => row.date)), selected = toApiDate(date)
  return <Modal title={`Day Close · ${businessName}`} onClose={onClose} wide>
    {error && <div className="alert error">{error}</div>}{notice && <div className="alert success">{notice}</div>}
    {data && data.pendingDates.length > 0 && <div className="alert error">Not closed yet: <b>{data.pendingDates.join(', ')}</b>. Days must be closed oldest first.{' '}<button className="link-button" disabled={busy} onClick={() => void change(data.pendingDates[0]!, 'close')}>Close {data.pendingDates[0]} now</button></div>}
    <div className="form-section"><h3>Change day close</h3><p className="section-help">Close a pending date for this client, or reopen a date that was closed by mistake.</p>
      <div className="inline-form"><label><FieldLabel required>Business date</FieldLabel><input type="date" value={date} max={toIsoDate(todayApi())} onChange={(e) => setDate(e.target.value)}/></label>
        {closed.has(selected) ? <button className="button primary" disabled={busy || !date} onClick={() => void change(selected, 'reopen')}>Reopen {selected}</button> : <button className="button primary" disabled={busy || !date} onClick={() => void change(selected, 'close')}>Close {selected}</button>}</div></div>
    <div className="form-section"><h3>Recent day closes</h3><div className="table-wrap"><table><thead><tr><th>Business date</th><th>Closed at</th><th className="actions-col">Actions</th></tr></thead><tbody>
      {(data?.closes ?? []).map((row) => <tr key={row.id}><td>{row.date}</td><td>{when(row.closedAt)}</td><td className="row-actions"><button disabled={busy} onClick={() => void change(row.date, 'reopen')}>Reopen</button></td></tr>)}
    </tbody></table>{data && data.closes.length === 0 && <Empty title="No day closes yet" text="Closed business dates will be listed here."/>}{!data && !error && <div className="loading-bar">Loading…</div>}</div></div>
    <div className="form-actions"><button className="button ghost" onClick={onClose}>Close</button></div>
  </Modal>
}

export function PlatformSettingsPage() {
  const [values, setValues] = useState({ renewal_grace_days: '7', max_devices_per_user: '1' }), [error, setError] = useState(''), [notice, setNotice] = useState(''), [saving, setSaving] = useState(false), [loaded, setLoaded] = useState(false)
  useEffect(() => { void api.platformSettings().then((data) => { setValues({ renewal_grace_days: data.renewal_grace_days ?? '7', max_devices_per_user: data.max_devices_per_user ?? '1' }); setLoaded(true) }).catch((reason) => setError(errorText(reason))) }, [])
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('')
    try { await api.savePlatformSettings({ renewal_grace_days: Number(values.renewal_grace_days), max_devices_per_user: Number(values.max_devices_per_user) }); setNotice('Settings saved. They apply within a minute.') } catch (reason) { setError(errorText(reason)) } finally { setSaving(false) }
  }
  return <>
    <PageHeader eyebrow="Platform setup" title="Platform Settings" description="Rules that apply to every client unless overridden on the client."/>
    {error && <div className="alert error">{error}</div>}{notice && <div className="alert success">{notice}</div>}
    <form className="panel settings-panel" onSubmit={submit}>
      <div className="form-section"><h3>Subscription renewal</h3><p className="section-help">After a contract's end date the client keeps full access for this many days, then becomes inactive until it renews. Renewal payment stays available throughout.</p>
        <div className="form-grid"><label><FieldLabel required>Grace period (days)</FieldLabel><input type="number" min={0} max={90} required value={values.renewal_grace_days} onChange={(e) => setValues({ ...values, renewal_grace_days: e.target.value })}/></label></div></div>
      <div className="form-section"><h3>Login sessions</h3><p className="section-help">How many devices one staff login may use at the same time. Extra logins are blocked and the signed-in device is alerted with the new device's name and location. Individual clients can override this from Active Logins.</p>
        <div className="form-grid"><label><FieldLabel required>Devices per login</FieldLabel><input type="number" min={1} max={20} required value={values.max_devices_per_user} onChange={(e) => setValues({ ...values, max_devices_per_user: e.target.value })}/></label></div></div>
      <div className="form-actions"><button className="button primary" disabled={saving || !loaded}>{saving ? 'Saving…' : 'Save settings'}</button></div>
    </form>
  </>
}

export function RegistrationsPage() {
  const [status, setStatus] = useState('pending'), [page, setPage] = useState(1), [result, setResult] = useState<Awaited<ReturnType<typeof api.registrations>>>(), [error, setError] = useState('')
  const [lookups, setLookups] = useState<Lookups>(), [approving, setApproving] = useState<RegistrationRequest | null>(null)
  const load = useCallback(async () => { try { setResult(await api.registrations(status, page)); setError('') } catch (reason) { setError(errorText(reason)) } }, [status, page])
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer) }, [load])
  useEffect(() => { void api.prerequisites().then(setLookups).catch(() => undefined) }, [])
  async function reject(row: RegistrationRequest) {
    const note = prompt(`Reject ${row.businessName}? Optionally add a reason:`, '')
    if (note === null) return
    try { await api.reviewRegistration(row.id, 'rejected', note); await load() } catch (reason) { setError(errorText(reason)) }
  }
  async function approved(row: RegistrationRequest, clientId?: string) {
    setApproving(null)
    try { await api.reviewRegistration(row.id, 'approved', 'Client onboarded', clientId); await load() } catch (reason) { setError(errorText(reason)) }
  }
  const typeName = (id: string | null) => lookups?.businessTypes.find((item) => String(item.id) === id)?.business_type as string | undefined
  return <>
    <PageHeader eyebrow="Client operations" title="Registrations" description="Businesses that signed up from the app's home page. Approve to onboard them as a client." actions={<button className="button ghost" onClick={() => void load()}>Refresh</button>}/>
    {error && <div className="alert error">{error}</div>}
    <section className="panel table-panel"><div className="filters"><select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="">All</option></select></div>
      <div className="table-wrap"><table><thead><tr><th>Business</th><th>Contact</th><th>Location</th><th>Received</th><th>Status</th><th className="actions-col">Actions</th></tr></thead><tbody>
        {(result?.data ?? []).map((row) => <tr key={row.id}><td><strong>{row.businessName}</strong><small>{typeName(row.businessTypeId) ?? 'Business type not given'}</small></td><td>{row.contactPersonName}<small>{row.mobile} · {row.email}</small></td><td>{row.city ?? '—'}<small>{row.notes ?? ''}</small></td><td>{when(row.createdAt)}</td><td><span className={`status ${row.status === 'approved' ? 'active' : 'inactive'}`}><i/>{row.status[0]!.toUpperCase() + row.status.slice(1)}</span>{row.reviewNote && <small>{row.reviewNote}</small>}</td>
          <td className="row-actions">{row.status === 'pending' ? <><button disabled={!lookups} onClick={() => setApproving(row)}>Approve</button><button className="danger-link" onClick={() => void reject(row)}>Reject</button></> : '—'}</td></tr>)}
      </tbody></table>{result && result.data.length === 0 && <Empty title="No registrations" text="New sign-ups from the app will appear here."/>}{!result && !error && <div className="loading-bar">Loading registrations…</div>}</div>
      {result && <Pagination page={page} total={result.meta.total} pageSize={result.meta.pageSize} onPage={setPage}/>}</section>
    {approving && lookups && <ClientForm lookups={lookups} onClose={() => setApproving(null)} onSaved={(id) => void approved(approving, id)}
      prefill={{ business_name: approving.businessName, contact_person_name: approving.contactPersonName, mobile: approving.mobile, email: approving.email, business_type_id: approving.businessTypeId ?? '', city: approving.city ?? '', address: approving.address ?? '' }}/>}
  </>
}
