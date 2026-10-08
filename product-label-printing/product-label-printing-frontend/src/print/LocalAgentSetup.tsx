import { useEffect, useState } from 'react'
import { Alert, App, Button, Card, Input, Select, Tabs } from 'antd'
import { useDb } from '../mock/db'
import { useSession } from '../hooks/useSession'
import { BLOCKED_STEPS, agentSettings, autoPair, localPrinters, queryNetworkPermission, saveAgentSettings, sendRawToQueue, type NetworkPermission } from './localAgent'

import { ProductPrnPicker } from './ProductPrnPicker'
// import { BatchesPage } from '../pages/BatchesPage'

/** `connectionOnly`: just pair this PC and map printers — what a regular user needs. */
export function LocalAgentSetup({ connectionOnly = false }: { connectionOnly?: boolean }) {
  const db = useDb()
  const { can } = useSession()
  const { message } = App.useApp()
  const [settings, setSettings] = useState(agentSettings)
  const [names, setNames] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [target, setTarget] = useState<string>()
  const selectedTarget = target && names.includes(target) ? target : undefined
  // The browser's one-time "local network" permission; watched live so the hint updates as
  // soon as staff click Allow (or Block).
  const [permission, setPermission] = useState<NetworkPermission>('unknown')
  useEffect(() => {
    let alive = true
    let watched: PermissionStatus | null = null
    const onChange = () => watched && setPermission(watched.state as NetworkPermission)
    queryNetworkPermission().then(({ state, status }) => {
      if (!alive) return
      setPermission(state)
      watched = status
      watched?.addEventListener('change', onChange)
    })
    return () => {
      alive = false
      watched?.removeEventListener('change', onChange)
    }
  }, [])
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState('')
  const loadPrinters = async (token: string) => {
    const found = await localPrinters(token)
    const next = { ...agentSettings(), token }
    saveAgentSettings(next)
    setSettings(next)
    setNames(found)
    setTarget((previous) => previous && found.includes(previous) ? previous : undefined)
    setStatus(`Connected to the print agent. ${found.length} Windows printers found; printer readiness is not verified.`)
  }
  const connect = async () => {
    setBusy(true)
    try {
      // A typed key wins; otherwise ask the agent for it (auto-connect).
      const token = settings.token.trim() || (await autoPair())
      if (!token) throw new Error('Could not connect automatically. Make sure the print agent is installed on this PC, or paste its connection key.')
      await loadPrinters(token)
    } catch (e) {
      setNames([])
      setStatus('')
      message.error((e as Error).message)
    }
    finally { setBusy(false) }
  }
  // Connect by itself when the page opens: nobody should have to paste a key.
  useEffect(() => {
    let alive = true
    ;(async () => {
      const token = agentSettings().token || (await autoPair())
      if (!token || !alive) return
      try {
        await loadPrinters(token)
      } catch {
        /* agent not reachable yet; the Connect / refresh button explains why */
      }
    })()
    return () => {
      alive = false
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
      <div className="mb-3"><Select className="min-w-[280px]" aria-label="Windows printer for direct printing" placeholder={names.length ? "Select Windows printer" : "Connect to load Windows printers"} value={selectedTarget} onChange={setTarget} disabled={!names.length || busy} options={names.map((name) => ({ value: name, label: name }))} /></div>
      <Tabs defaultActiveKey="product" items={[
        { key: 'product', label: 'Selected products', children: <ProductPrnPicker target={selectedTarget} busy={busy} setBusy={setBusy} onSubmitted={setStatus} /> },
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
