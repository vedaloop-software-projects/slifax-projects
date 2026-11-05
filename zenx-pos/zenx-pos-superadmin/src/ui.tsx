import type { ReactNode } from 'react'

export function FieldLabel({ children, required = false }: { children: ReactNode; required?: boolean }) {
  return <span className="field-label">{children}<span className={required ? 'required-mark' : 'optional-mark'}>{required ? ' *' : ' (optional)'}</span></span>
}

export function Icon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    clients: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1v.1h-4v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1-.4h-.1v-4H3A1.7 1.7 0 0 0 4.6 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1v-.1h4V3A1.7 1.7 0 0 0 15.5 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.13.37.34.71.6 1 .27.28.62.42 1 .4h.1v4H21a1.7 1.7 0 0 0-1.6.6Z"/></>,
    money: <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h2"/></>,
    barcode: <><path d="M3 5v14M7 5v14M10 5v14M15 5v14M18 5v14M21 5v14"/></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    inbox: <><path d="m3 3-1 13h6l2 3h4l2-3h6L21 3H3Z"/><path d="M2 16v5h20v-5M7 7h10M7 11h7"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></>,
  }
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name] ?? paths.settings}</svg>
}

export function Status({ value }: { value: unknown }) {
  const active = Number(value) === 1 || value === 'ACTIVE'
  return <span className={`status ${active ? 'active' : 'inactive'}`}><i />{active ? 'Active' : 'Inactive'}</span>
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description: string; actions?: ReactNode }) {
  return <header className="page-header"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1><p>{description}</p></div>{actions && <div className="header-actions">{actions}</div>}</header>
}

export function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true"><header><div><span className="eyebrow">ZenxPOS control center</span><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close">×</button></header><div className="modal-body">{children}</div></section></div>
}

export function Empty({ title = 'Nothing here yet', text = 'Records will appear here once they are created.' }: { title?: string; text?: string }) {
  return <div className="empty"><div className="empty-mark">Z</div><strong>{title}</strong><span>{text}</span></div>
}
