import { useEffect, useState, type FormEvent } from 'react'
import './App.css'
import { api, ADMIN_SESSION_EXPIRED, ApiError } from './api'
import type { Admin } from './model'
import { resourceByKey } from './model'
import { FieldLabel, Icon } from './ui'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { ResourcePage } from './pages/Resources'
import { ClientDetail, ClientsPage, CollectionsPage } from './pages/Clients'
import { IntegrationsPage } from './pages/Integrations'
import { PasswordResetsPage } from './pages/PasswordResets'
import { SupportIncidentsPage } from './pages/SupportIncidents'
import { ActiveLoginsPage, PlatformSettingsPage, RegistrationsPage } from './pages/Platform'
import { LetterheadPage } from './pages/Letterhead'
import { WebsiteEnquiriesPage } from './pages/WebsiteEnquiries'
import { WebsiteEnquiryNotification } from './WebsiteEnquiryNotification'

const navigation = [
  { section: 'Overview', items: [['dashboard', 'Dashboard', 'dashboard']] },
  { section: 'Client operations', items: [['clients', 'Client Management', 'clients'], ['contracts', 'Contract Details', 'settings'], ['collections', 'Collection Details', 'money'], ['website-enquiries', 'Website Enquiries', 'inbox'], ['registrations', 'Registrations', 'clients'], ['support', 'Support Incidents', 'settings']] },
  { section: 'Platform setup', items: [['platform-settings', 'Platform Settings', 'settings'], ['letterhead', 'Letterhead Designer', 'barcode'], ['integrations', 'Integrations', 'money'], ['business-types', 'Business Types', 'settings'], ['features', 'Features', 'settings'], ['sub-features', 'Sub Features', 'settings'], ['key-mappings', 'Key Mapping', 'settings'], ['bill-columns', 'Bill Columns', 'settings'], ['coupon-usage-types', 'Coupon Usage Types', 'settings'], ['bill-formats', 'Bill Formats', 'settings']] },
  { section: 'Access & security', items: [['active-logins', 'Active Logins', 'lock'], ['admins', 'Admin Management', 'clients'], ['password-resets', 'Password Requests', 'lock'], ['change-password', 'Change Password', 'lock']] },
] as const

