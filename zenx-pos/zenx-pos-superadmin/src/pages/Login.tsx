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
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotMobile, setForgotMobile] = useState('')
  const [forgotMessage, setForgotMessage] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('')
    if (!/^[6-9]\d{9}$/.test(mobile)) { setError('Enter a valid 10-digit mobile number.'); return }
    setLoading(true)
    try { onLogin(await api.login(mobile, password)) } catch (reason) { setError((reason as Error).message) } finally { setLoading(false) }
  }
  async function askToReset(event: FormEvent) {
    event.preventDefault(); setError(''); setForgotMessage('')
    if (!/^[6-9]\d{9}$/.test(forgotMobile)) { setError('Enter a valid 10-digit mobile number.'); return }
    setForgotLoading(true)
    try { await api.requestPasswordReset(forgotMobile); setForgotMessage('Your request has been sent to another super administrator.') } catch (reason) { setError((reason as Error).message) } finally { setForgotLoading(false) }
  }
  return <main className="login-shell">
    <section className="login-brand">
      <div className="login-wordmark">Zenx<span>POS</span></div>
      <div className="login-message"><span className="eyebrow light">Platform administration</span><h1>Every store.<br/>One clear view.</h1><p>Manage subscriptions, capabilities, barcode access and platform configuration from a single secure workspace.</p></div>
      <div className="login-grid"><div><strong>01</strong><span>Tenant control</span></div><div><strong>02</strong><span>Contract visibility</span></div><div><strong>03</strong><span>Secure access</span></div></div>
    </section>
    <section className="login-panel"><form className="login-card" onSubmit={submit}>
      <div className="mobile-brand">Zenx<span>POS</span></div><span className="eyebrow">Super admin portal</span><h2>Welcome back</h2><p>Sign in with your platform administrator account.</p>
      {error && !forgotOpen && <div className="alert error">{error}</div>}
      <label><FieldLabel required>Mobile number</FieldLabel><input required value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" autoComplete="username" placeholder="98765 43210" /></label>
      <label><FieldLabel required>Password</FieldLabel><div className="password-input"><input required type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Enter your password"/><button type="button" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button></div></label>
      <button className="forgot-link" type="button" onClick={() => { setForgotMobile(mobile); setForgotMessage(''); setError(''); setForgotOpen(true) }}>Forgot password?</button>
      <button className="button primary full" disabled={loading}>{loading ? 'Signing in…' : 'Sign in securely'}<span>→</span></button>
      <small>Protected administration area · Authorized personnel only</small>
    </form></section>
    {forgotOpen && <div className="modal-backdrop"><section className="modal"><header><div><span className="eyebrow">Account recovery</span><h2>Ask to reset password</h2></div><button className="icon-button" onClick={() => setForgotOpen(false)}>×</button></header><form className="modal-body" onSubmit={askToReset}>{error && <div className="alert error">{error}</div>}{forgotMessage && <div className="alert success">{forgotMessage}</div>}<p className="section-help">Enter the registered phone number. Another super administrator will review the request and set a new password.</p><label><FieldLabel required>Mobile number</FieldLabel><input required value={forgotMobile} onChange={(e) => setForgotMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" /></label><div className="form-actions"><button type="button" className="button ghost" onClick={() => setForgotOpen(false)}>Cancel</button><button className="button primary" disabled={forgotLoading}>{forgotLoading ? 'Sending…' : 'Ask to reset'}</button></div></form></section></div>}
  </main>
}
