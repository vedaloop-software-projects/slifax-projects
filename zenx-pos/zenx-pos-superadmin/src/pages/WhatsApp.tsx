import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { api, type WhatsAppClientSettings, type WhatsAppProviderTemplate, type WhatsAppTemplate } from '../api'
import { Empty, FieldLabel, Modal, PageHeader, Status } from '../ui'

const errorText = (reason: unknown) => reason instanceof Error ? reason.message : 'Something went wrong.'
const rupees = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(value)
const PLACEHOLDER = /\{\{\s*([a-z][a-z0-9_]{0,39})\s*\}\}/g
const keysOf = (body: string) => [...new Set([...body.matchAll(PLACEHOLDER)].map((match) => match[1]!))]
const SAMPLE: Record<string, string> = { customer_name: 'Ravi Kumar', store_name: 'Asha Stores' }

// How the customer sees it: a WhatsApp chat bubble from the ZenxPOS number.
export function WhatsAppBubble({ body, values = {} }: { body: string; values?: Record<string, string> }) {
  const text = body.replace(PLACEHOLDER, (_whole, key: string) => values[key] || SAMPLE[key] || `[${key.replaceAll('_', ' ')}]`)
  return <div className="wa-preview"><div className="wa-head"><span className="wa-avatar">Z</span><div><b>ZenxPOS</b><small>Business account</small></div></div><div className="wa-chat"><div className="wa-bubble">{text}<span className="wa-time">10:30 am</span></div></div></div>
}

export function WhatsAppPage() {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>(), [editing, setEditing] = useState<WhatsAppTemplate | 'new' | null>(null)
  const [provider, setProvider] = useState<{ available: boolean; templates: WhatsAppProviderTemplate[] }>(), [checking, setChecking] = useState(false), [error, setError] = useState('')
  const load = useCallback(() => api.whatsappTemplates().then((data) => { setTemplates(data.templates); setError('') }).catch((reason) => setError(errorText(reason))), [])
  useEffect(() => { void api.whatsappTemplates().then((data) => setTemplates(data.templates)).catch((reason) => setError(errorText(reason))) }, [])
  async function check() { setChecking(true); try { setProvider(await api.whatsappProviderTemplates()) } catch (reason) { setError(errorText(reason)) } finally { setChecking(false) } }
  const providerIssue = (template: WhatsAppTemplate) => {
    if (!provider?.available) return null
    const match = provider.templates.find((item) => item.name === template.providerTemplate && item.language === template.language)
    if (!match) return 'Not found at VedaLoop'
    if (match.status !== 'APPROVED') return `VedaLoop status: ${match.status}`
    const count = keysOf(template.body).length
    return match.variables === count ? null : `VedaLoop expects ${match.variables} values; this body has ${count}`
  }
  return <>
    <PageHeader eyebrow="Platform setup" title="WhatsApp" description="The message templates stores pick from. Each one must match a template approved in the VedaLoop console. Free messages and the price per message are set per client (Client Management → Edit); the default price is in Platform Settings." actions={<><button className="button ghost" onClick={() => void check()} disabled={checking}>{checking ? 'Checking…' : 'Check with VedaLoop'}</button><button className="button primary" onClick={() => setEditing('new')}>+ Add template</button></>}/>
    {error && <div className="alert error">{error}</div>}
    {provider && !provider.available && <div className="alert error">VedaLoop is not configured on this server (VEDALOOP_WHATSAPP_API_KEY), so templates cannot be checked.</div>}
    <section className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>Template</th><th>Message</th><th>VedaLoop template</th><th>Status</th><th className="actions-col">Actions</th></tr></thead><tbody>{templates?.map((template) => {
      const issue = providerIssue(template)
      return <tr key={template.id}><td><b>{template.name}</b><small>{template.category} · order {template.sortOrder}</small></td><td className="wa-body-cell">{template.body}<small>Store fills: {template.variables.map((item) => item.label).join(', ') || 'nothing'}</small></td><td><code>{template.providerTemplate}</code><small>{template.language}{provider?.available ? issue ? <span className="field-error"> · {issue}</span> : ' · approved ✓' : ''}</small></td><td><Status value={template.status}/></td><td className="row-actions"><button onClick={() => setEditing(template)}>Edit</button></td></tr>
    })}</tbody></table>{templates && templates.length === 0 && <Empty title="No templates yet" text="Add a template that matches one approved at VedaLoop."/>}{!templates && !error && <div className="loading-bar">Loading…</div>}</div></section>
    {editing && <TemplateForm template={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void load() }}/>}
  </>
}

