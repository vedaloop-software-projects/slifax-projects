import { useEffect, useRef, useState } from 'react'
import { useBlocker } from 'react-router'
import { Alert, App, Button, Card, Input, Select, Tabs } from 'antd'
import { useDb } from '../mock/db'
import { useSession } from '../hooks/useSession'
import { fmtDateTime } from '../lib/dates'
import { BLOCKED_STEPS, agentSettings, autoPair, diagnoseUnreachable, localPrinters, queryNetworkPermission, saveAgentSettings, sendRawToQueue, type NetworkPermission } from './localAgent'
import { clearStationSetup, sameChoice, saveStationSetup, stationSetup, type StationChoice, type StationLanguage } from './station'

import { ProductPrnPicker } from './ProductPrnPicker'
// import { BatchesPage } from '../pages/BatchesPage'

/** `connectionOnly`: just pair this PC and map printers — what a regular user needs. */
export function LocalAgentSetup({ connectionOnly = false }: { connectionOnly?: boolean }) {
  const db = useDb()
  const { can, user } = useSession()
  const { message, modal } = App.useApp()
  const [settings, setSettings] = useState(agentSettings)
  const [names, setNames] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  // Printer setup for this PC: what users who sign in here print with from Barcode Printing.
  const [saved, setSaved] = useState(stationSetup)
  const blank = (): Partial<StationChoice> => ({ templateId: db.templates[0]?.id, dpi: 203, shopId: db.settings.defaultShopId })
  const [choice, setChoice] = useState<Partial<StationChoice>>(() => saved ?? blank())
  const set = (patch: Partial<StationChoice>) => setChoice((c) => ({ ...c, ...patch }))
  const complete = !!(choice.printerName && choice.templateId && db.templates.some((t) => t.id === choice.templateId) && choice.language && choice.dpi)
  const dirty = complete && !sameChoice(choice, saved)
  const target = choice.printerName
  const selectedTarget = target && names.includes(target) ? target : undefined
  const saveStation = () => {
    if (!complete) return
    setSaved(saveStationSetup(choice as StationChoice, user?.name ?? 'Admin'))
    message.success('Saved for this PC. Anyone who signs in here prints with these settings from Barcode Printing.')
  }
  const discardStation = () => setChoice(saved ?? blank())
  const removeStation = () => {
    clearStationSetup()
    setSaved(null)
    message.info('Printer setup removed from this PC. Users here cannot print until it is saved again.')
  }
  // Leaving the page with unsaved printer settings: ask whether to save them.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => !connectionOnly && dirty && currentLocation.pathname !== nextLocation.pathname)
  const latest = useRef({ saveStation })
  useEffect(() => {
    latest.current = { saveStation }
  })
  const asking = useRef(false)
  useEffect(() => {
    if (blocker.state !== 'blocked' || asking.current) return
    asking.current = true
    modal.confirm({
      title: 'Save the printer settings for this PC?',
      content: 'You changed the printer setup. Users who sign in on this PC print with the saved settings.',
      okText: 'Save',
      cancelText: "Don't save",
      onOk: () => { latest.current.saveStation(); asking.current = false; blocker.proceed() },
      onCancel: () => { asking.current = false; blocker.proceed() },
    })
  }, [blocker, modal])
  useEffect(() => {
    if (!dirty || connectionOnly) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, connectionOnly])
  const [permission, setPermission] = useState<NetworkPermission>('unknown')
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState('')
  const loadPrinters = async (token: string) => {
    const found = await localPrinters(token)
    const next = { ...agentSettings(), token }
    saveAgentSettings(next)
    setSettings(next)
    setNames(found)
    setStatus(`Connected to the print agent. ${found.length} Windows printers found; printer readiness is not verified.`)
  }
  const connect = async () => {
    setBusy(true)
    try {
      // A typed key wins; otherwise ask the agent for it (auto-connect).
      const token = settings.token.trim() || (await autoPair())
      if (!token) throw new Error(await diagnoseUnreachable((await queryNetworkPermission()).state))
      await loadPrinters(token)
    } catch (e) {
      setNames([])
      setStatus('')
      message.error((e as Error).message)
    }
    finally { setBusy(false) }
  }
  // Connect by itself: when the page opens, as soon as staff click Allow on the browser's
  // local network prompt, and when they come back to this tab (agent started meanwhile).
  // Nobody should have to paste a key or reload.
  const connected = useRef(false)
  useEffect(() => {
    connected.current = names.length > 0
  }, [names])
  useEffect(() => {
    let alive = true
    let running = false
    const autoConnect = async () => {
      if (running || connected.current) return
      running = true
      try {
        const token = agentSettings().token || (await autoPair())
        if (token && alive) await loadPrinters(token)
      } catch {
        /* agent not reachable yet; the Connect / refresh button explains why */
      } finally {
        running = false
      }
    }
    let watched: PermissionStatus[] = []
    const onChange = async () => {
      const { state } = await queryNetworkPermission()
      if (!alive) return
      setPermission(state)
      if (state === 'granted') void autoConnect()
    }
    const onFocus = () => { if (document.visibilityState === 'visible') void autoConnect() }
    queryNetworkPermission().then(({ state, statuses }) => {
      if (!alive) return
      setPermission(state)
      watched = statuses
      for (const status of watched) status.addEventListener('change', onChange)
    })
    void autoConnect()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      alive = false
      for (const status of watched) status.removeEventListener('change', onChange)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [])
  const printFile = async () => {
    if (!can('print') || !file || !selectedTarget) return
    setBusy(true)
    try {
      if (file.size > 4 * 1024 * 1024) throw new Error('PRN files must be at most 4 MB.')
      const result = await sendRawToQueue(selectedTarget, new Uint8Array(await file.arrayBuffer()))
      setStatus(`File submitted unchanged. Windows job ${result.spoolJobId}. Check the printer for completion.`)
    } catch (e) { message.error((e as Error).message) }
    finally { setBusy(false) }
  }
  return <Card title={connectionOnly ? 'Connect this PC to the label printer' : 'Direct PRN printing on this PC'} className="mb-5!">
    {can('printers.manage') ? (
      <p><a href="/downloads/ProductLabelPrintAgent.exe" download>Download Windows installer</a>. Open it and click Install and connect on the printer PC. No Python installation needed. Pair this website: <b>{location.origin}</b>. It starts automatically at Windows sign-in.</p>
    ) : (
      // Regular users never install software: an admin sets up each printer PC once.
      <p>Paste the connection key your admin gave you for this PC and click Connect / refresh. If this PC has not been set up for printing yet, ask your admin.</p>
    )}
    <div className="flex gap-2 mb-3">
      <Input.Password aria-label="Agent pairing key" placeholder="Connection key copied from the installer" value={settings.token} onChange={(e) => { setSettings({ ...settings, token: e.target.value }); setNames([]); setStatus('') }} />
      <Button loading={busy} onClick={connect}>Connect / refresh</Button>
    </div>
    {permission === 'denied' && <Alert className="mb-3!" type="warning" showIcon title="Local network access is blocked" description={BLOCKED_STEPS} />}
    {permission === 'prompt' && !names.length && (
      <Alert className="mb-3!" type="info" showIcon title='When you click Connect / refresh, your browser asks to allow access to devices on your local network. Choose "Allow". It is asked only once for this website.' />
    )}
    {status && <Alert className="mb-3!" type="info" title={status} />}
    {db.printers.map((p) => <div key={p.id} className="grid sm:grid-cols-2 gap-2 mb-2">
      <span>{p.name} ({p.language})</span>
      <Select aria-label={`Windows queue for ${p.name}`} placeholder="Select the installed Windows printer" value={settings.printers[p.id]} disabled={!names.length || busy} options={names.map((name) => ({ value: name, label: name }))} onChange={(name) => {
        const next = { ...settings, printers: { ...settings.printers, [p.id]: name } }
        setSettings(next)
        saveAgentSettings(next)
      }} />
    </div>)}
    {!!db.printers.length && <p className="text-muted text-[12px]">Mappings are saved on this browser and PC. Select the language supported by the printer in its profile. RAW printing bypasses browser scaling and orientation; label dimensions and media settings come from the PRN and printer.</p>}
    {!connectionOnly && <div className="border-t border-line pt-3 mt-3">
      <div className="mb-1 text-[15px] font-semibold">Printer setup for this PC</div>
      <p className="mt-0 mb-3 text-[12px] text-muted">Users who sign in on this PC print with these settings when they click Print in Barcode Printing. They do not see Printers &amp; Templates.</p>
      <div className="mb-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <label className="text-[13px] font-medium">Windows printer<Select className="mt-1 w-full" aria-label="Windows printer for this PC" placeholder={names.length ? 'Select Windows printer' : 'Connect to load Windows printers'} value={target} onChange={(printerName: string) => set({ printerName })} disabled={!names.length || busy} options={names.map((name) => ({ value: name, label: name }))} /></label>
        <label className="text-[13px] font-medium">Label template<Select className="mt-1 w-full" aria-label="Label template" value={db.templates.some((t) => t.id === choice.templateId) ? choice.templateId : undefined} placeholder="Select label template" disabled={busy} onChange={(templateId: string) => set({ templateId })} options={db.templates.map((t) => ({ value: t.id, label: `${t.name} - ${t.widthMm} × ${t.heightMm} mm, ${t.columns} across` }))} /></label>
        <label className="text-[13px] font-medium">Printer command language<Select className="mt-1 w-full" aria-label="Printer command language" placeholder="Select supported language" value={choice.language} disabled={busy} onChange={(language: StationLanguage) => set({ language })} options={[{ value: 'TSPL', label: 'TSPL (TSC / TVS)' }, { value: 'ZPL', label: 'ZPL (Zebra)' }]} /></label>
        <label className="text-[13px] font-medium">Printer resolution<Select className="mt-1 w-full" aria-label="Printer resolution" value={choice.dpi} disabled={busy} onChange={(dpi: 203 | 300) => set({ dpi })} options={[{ value: 203, label: '203 DPI' }, { value: 300, label: '300 DPI' }]} /></label>
        <label className="text-[13px] font-medium">Shop on labels<Select className="mt-1 w-full" aria-label="Shop name and location printed on labels" value={choice.shopId ?? db.settings.defaultShopId} disabled={busy} onChange={(shopId: string) => set({ shopId })} options={db.shops.map((s) => ({ value: s.id, label: `${s.name} - ${s.location}` }))} /></label>
      </div>
      {dirty ? (
        <Alert
          className="mb-3!"
          type="warning"
          showIcon
          title="Save these printer settings for this PC?"
          description="Until you save, users on this PC keep printing with the previous settings."
          action={<div className="flex flex-col gap-1.5"><Button type="primary" size="small" onClick={saveStation}>Save for this PC</Button><Button size="small" onClick={discardStation}>Discard</Button></div>}
        />
      ) : saved ? (
        <Alert
          className="mb-3!"
          type="success"
          showIcon
          title={`Saved for this PC: ${saved.printerName} · ${db.templates.find((t) => t.id === saved.templateId)?.name ?? 'template removed'} · ${saved.language} ${saved.dpi} DPI · ${db.shops.find((s) => s.id === (saved.shopId ?? db.settings.defaultShopId))?.location ?? ''}`}
          description={`Saved ${fmtDateTime(saved.savedAt)} by ${saved.savedBy}. Users print with it from Barcode Printing.`}
          action={<Button size="small" type="text" danger onClick={removeStation}>Remove</Button>}
        />
      ) : (
        <Alert className="mb-3!" type="info" showIcon title="Not saved on this PC yet. Choose the printer, template and language, then save them so users here can print." />
      )}
      {saved && names.length > 0 && !names.includes(saved.printerName) && (
        <Alert className="mb-3!" type="error" showIcon title={`The saved printer "${saved.printerName}" is not installed on this PC. Choose another printer and save.`} />
      )}
      {saved && !db.templates.some((t) => t.id === saved.templateId) && (
        <Alert className="mb-3!" type="error" showIcon title="The label template saved for this PC was deleted. Choose another template and save." />
      )}
      <Tabs defaultActiveKey="product" items={[
        { key: 'product', label: 'Selected products', children: <ProductPrnPicker target={selectedTarget} templateId={choice.templateId} language={choice.language} dpi={choice.dpi ?? 203} busy={busy} setBusy={setBusy} onSubmitted={setStatus} /> },
        // Hidden for now: batches are not used in printing.
        // { key: 'batches', label: 'Batches', children: <BatchesPage /> },
        { key: 'file', label: 'Upload PRN file', children: <>
      <p className="text-[12px] text-muted">Send an existing, working PRN file unchanged.</p>
      <div className="flex flex-wrap gap-2 mt-2">
        <input aria-label="PRN file" type="file" accept=".prn" disabled={busy} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <Button disabled={!can('print') || !file || !selectedTarget || busy} loading={busy} onClick={printFile}>Print PRN file</Button>
      </div>
      <div className="mt-2 text-[12px] text-muted" role="status">
        {!can('print') ? 'Your account does not have printing permission.' : !names.length ? 'Click Connect / refresh to load the installed printers.' : !selectedTarget ? 'Select a Windows printer above.' : !file ? 'Choose your .prn file to enable printing.' : ''}
      </div>
        </> },
      ]} />
    </div>}
  </Card>
}
