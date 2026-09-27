import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import { App as AntApp, AutoComplete, Avatar, Badge, Button, Drawer, Dropdown, Grid, Input, Layout, Menu, Tag, Tooltip } from 'antd'
import type { MenuProps } from 'antd'
import {
  AppstoreOutlined,
  AuditOutlined,
  BarChartOutlined,
  BarcodeOutlined,
  DashboardOutlined,
  DownOutlined,
  InboxOutlined,
  LayoutOutlined,
  LogoutOutlined,
  MenuOutlined,
  PrinterOutlined,
  QrcodeOutlined,
  SearchOutlined,
  SettingOutlined,
  TagsOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import { useDb } from '../mock/db'
import { useSession } from '../hooks/useSession'
import { auth } from '../api'
import { ROLE_META, type Permission } from '../lib/permissions'
import { BrandMark } from './BrandMark'
import { ScanListener } from './ScanListener'

const { Sider, Header, Content } = Layout

interface NavItem {
  key: string
  label: string
  icon: ReactNode
  perm?: Permission | Permission[]
  badge?: number
}

export function AppLayout() {
  const db = useDb()
  const { user, can } = useSession()
  const location = useLocation()
  const navigate = useNavigate()
  const { message } = AntApp.useApp()
  const screens = Grid.useBreakpoint()
  // useBreakpoint() is empty on first render — assume desktop until told otherwise
  const isMobile = screens.lg === false
  const [drawer, setDrawer] = useState(false)
  const [search, setSearch] = useState('')
  const clearSearch = useCallback(() => setSearch(''), [])

  const queueCount = db.queue.reduce((a, q) => a + q.quantity, 0)
  const activeJobs = db.printJobs.filter((j) => !j.finishedAt).length

  const groups: { title: string | null; items: NavItem[] }[] = [
    { title: null, items: [{ key: '/dashboard', label: 'Dashboard', icon: <DashboardOutlined /> }] },
    {
      title: 'Operations',
      items: [
        { key: '/products', label: 'Products', icon: <AppstoreOutlined />, perm: 'products.view' },
        { key: '/batches', label: 'Batches', icon: <InboxOutlined />, perm: 'products.view' },
        { key: '/labels', label: 'Print Labels', icon: <TagsOutlined />, perm: 'print' },
        { key: '/queue', label: 'Print Queue', icon: <UnorderedListOutlined />, badge: queueCount + activeJobs },
      ],
    },
    {
      title: 'Configuration',
      items: [
        { key: '/printers', label: 'Printers', icon: <PrinterOutlined /> },
        { key: '/templates', label: 'Templates', icon: <LayoutOutlined />, perm: 'templates.manage' },
      ],
    },
    { title: 'Identity', items: [{ key: '/identity', label: 'QR / Barcodes', icon: <QrcodeOutlined />, perm: 'products.view' }] },
    {
      title: 'Intelligence',
      items: [
        { key: '/analytics', label: 'Analytics', icon: <BarChartOutlined />, perm: ['analytics.basic', 'analytics.full'] },
        { key: '/audit', label: 'Audit Logs', icon: <AuditOutlined />, perm: 'audit.view' },
      ],
    },
    { title: null, items: [{ key: '/settings', label: 'Settings', icon: <SettingOutlined />, perm: ['settings.manage', 'users.manage'] }] },
  ]

  const allowed = (perm?: Permission | Permission[]) => !perm || (Array.isArray(perm) ? perm.some(can) : can(perm))

  const menuItems: MenuProps['items'] = groups.flatMap((g): NonNullable<MenuProps['items']> => {
    const items = g.items.filter((i) => allowed(i.perm))
    if (!items.length) return []
    const mapped = items.map((i) => ({
      key: i.key,
      icon: i.icon,
      label: (
        <span className="flex items-center justify-between">
          {i.label}
          {!!i.badge && <Badge count={i.badge} size="small" overflowCount={999} style={{ background: '#34D399', color: '#0C1F18', boxShadow: 'none', fontWeight: 700 }} />}
        </span>
      ),
    }))
    return g.title ? [{ type: 'group' as const, key: g.title, label: <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/35">{g.title}</span>, children: mapped }] : mapped
  })

  const selected = '/' + location.pathname.split('/')[1]

  const searchOptions = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return db.products
      .filter((p) => p.name.toLowerCase().includes(q) || p.productCode.includes(q) || p.eanCode?.includes(q) || p.globalId.toLowerCase().includes(q))
      .slice(0, 8)
      .map((p) => ({
        value: p.id,
        label: (
          <div className="flex items-center justify-between gap-3 py-0.5">
            <div className="min-w-0">
              <div className="truncate font-medium">{p.name}</div>
              <div className="font-mono text-[11px] text-muted">{p.productCode}</div>
            </div>
            <span className="text-[12px] text-muted">₹{p.salePrice}</span>
          </div>
        ),
      }))
  }, [search, db.products])

  const logout = async () => {
    await auth.logout()
    message.success('Signed out')
    navigate('/login', { replace: true })
  }

  const userMenu: MenuProps['items'] = [
    { key: 'who', label: <div className="py-1"><div className="font-semibold">{user?.name}</div><div className="text-[12px] text-muted">{user?.email}</div></div>, disabled: true },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Sign out', danger: true, onClick: logout },
  ]

  const nav = (
    <div className="flex h-full flex-col">
      <Link to="/dashboard" className="flex h-16 shrink-0 items-center gap-2.5 px-5" onClick={() => setDrawer(false)}>
        <BrandMark size={32} />
        <div className="leading-tight">
          <div className="text-[15px] font-bold tracking-tight text-white">Smart Label</div>
          <div className="text-[11px] text-white/45">Label &amp; Traceability</div>
        </div>
      </Link>
      <div className="sider-scroll flex-1 overflow-y-auto pb-4">
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selected]}
          items={menuItems}
          onClick={(e) => {
            navigate(e.key)
            setDrawer(false)
          }}
          className="border-none!"
        />
      </div>

    </div>
  )

  return (
    <Layout className="min-h-screen">
      {isMobile ? (
        <Drawer open={drawer} onClose={() => setDrawer(false)} placement="left" size={260} styles={{ body: { padding: 0, background: '#0C1F18' }, header: { display: 'none' } }}>
          {nav}
        </Drawer>
      ) : (
        <Sider width={248} className="fixed! inset-y-0 left-0 z-20 h-screen">
          {nav}
        </Sider>
      )}
      <Layout style={{ marginLeft: isMobile ? 0 : 248 }}>
        <Header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line/80 bg-white/85! backdrop-blur-md">
          {isMobile && <Button type="text" icon={<MenuOutlined />} onClick={() => setDrawer(true)} aria-label="Open menu" />}
          <AutoComplete
            className="w-full max-w-[420px]"
            options={searchOptions}
            value={search}
            onSearch={setSearch}
            onSelect={(id: string) => {
              setSearch('')
              navigate(`/products/${id}`)
            }}
          >
            <Input prefix={<SearchOutlined className="text-muted" />} placeholder="Search products, codes, EAN, global ID…" allowClear variant="filled" data-scan-search />
          </AutoComplete>
          <div className="ml-auto flex items-center gap-2">
            {can('print') && (
              <Tooltip title="Print queue">
                <Badge count={queueCount} size="small" overflowCount={999} offset={[-4, 4]}>
                  <Button type="text" shape="circle" icon={<BarcodeOutlined />} onClick={() => navigate('/queue')} aria-label="Print queue" />
                </Badge>
              </Tooltip>
            )}
            <Dropdown menu={{ items: userMenu }} trigger={['click']} placement="bottomRight">
              <button className="flex cursor-pointer items-center gap-2 rounded-full border-0 bg-transparent py-1 pr-2 pl-1 transition-colors hover:bg-black/4">
                <Avatar size={32} style={{ background: '#0E8A5F', fontWeight: 600 }}>
                  {user?.name.split(' ').map((s) => s[0]).slice(0, 2).join('')}
                </Avatar>
                {!isMobile && (
                  <span className="text-left leading-tight">
                    <span className="block text-[13px] font-semibold text-ink">{user?.name}</span>
                    {user && <Tag color={ROLE_META[user.role].color} variant="filled" className="m-0! px-1.5! text-[10px]! leading-4!">{user.role}</Tag>}
                  </span>
                )}
                <DownOutlined className="text-[10px] text-muted" />
              </button>
            </Dropdown>
          </div>
        </Header>
        <Content className="p-4 sm:p-6 lg:p-8">
          <div key={location.pathname} className="page-enter mx-auto max-w-[1440px]">
            <Outlet />
          </div>
        </Content>
        <ScanListener onScan={clearSearch} />
      </Layout>
    </Layout>
  )
}