function TemplateForm({ template, onClose, onSaved }: { template?: WhatsAppTemplate; onClose: () => void; onSaved: () => void }) {
  const [values, setValues] = useState({ name: template?.name ?? '', category: template?.category ?? 'marketing', body: template?.body ?? 'Hi {{customer_name}}, ', providerTemplate: template?.providerTemplate ?? '', language: template?.language ?? 'en', status: template?.status ?? 1, sortOrder: template?.sortOrder ?? 100 })
  const [error, setError] = useState(''), [saving, setSaving] = useState(false)
  const keys = useMemo(() => keysOf(values.body), [values.body])
  const set = (key: keyof typeof values, value: string | number) => { setValues((current) => ({ ...current, [key]: value })); setError('') }
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true)
    try { await api.saveWhatsappTemplate(values, template?.id); onSaved() } catch (reason) { setError(errorText(reason)) } finally { setSaving(false) }
  }
  return <Modal title={template ? 'Edit WhatsApp template' : 'Add WhatsApp template'} onClose={onClose} wide><form onSubmit={submit} className="wa-template-form">
    {error && <div className="alert error">{error}</div>}
    <div className="wa-template-grid"><div>
      <div className="form-grid">
        <label><FieldLabel required>Name stores see</FieldLabel><input required maxLength={100} value={values.name} onChange={(e) => set('name', e.target.value)}/></label>
        <label><FieldLabel required>Category</FieldLabel><select value={values.category} onChange={(e) => set('category', e.target.value)}><option value="marketing">Marketing (offers, wishes)</option><option value="utility">Utility (thank-you, reminders)</option></select></label>
        <label className="span-2"><FieldLabel required>Message</FieldLabel><textarea required maxLength={1024} rows={5} value={values.body} onChange={(e) => set('body', e.target.value)}/><small className="client-field-help">Use {'{{customer_name}}'} and {'{{store_name}}'} (filled automatically) and your own blanks like {'{{offer_details}}'}. They are sent to VedaLoop in the order they first appear: {keys.length ? keys.map((key, index) => `{{${index + 1}}} = ${key}`).join(', ') : 'none yet'}.</small></label>
        <label><FieldLabel required>VedaLoop template name</FieldLabel><input required pattern="[a-z0-9_]+" value={values.providerTemplate} onChange={(e) => set('providerTemplate', e.target.value.trim())} placeholder="zenxpos_special_offer"/><small className="client-field-help">Exactly as approved in the VedaLoop console.</small></label>
        <label><FieldLabel required>Language</FieldLabel><input required value={values.language} onChange={(e) => set('language', e.target.value.trim())} placeholder="en"/></label>
        <label><FieldLabel>Order in picker</FieldLabel><input type="number" min={0} max={10000} value={values.sortOrder} onChange={(e) => set('sortOrder', Number(e.target.value))}/></label>
        <label><FieldLabel required>Status</FieldLabel><select value={values.status} onChange={(e) => set('status', Number(e.target.value))}><option value={1}>Active — stores can use it</option><option value={0}>Inactive — hidden</option></select></label>
      </div>
    </div><div><div className="section-help">Preview with sample values</div><WhatsAppBubble body={values.body}/></div></div>
    <div className="form-actions"><button type="button" className="button ghost" onClick={onClose}>Cancel</button><button className="button primary" disabled={saving}>{saving ? 'Saving…' : 'Save template'}</button></div>
  </form></Modal>
}

