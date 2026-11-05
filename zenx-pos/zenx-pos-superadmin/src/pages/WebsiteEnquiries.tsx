import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { api } from '../api'
import type { WebsiteEnquiry, WebsiteEnquiryStatus } from '../model'
import { Empty, Icon, PageHeader } from '../ui'
import { notifyWebsiteEnquiriesChanged } from '../website-enquiries-events'

const statusLabels: Record<WebsiteEnquiryStatus, string> = { new: 'New', in_progress: 'In progress', closed: 'Closed' }
const dateTime = (value: string | null) => value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
const errorMessage = (reason: unknown) => reason instanceof Error ? reason.message : 'Something went wrong. Please try again.'
type Filters = { type: WebsiteEnquiry['type'] | ''; status: WebsiteEnquiryStatus | ''; page: number }

export function WebsiteEnquiriesPage() {
  const [filters, setFilters] = useState<Filters>({ type: '', status: '', page: 1 })
  const [revision, setRevision] = useState(0)
  const [rows, setRows] = useState<WebsiteEnquiry[]>([])
  const [total, setTotal] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<WebsiteEnquiry | null>(null)
  const [reading, setReading] = useState(false)
  const [readError, setReadError] = useState('')
  const selection = useRef(0)
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  useEffect(() => {
    const controller = new AbortController()
    let changedPage = false
    api.websiteEnquiries(filters, controller.signal).then(result => {
      if (controller.signal.aborted) return
      const lastPage = Math.max(1, Math.ceil(result.meta.total / result.meta.pageSize))
      if (filters.page > lastPage) {
        changedPage = true
        setFilters(current => ({ ...current, page: lastPage }))
        return
      }
      setRows(result.data)
      setTotal(result.meta.total)
      setPageSize(result.meta.pageSize)
      setError('')
    }).catch(reason => { if (!controller.signal.aborted) setError(errorMessage(reason)) })
      .finally(() => { if (!controller.signal.aborted && !changedPage) setLoading(false) })
    return () => controller.abort()
  }, [filters, revision])

  function refresh() { setLoading(true); setError(''); setRevision(value => value + 1) }
  function changeFilters(next: Filters) { setLoading(true); setError(''); setFilters(next) }
  function closeDetail() { selection.current++; setSelected(null); setReading(false); setReadError('') }
  function updateRow(updated: WebsiteEnquiry) {
    if (!mounted.current) return
    setRows(current => current.map(row => row.id === updated.id ? updated : row))
    setSelected(current => current?.id === updated.id ? updated : current)
  }

  async function markRead(row: WebsiteEnquiry, request = selection.current) {
    if (row.readAt) return
    setReading(true)
    setReadError('')
    try {
      const updated = await api.readWebsiteEnquiry(row.id)
      updateRow(updated)
      notifyWebsiteEnquiriesChanged()
    } catch (reason) {
      if (mounted.current && selection.current === request) setReadError(errorMessage(reason))
    } finally {
      if (mounted.current && selection.current === request) setReading(false)
    }
  }

  function openDetail(row: WebsiteEnquiry) {
    const request = ++selection.current
    setSelected(row)
    setReadError('')
    setReading(false)
    if (!row.readAt) void markRead(row, request)
  }

  const pages = Math.max(1, Math.ceil(total / pageSize))
  return <>
    <PageHeader eyebrow="Website inbox" title="Website Enquiries" description="Quote requests and contact messages from the ZenxPOS website." actions={<button type="button" className="button ghost" onClick={refresh} disabled={loading}>Refresh inbox</button>} />
    <section className="panel table-panel enquiry-inbox" aria-label="Website enquiry inbox">
      <div className="filters enquiry-filters">
        <label>Enquiry type<select aria-label="Enquiry type" value={filters.type} onChange={event => changeFilters({ ...filters, type: event.target.value as Filters['type'], page: 1 })}><option value="">All types</option><option value="quote">Quote requests</option><option value="contact">Contact messages</option></select></label>
        <label>Enquiry status<select aria-label="Enquiry status" value={filters.status} onChange={event => changeFilters({ ...filters, status: event.target.value as Filters['status'], page: 1 })}><option value="">All statuses</option><option value="new">New</option><option value="in_progress">In progress</option><option value="closed">Closed</option></select></label>
        <p className="enquiry-inbox-count">{loading ? 'Loading enquiries…' : error ? 'Inbox could not be refreshed' : `${total.toLocaleString('en-IN')} ${total === 1 ? 'enquiry' : 'enquiries'}`}</p>
      </div>
      {error && <div className="alert error enquiry-load-error" role="alert"><span>{error}{rows.length > 0 && ' The displayed records may be out of date.'}</span><button type="button" className="button ghost" onClick={refresh}>Try again</button></div>}
      <div className="table-wrap" aria-busy={loading}>
        {loading && <div className="loading-bar" role="status">Loading enquiries…</div>}
        {rows.length > 0 && <table className="enquiries-table"><thead><tr><th scope="col">Enquiry</th><th scope="col">Business & contact</th><th scope="col">Subject</th><th scope="col">Received</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead><tbody>{rows.map(row => <tr key={row.id} className={!row.readAt ? 'enquiry-row--unread' : undefined}>
          <td><div className="enquiry-type-line">{!row.readAt && <span className="enquiry-unread"><span className="enquiry-sr-only">Unread</span></span>}<strong>{row.type === 'quote' ? 'Quote request' : 'Contact message'}</strong></div><span className="enquiry-cell-note">{row.selectedPlan ?? `#${row.id}`}</span></td>
          <td><strong>{row.businessName}</strong><span className="enquiry-cell-note">{row.contactPersonName}</span><span className="enquiry-cell-note">{row.email}</span></td>
          <td><span className="enquiry-subject-preview">{row.subject}</span><span className="enquiry-cell-note">{row.city ?? 'City not provided'}</span></td>
          <td><time dateTime={row.createdAt}>{dateTime(row.createdAt)}</time></td>
          <td><EnquiryStatus status={row.status} /></td>
          <td><button type="button" className="button ghost" onClick={() => openDetail(row)} aria-label={`View enquiry from ${row.contactPersonName} at ${row.businessName}`}>View enquiry</button></td>
        </tr>)}</tbody></table>}
        {!loading && !error && rows.length === 0 && <Empty title="No matching enquiries" text="New website enquiries will appear here. Try another type or status, or refresh the inbox." />}
      </div>
      <div className="enquiry-pagination"><span>{total ? `${(filters.page - 1) * pageSize + 1}–${Math.min(filters.page * pageSize, total)} of ${total}` : 'No records'}<span className="enquiry-page-number">Page {filters.page} of {pages}</span></span><div><button type="button" className="button ghost" disabled={loading || filters.page === 1} onClick={() => changeFilters({ ...filters, page: filters.page - 1 })}>Previous</button><button type="button" className="button ghost" disabled={loading || filters.page >= pages} onClick={() => changeFilters({ ...filters, page: filters.page + 1 })}>Next</button></div></div>
    </section>
    {selected && <EnquiryDetail key={selected.id} enquiry={selected} reading={reading} readError={readError} onClose={closeDetail} onRetryRead={() => void markRead(selected)} onSaved={updated => { updateRow(updated); refresh() }} />}
  </>
}

