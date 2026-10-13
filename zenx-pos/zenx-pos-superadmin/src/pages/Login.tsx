import { useState, type FormEvent } from 'react'
import { api } from '../api'
import type { Admin } from '../model'
import { FieldLabel } from '../ui'

export function Login({ onLogin }: { onLogin: (admin: Admin) => void }) {
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('')
    if (!/^[6-9]\d{9}$/.test(mobile)) { setError('Enter a valid 10-digit mobile number.'); return }
    setLoading(true)
    try { onLogin(await api.login(mobile, password)) } catch (reason) { setError((reason as Error).message) } finally { setLoading(false) }
  }
  return <main className="login-shell">
    <section className="login-brand">
      <div className="login-wordmark">Zenx<span>POS</span></div>
      <div className="login-message"><span className="eyebrow light">Platform administration</span><h1>Every store.<br/>One clear view.</h1><p>Manage subscriptions, capabilities, barcode access and platform configuration from a single secure workspace.</p></div>
      <div className="login-grid"><div><strong>01</strong><span>Tenant control</span></div><div><strong>02</strong><span>Contract visibility</span></div><div><strong>03</strong><span>Secure access</span></div></div>
    </section>
    <section className="login-panel"><form className="login-card" onSubmit={submit}>
      <div className="mobile-brand">Zenx<span>POS</span></div><span className="eyebrow">Super admin portal</span><h2>Welcome back</h2><p>Sign in with your platform administrator account.</p>
      {error && <div className="alert error">{error}</div>}
      <label><FieldLabel required>Mobile number</FieldLabel><input required value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" autoComplete="username" placeholder="98765 43210" /></label>
      <label><FieldLabel required>Password</FieldLabel><div className="password-input"><input required type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Enter your password"/><button type="button" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button></div></label>
      <button className="button primary full" disabled={loading}>{loading ? 'Signing in…' : 'Sign in securely'}<span>→</span></button>
      <small>Protected administration area · Authorized personnel only</small>
    </form></section>
  </main>
}
