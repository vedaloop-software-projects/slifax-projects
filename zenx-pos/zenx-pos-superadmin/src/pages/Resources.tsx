import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { api, assetUrl } from '../api'
import type { Resource, Row } from '../model'
import { Empty, FieldLabel, Modal, PageHeader, Status } from '../ui'

type ResourceLookups = { businessTypes: Row[]; features: (Row & { subFeatures?: Row[] })[] }

export function ResourcePage({ resource }: { resource: Resource }) {
  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [parentFilter, setParentFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lookups, setLookups] = useState<ResourceLookups>()
  const [editing, setEditing] = useState<Row | 'new' | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await api.listResource(resource, {
        search_str: search, status, page,
        ...(resource.filter && parentFilter ? { [resource.filter.key]: parentFilter } : {}),
      })
      setRows(result.data)
      setTotal(result.meta.total)
      setPageSize(result.meta.pageSize)
      setError('')
    } catch (reason) { setError((reason as Error).message) }
    finally { setLoading(false) }
  }, [resource, search, status, parentFilter, page])

  useEffect(() => { const timer = setTimeout(() => void load(), search ? 250 : 0); return () => clearTimeout(timer) }, [load, search])
  useEffect(() => { if (resource.filter) void api.prerequisites().then(setLookups).catch((reason) => setError((reason as Error).message)) }, [resource])

  async function edit(row: Row) {
    try { setEditing(await api.getResource(resource, row.id)) }
    catch (reason) { setError((reason as Error).message) }
  }
  async function remove(row: Row) {
    if (!confirm(`Delete this ${resource.singular}? This action removes it from active use.`)) return
    try { await api.deleteResource(resource, row.id); await load() }
    catch (reason) { setError((reason as Error).message) }
  }
  function reset() {
    const alreadyClear = !search && !status && !parentFilter && page === 1
    setSearch(''); setStatus(''); setParentFilter(''); setPage(1)
    if (alreadyClear) void load()
  }

  return <>
    <PageHeader eyebrow="Configuration" title={resource.title} description={`Create and maintain ${resource.title.toLowerCase()} available across the ZenxPOS platform.`} actions={<button className="button primary" onClick={() => setEditing('new')}>+ Add {resource.singular}</button>} />
    {error && <div className="alert error">{error}</div>}
    <section className="panel table-panel">
      <div className="filters">
        <div className="search"><span>⌕</span><input placeholder={resource.searchPlaceholder} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }}/></div>
        <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}><option value="">All statuses</option><option value="1">Active</option><option value="2">Inactive</option></select>
        {resource.filter && <select value={parentFilter} onChange={(event) => { setParentFilter(event.target.value); setPage(1) }}><option value="">{resource.filter.label}</option>{lookupRows(resource.filter.parent, lookups).map((item) => <option key={item.id} value={item.id}>{lookupName(resource.filter!.parent, item)}</option>)}</select>}
        <button className="button ghost" onClick={reset}>↻ Reset</button>
      </div>
      <div className="table-wrap">
        <table><thead><tr>{resource.columns.map((column) => <th key={column.key}>{column.label}</th>)}<th className="actions-col">Actions</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}>{resource.columns.map((column) => <td key={column.key}>{column.key === 'status' || column.key === 'app_status' ? <Status value={row[column.key]}/> : column.key === 'file' ? <FormatFile path={row.file} type={row.file_type}/> : <Cell value={parentLabel(resource, column.key, row[column.key], lookups)}/>}</td>)}<td className="row-actions"><button onClick={() => void edit(row)}>Edit</button><button className="danger-link" onClick={() => void remove(row)}>Delete</button></td></tr>)}</tbody></table>
        {!loading && rows.length === 0 && <Empty title="No matching records" text="Change the filters or add the first record."/>}
        {loading && <div className="loading-bar">Loading records…</div>}
      </div>
      <Pagination page={page} total={total} pageSize={pageSize} onPage={setPage}/>
    </section>
    {editing && <ResourceForm resource={resource} row={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void load() }}/>} 
  </>
}

function ResourceForm({ resource, row, onClose, onSaved }: { resource: Resource; row?: Row; onClose: () => void; onSaved: () => void }) {
  const initial = useMemo(() => Object.fromEntries(resource.fields.map((field) => [field.key, row?.[field.key] ?? (field.kind === 'status' ? 1 : '')])), [resource, row])
  const [values, setValues] = useState<Record<string, unknown>>(initial)
  const [file, setFile] = useState<File>()
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [lookups, setLookups] = useState<ResourceLookups>()
  useEffect(() => { if (resource.fields.some((field) => field.kind === 'parent')) void api.prerequisites().then(setLookups).catch((reason) => setError((reason as Error).message)) }, [resource])

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('')
    try { await api.saveResource(resource, values, row?.id, file); onSaved() }
    catch (reason) { setError((reason as Error).message) }
    finally { setSaving(false) }
  }

  if (!row && resource.key === 'bill-formats') return <BillFormatCreate resource={resource} lookups={lookups} lookupError={error} onClose={onClose} onSaved={onSaved}/>
  return <Modal title={`${row ? 'Edit' : 'Add'} ${resource.singular}`} onClose={onClose}><form className="form-grid" onSubmit={submit}>{error && <div className="alert error span-2">{error}</div>}{resource.fields.map((field) => { const required = Boolean(field.required || (!row && (field.kind === 'password' || field.kind === 'file'))); return <label key={field.key} className={field.kind === 'file' ? 'span-2' : ''}><FieldLabel required={required}>{field.label}</FieldLabel>{field.kind === 'status' ? <select required={required} value={String(values[field.key])} onChange={(event) => setValues({ ...values, [field.key]: Number(event.target.value) })}><option value="1">Active</option><option value="0">Inactive</option></select> : field.kind === 'parent' ? <select required={required} value={String(values[field.key])} onChange={(event) => setValues({ ...values, [field.key]: Number(event.target.value) })}><option value="">Choose one</option>{(field.parent === 'features' ? lookups?.features : lookups?.businessTypes)?.map((item) => <option key={item.id} value={item.id}>{String(item.feature ?? item.display_name ?? item.business_type ?? item.id)}</option>)}</select> : field.kind === 'file' ? <input type="file" accept=".pdf,image/png,image/jpeg,image/webp" required={required} onChange={(event) => setFile(event.target.files?.[0])}/> : <input type={field.kind === 'password' ? 'password' : field.kind === 'number' ? 'number' : 'text'} required={required} min={field.kind === 'number' ? 1 : undefined} value={String(values[field.key] ?? '')} onChange={(event) => setValues({ ...values, [field.key]: field.kind === 'number' ? Number(event.target.value) : event.target.value })}/>}</label> })}<div className="form-actions span-2"><button type="button" className="button ghost" onClick={onClose}>Cancel</button><button className="button primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button></div></form></Modal>
}