function routeFromHash() { return window.location.hash.replace(/^#\/?/, '') || 'dashboard' }

function App() {
  const [admin, setAdmin] = useState<Admin | null>(), [route, setRoute] = useState(routeFromHash), [menu, setMenu] = useState(false)
  const navigate = (next: string) => { window.history.pushState(null, '', `#/${next}`); setRoute(next); setMenu(false); window.scrollTo(0, 0) }
  useEffect(() => {
    const change = () => setRoute(routeFromHash())
    const expired = () => setAdmin(null)
    window.addEventListener('hashchange', change)
    window.addEventListener(ADMIN_SESSION_EXPIRED, expired)
    api.session().then(setAdmin).catch((reason) => { if (reason instanceof ApiError && reason.status === 401) setAdmin(null); else setAdmin(null) })
    return () => { window.removeEventListener('hashchange', change); window.removeEventListener(ADMIN_SESSION_EXPIRED, expired) }
  }, [])
  async function logout() { try { await api.logout() } finally { setAdmin(null); navigate('dashboard') } }
  if (admin === undefined) return <div className="boot"><div className="boot-logo">Zenx<span>POS</span></div><div className="boot-line"/></div>
  if (!admin) return <Login onLogin={(value) => { setAdmin(value); navigate('dashboard') }}/>
  const active = route.startsWith('client/') ? 'clients' : route
  return <div className="app-shell">
    <aside className={`sidebar ${menu ? 'open' : ''}`}><div className="brand">Zenx<span>POS</span><small>Control center</small></div><nav>{navigation.map((group) => <div className="nav-group" key={group.section}><div className="nav-section">{group.section}</div>{group.items.map(([key, label, icon]) => <button className={active === key ? 'active' : ''} key={key} onClick={() => navigate(key)}><Icon name={icon}/><span>{label}</span>{active === key && <i/>}</button>)}</div>)}</nav><div className="sidebar-profile"><div className="avatar">{admin.name.slice(0, 1).toUpperCase()}</div><div><strong>{admin.name}</strong><span>Super administrator</span></div><button onClick={() => void logout()} aria-label="Sign out"><Icon name="logout"/></button></div></aside>
    {menu && <button className="sidebar-scrim" aria-label="Close menu" onClick={() => setMenu(false)}/>}<main className="main"><header className="topbar"><button className="menu-button" aria-label="Open navigation" onClick={() => setMenu(true)}>☰</button><div className="crumb"><span>ZenxPOS</span><b>/</b><strong>{labelFor(active)}</strong></div><div className="topbar-right"><WebsiteEnquiryNotification key={admin.id} onOpen={() => navigate('website-enquiries')}/><span className="live-dot"><i/>System live</span><button className="top-avatar" onClick={() => navigate('change-password')}>{admin.name.slice(0, 1).toUpperCase()}</button></div></header><div className="content">{renderRoute(route, navigate)}</div><footer className="footer">ZenxPOS Control Center <span>·</span> Secure platform administration</footer></main>
  </div>
}

function renderRoute(route: string, navigate: (route: string) => void) {
  if (route === 'dashboard') return <Dashboard navigate={navigate}/>
  if (route === 'clients') return <ClientsPage key="clients" navigate={navigate}/>
  if (route === 'contracts') return <ClientsPage key="contracts" mode="contracts" navigate={navigate}/>
  if (route === 'collections') return <CollectionsPage/>
  if (route === 'integrations') return <IntegrationsPage/>
  if (route === 'password-resets') return <PasswordResetsPage/>
  if (route === 'support') return <SupportIncidentsPage/>
  if (route === 'website-enquiries') return <WebsiteEnquiriesPage/>
  if (route === 'active-logins') return <ActiveLoginsPage/>
  if (route === 'registrations') return <RegistrationsPage/>
  if (route === 'platform-settings') return <PlatformSettingsPage/>
  if (route === 'letterhead') return <LetterheadPage/>
  if (route === 'change-password') return <ChangePassword/>
  if (route.startsWith('client/')) { const id = route.split('/')[1] ?? ''; return <ClientDetail key={`client-${id}`} id={id} navigate={navigate}/> }
  const resource = resourceByKey[route]
  if (resource) return <ResourcePage key={resource.key} resource={resource}/>
  return <div className="not-found"><span>404</span><h1>That page is not available.</h1><button className="button primary" onClick={() => navigate('dashboard')}>Return to dashboard</button></div>
}

function ChangePassword() {
  const [values, setValues] = useState({ current_password: '', password: '', password_confirmation: '' }), [error, setError] = useState(''), [success, setSuccess] = useState(''), [loading, setLoading] = useState(false)
  async function submit(event: FormEvent) { event.preventDefault(); setError(''); setSuccess(''); if (values.password !== values.password_confirmation) { setError('The new passwords do not match.'); return } setLoading(true); try { await api.changePassword(values); setSuccess('Your password has been updated.'); setValues({ current_password: '', password: '', password_confirmation: '' }) } catch (reason) { setError((reason as Error).message) } finally { setLoading(false) } }
  return <><div className="page-header"><div><div className="eyebrow">Access & security</div><h1>Change Password</h1><p>Use a strong, unique password for this administrator account.</p></div></div><section className="panel password-panel"><div className="security-art"><Icon name="lock"/><h2>Protect platform access</h2><p>Your new password must be at least 8 characters. Avoid passwords used for other services.</p></div><form onSubmit={submit}>{error && <div className="alert error">{error}</div>}{success && <div className="alert success">{success}</div>}<label><FieldLabel required>Current password</FieldLabel><input type="password" required value={values.current_password} onChange={(e) => setValues({ ...values, current_password: e.target.value })}/></label><label><FieldLabel required>New password</FieldLabel><input type="password" required minLength={8} value={values.password} onChange={(e) => setValues({ ...values, password: e.target.value })}/></label><label><FieldLabel required>Confirm new password</FieldLabel><input type="password" required minLength={8} value={values.password_confirmation} onChange={(e) => setValues({ ...values, password_confirmation: e.target.value })}/></label><button className="button primary" disabled={loading}>{loading ? 'Updating…' : 'Update password'}</button></form></section></>
}

function labelFor(route: string) { for (const group of navigation) for (const [key, label] of group.items) if (key === route) return label; return route === 'client' ? 'Client workspace' : 'Dashboard' }
export default App