function EnquiryStatus({ status }: { status: WebsiteEnquiryStatus }) {
  return <span className={`enquiry-status enquiry-status--${status}`}>{statusLabels[status]}</span>
}

function DetailField({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return <div className={wide ? 'enquiry-detail-wide' : undefined}><dt>{label}</dt><dd>{children}</dd></div>
}

function EnquiryDetail({ enquiry, reading, readError, onClose, onRetryRead, onSaved }: { enquiry: WebsiteEnquiry; reading: boolean; readError: string; onClose: () => void; onRetryRead: () => void; onSaved: (row: WebsiteEnquiry) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [status, setStatus] = useState(enquiry.status)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => { dialog?.close() }
  }, [])

  async function save(event: FormEvent) {
    event.preventDefault()
    if (saving || reading || status === enquiry.status) return
    setSaving(true)
    setSaveError('')
    setSaved(false)
    try { const updated = await api.updateWebsiteEnquiryStatus(enquiry.id, status); onSaved(updated); setSaved(true) }
    catch (reason) { setSaveError(errorMessage(reason)) }
    finally { setSaving(false) }
  }

  const phone = `${enquiry.mobile.trim().startsWith('+') ? '+' : ''}${enquiry.mobile.replace(/\D/g, '')}`
  return <dialog ref={dialogRef} className="enquiry-dialog" aria-labelledby="enquiry-detail-title" onCancel={event => { event.preventDefault(); onClose() }} onClick={event => {
    if (event.target !== event.currentTarget) return
    const box = event.currentTarget.getBoundingClientRect()
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose()
  }}>
    <header className="enquiry-dialog-header"><div><span className="eyebrow">{enquiry.type === 'quote' ? 'Website quote request' : 'Website contact message'} · #{enquiry.id}</span><h2 id="enquiry-detail-title">{enquiry.businessName}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close enquiry">×</button></header>
    <div className="enquiry-dialog-body">
      {reading && <p className="enquiry-read-progress" role="status">Marking this enquiry as read…</p>}
      {readError && <div className="alert error enquiry-read-error" role="alert"><span>Could not confirm this enquiry as read. {readError}</span><button type="button" className="button ghost" onClick={onRetryRead} disabled={saving || reading}>Retry marking as read</button></div>}
      <div className="enquiry-detail-summary"><EnquiryStatus status={enquiry.status}/><span>{enquiry.readAt ? `Read ${dateTime(enquiry.readAt)}` : 'Unread'}</span></div>
      <dl className="enquiry-detail-fields">
        <DetailField label="Contact person">{enquiry.contactPersonName}</DetailField>
        <DetailField label="Business name">{enquiry.businessName}</DetailField>
        <DetailField label="Email"><a href={`mailto:${encodeURIComponent(enquiry.email)}`}>{enquiry.email}</a></DetailField>
        <DetailField label="Mobile"><a href={`tel:${phone}`}>{enquiry.mobile}</a></DetailField>
        <DetailField label="Business type">{enquiry.businessTypeName ?? 'Not provided'}{enquiry.businessTypeId && <small>Type ID: {enquiry.businessTypeId}</small>}</DetailField>
        <DetailField label="City">{enquiry.city ?? 'Not provided'}</DetailField>
        <DetailField label="Selected plan">{enquiry.selectedPlan ?? 'Not specified'}</DetailField>
        <DetailField label="Enquiry type">{enquiry.type === 'quote' ? 'Quote request' : 'Contact message'}</DetailField>
        <DetailField label="Received">{dateTime(enquiry.createdAt)}</DetailField>
        <DetailField label="Last updated">{dateTime(enquiry.updatedAt)}</DetailField>
        <DetailField label="Submission reference" wide>{enquiry.submissionId}</DetailField>
      </dl>
      <section className="enquiry-message-block" aria-labelledby="enquiry-message-title"><h3 id="enquiry-message-title">{enquiry.subject}</h3><p>{enquiry.message}</p></section>
      <form className="enquiry-status-form" onSubmit={save}>
        {saveError && <div className="alert error" role="alert">{saveError}</div>}
        {saved && <div className="alert success" role="status">Enquiry status updated.</div>}
        <div className="enquiry-status-actions"><label>Update status<select aria-label="Update status" value={status} disabled={saving || reading} onChange={event => { setStatus(event.target.value as WebsiteEnquiryStatus); setSaved(false) }}><option value="new">New</option><option value="in_progress">In progress</option><option value="closed">Closed</option></select></label><button type="submit" className="button primary" disabled={saving || reading || status === enquiry.status}>{saving ? 'Saving…' : 'Save status'}</button><button type="button" className="button ghost" onClick={onClose}>Close</button></div>
      </form>
      <p className="enquiry-detail-note"><Icon name="inbox" />These actions manage the inbox only. No message is sent to the enquirer.</p>
    </div>
  </dialog>
}
