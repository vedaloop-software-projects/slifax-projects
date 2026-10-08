import { useEffect, useState } from 'react'
import { api } from '../api'
import { resources } from '../model'
import { Icon, PageHeader } from '../ui'

type Stats = { clients: number; active: number; businessTypes: number; features: number; admins: number }

export function Dashboard({ navigate }: { navigate: (route: string) => void }) {
  const [stats, setStats] = useState<Stats>({ clients: 0, active: 0, businessTypes: 0, features: 0, admins: 0 })
  const [error, setError] = useState('')
  useEffect(() => { void (async () => {
    try {
      const [clients, active, businessTypes, features, admins] = await Promise.all([
        api.listClients(), api.listClients({ status: 1 }), api.listResource(resources[0]), api.listResource(resources[1]), api.listResource(resources[3]),
      ])
      setStats({ clients: clients.meta.total, active: active.meta.total, businessTypes: businessTypes.meta.total, features: features.meta.total, admins: admins.meta.total })
    } catch (reason) { setError((reason as Error).message) }
  })() }, [])
  const cards = [
    ['clients', 'Total clients', stats.clients, 'Across every ZenxPOS product'], ['clients', 'Active clients', stats.active, `${Math.max(0, stats.clients - stats.active)} currently inactive`], ['settings', 'Business types', stats.businessTypes, 'Configured market verticals'], ['settings', 'Platform features', stats.features, 'Available capability groups'],
  ] as const
  return <>
    <PageHeader eyebrow="Overview" title="Good to see you." description="A live overview of your ZenxPOS platform and client network." actions={<button className="button primary" onClick={() => navigate('clients')}>+ Onboard client</button>} />
    {error && <div className="alert error">{error}</div>}
    <section className="metric-grid">{cards.map(([icon, label, value, hint]) => <article className="metric" key={label}><div className="metric-icon"><Icon name={icon}/></div><div className="metric-value">{value.toLocaleString('en-IN')}</div><strong>{label}</strong><span>{hint}</span></article>)}</section>
    <section className="dashboard-grid">
      <article className="panel spotlight"><div><span className="eyebrow light">Client operations</span><h2>Run the platform from one place.</h2><p>Onboard a business, assign its feature set, manage contracts and record collections without leaving the portal.</p></div><button onClick={() => navigate('clients')}>Open client management <span>→</span></button></article>
      <article className="panel quick"><div className="panel-title"><div><span className="eyebrow">Quick access</span><h2>Platform setup</h2></div><span className="count-badge">{stats.admins} admins</span></div>
        <div className="quick-list"><button onClick={() => navigate('business-types')}><span>Business types</span><b>{stats.businessTypes}</b></button><button onClick={() => navigate('features')}><span>Features & access</span><b>{stats.features}</b></button><button onClick={() => navigate('barcode-clients')}><span>Barcode clients</span><b>{stats.clients}</b></button></div>
      </article>
    </section>
  </>
}