// Per-client WhatsApp usage, quota, price and wallet (opened from Client Management).
export function ClientWhatsAppModal({ clientId, businessName, onClose }: { clientId: string; businessName: string; onClose: () => void }) {
  const [data, setData] = useState<WhatsAppClientSettings>(), [form, setForm] = useState({ enabled: true, monthlyQuota: '0', price: '' }), [adjust, setAdjust] = useState({ amount: '', note: '' })
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [saving, setSaving] = useState(false)
  const apply = (next: WhatsAppClientSettings) => { setData(next); setForm({ enabled: next.enabled, monthlyQuota: String(next.monthlyQuota), price: next.price === null ? '' : next.price.toFixed(2) }) }
  useEffect(() => { void api.clientWhatsapp(clientId).then(apply).catch((reason) => setError(errorText(reason))) }, [clientId])
  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('')
    try { apply(await api.saveClientWhatsapp(clientId, { enabled: form.enabled, monthlyQuota: Number(form.monthlyQuota), price: form.price.trim() })); setNotice('WhatsApp settings saved.') } catch (reason) { setError(errorText(reason)) } finally { setSaving(false) }
  }
  async function credit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('')
    try { apply(await api.adjustClientWhatsappWallet(clientId, { amount: Number(adjust.amount), note: adjust.note })); setAdjust({ amount: '', note: '' }); setNotice('Wallet updated.') } catch (reason) { setError(errorText(reason)) } finally { setSaving(false) }
  }
  return <Modal title={`WhatsApp · ${businessName}`} onClose={onClose} wide>
    {error && <div className="alert error">{error}</div>}{notice && <div className="alert success">{notice}</div>}
    {!data && !error && <div className="loading-bar">Loading…</div>}
    {data && <>
      <div className="metric-grid"><div className="metric"><span>Free used · {data.month}</span><b>{data.freeUsed} / {data.monthlyQuota}</b></div><div className="metric"><span>Price per extra message</span><b>{rupees(data.effectivePrice)}</b><small>{data.price === null ? 'Platform default' : 'Client price'}</small></div><div className="metric"><span>Wallet balance</span><b>{rupees(data.wallet)}</b></div></div>
      <form className="form-section" onSubmit={save}><h3>Plan</h3><div className="form-grid thirds">
        <label className="checkbox-row"><input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })}/> WhatsApp messaging enabled</label>
        <label><FieldLabel required>Free messages per month</FieldLabel><input type="number" min={0} max={1000000} step={1} required value={form.monthlyQuota} onChange={(e) => setForm({ ...form, monthlyQuota: e.target.value })}/></label>
        <label><FieldLabel>Price per extra message (₹)</FieldLabel><input type="number" min={0.01} max={100} step={0.01} value={form.price} placeholder={`Default ${data.defaultPrice.toFixed(2)}`} onChange={(e) => setForm({ ...form, price: e.target.value })}/></label>
      </div><div className="form-actions"><button className="button primary" disabled={saving}>Save plan</button></div></form>
      <form className="form-section" onSubmit={credit}><h3>Wallet adjustment</h3><p className="section-help">Credit (e.g. a launch bonus) or debit (a correction) the store's WhatsApp wallet. Use a minus sign to debit. Recorded in the wallet history the store sees.</p><div className="form-grid thirds">
        <label><FieldLabel required>Amount (₹)</FieldLabel><input type="number" step={0.01} required value={adjust.amount} onChange={(e) => setAdjust({ ...adjust, amount: e.target.value })}/></label>
        <label className="span-2"><FieldLabel required>Reason</FieldLabel><input required minLength={3} maxLength={255} value={adjust.note} onChange={(e) => setAdjust({ ...adjust, note: e.target.value })}/></label>
      </div><div className="form-actions"><button className="button ghost" disabled={saving}>Apply to wallet</button></div></form>
      <div className="form-section"><h3>Recent wallet activity</h3><div className="table-wrap"><table><thead><tr><th>When</th><th>Type</th><th>Amount</th><th>Balance</th><th>Note</th></tr></thead><tbody>{data.transactions.map((row) => <tr key={row.id}><td>{new Date(row.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}</td><td>{row.type}</td><td>{rupees(row.amount)}</td><td>{rupees(row.balanceAfter)}</td><td>{row.note ?? '—'}</td></tr>)}</tbody></table>{data.transactions.length === 0 && <Empty title="No wallet activity" text="Top-ups, sends and refunds appear here."/>}</div></div>
    </>}
    <div className="form-actions"><button className="button ghost" onClick={onClose}>Close</button></div>
  </Modal>
}