type FormatDraft = { title: string; size: string; file?: File }
function BillFormatCreate({ resource, lookups, lookupError, onClose, onSaved }: { resource: Resource; lookups?: ResourceLookups; lookupError: string; onClose: () => void; onSaved: () => void }) {
  const [businessTypeId, setBusinessTypeId] = useState('')
  const [formats, setFormats] = useState<FormatDraft[]>([{ title: '', size: '' }])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const update = (index: number, value: Partial<FormatDraft>) => setFormats((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...value } : item))

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('')
    try {
      for (const format of formats) await api.saveResource(resource, { business_type_id: Number(businessTypeId), title: format.title, size: format.size, status: 1 }, undefined, format.file)
      onSaved()
    } catch (reason) { setError((reason as Error).message) }
    finally { setSaving(false) }
  }

  const shownError = error || lookupError
  return <Modal title="Add bill formats" onClose={onClose} wide><form onSubmit={submit}>{shownError && <div className="alert error">{shownError}</div>}<div className="form-grid"><label><FieldLabel required>Business type</FieldLabel><select required value={businessTypeId} onChange={(event) => setBusinessTypeId(event.target.value)}><option value="">Choose one</option>{lookups?.businessTypes.map((item) => <option key={item.id} value={item.id}>{String(item.display_name ?? item.business_type ?? item.id)}</option>)}</select></label></div><div className="format-drafts">{formats.map((format, index) => <div className="format-draft" key={index}><label><FieldLabel required>Title</FieldLabel><input required value={format.title} onChange={(event) => update(index, { title: event.target.value })}/></label><label><FieldLabel required>Paper size</FieldLabel><input required value={format.size} onChange={(event) => update(index, { size: event.target.value })}/></label><label><FieldLabel required>Image / PDF</FieldLabel><input type="file" required accept=".pdf,image/png,image/jpeg,image/webp" onChange={(event) => update(index, { file: event.target.files?.[0] })}/></label>{formats.length > 1 && <button type="button" className="button danger-link" onClick={() => setFormats((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>}</div>)}</div><div className="form-actions"><button type="button" className="button ghost" onClick={() => setFormats((current) => [...current, { title: '', size: '' }])}>+ Add another format</button><button type="button" className="button ghost" onClick={onClose}>Cancel</button><button className="button primary" disabled={saving || !lookups}>{saving ? 'Saving…' : `Save ${formats.length} format${formats.length === 1 ? '' : 's'}`}</button></div></form></Modal>
}

function Cell({ value }: { value: unknown }) { if (value === null || value === undefined || value === '') return <span className="muted">—</span>; return <>{String(value)}</> }
function FormatFile({ path, type }: { path: unknown; type: unknown }) { if (typeof path !== 'string' || !path) return <span className="muted">—</span>; const href=assetUrl(path); return <a className="format-file" href={href} target="_blank" rel="noreferrer">{type === 'pdf' ? <span>View PDF</span> : <img src={href} alt="Bill format preview"/>}</a> }
function lookupRows(parent: 'features' | 'businessTypes', lookups?: ResourceLookups) { return lookups?.[parent] ?? [] }
function lookupName(parent: 'features' | 'businessTypes', row: Row) { return String(parent === 'features' ? row.feature : row.display_name ?? row.business_type ?? row.id) }
function parentLabel(resource: Resource, key: string, value: unknown, lookups?: ResourceLookups) { const field = resource.fields.find((item) => item.key === key && item.kind === 'parent'); if (!field?.parent) return value; return lookupName(field.parent, lookupRows(field.parent, lookups).find((item) => String(item.id) === String(value)) ?? { id: String(value) }) }
export function Pagination({ page, total, pageSize, onPage }: { page: number; total: number; pageSize: number; onPage: (page: number) => void }) { const pages = Math.max(1, Math.ceil(total / pageSize)); return <footer className="pagination"><span>{total.toLocaleString('en-IN')} records</span><div><button disabled={page <= 1} onClick={() => onPage(page - 1)}>←</button><b>{page} / {pages}</b><button disabled={page >= pages} onClick={() => onPage(page + 1)}>→</button></div></footer> }
