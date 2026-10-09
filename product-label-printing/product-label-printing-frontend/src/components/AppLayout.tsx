import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import { App as AntApp, AutoComplete, Avatar, Badge, Button, Drawer, Dropdown, Grid, Input, Layout, Menu, Tag } from 'antd'
import type { MenuProps } from 'antd'
import {
  AuditOutlined,
  DashboardOutlined,
  DownOutlined,
  LogoutOutlined,
  MenuOutlined,
  PrinterOutlined,
  SearchOutlined,
  TagsOutlined,
  TeamOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import { useDb } from '../mock/db'
import { useSession } from '../hooks/useSession'
import { auth, printLogs } from '../api'
import { hasPreviousDayLogs, syncPrintLogs } from '../lib/printLog'
import { ROLE_META, homePath, type Permission } from '../lib/permissions'
import { ScanListener } from './ScanListener'
import { ZenxLogo } from './ZenxLogo'

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

  // End-of-day print analytics: records from earlier days are sent on the first check of a
  // new day (and at midnight if the app stays open). Today's records go at logout.
  const syncing = useRef(false)
  useEffect(() => {
    if (!user || user.role === 'SUPER_ADMIN') return
    const check = () => {
      if (syncing.current || !hasPreviousDayLogs(user.id)) return
      syncing.current = true
      syncPrintLogs(printLogs.send, { onlyBeforeToday: true })
        .catch(() => 0) // offline or server down: kept in the outbox, retried on the next check
        .finally(() => {
          syncing.current = false
        })
    }
    check()
    const timer = setInterval(check, 10 * 60 * 1000)
    return () => clearInterval(timer)
  }, [user])

  // One short menu per role. Regular users get only what printing needs.
  const groups: { title: string | null; items: NavItem[] }[] =
    user?.role === 'SUPER_ADMIN'
      ? [{ title: 'Super Admin', items: [{ key: '/clients', label: 'Clients', icon: <TeamOutlined />, perm: 'clients.manage' }] }]
      : user?.role === 'ADMIN'
        ? [
            { title: 'Main', items: [{ key: '/dashboard', label: 'Dashboard', icon: <DashboardOutlined /> }] },
            { title: 'Operations', items: [{ key: '/labels', label: 'Barcode Printing', icon: <TagsOutlined />, perm: 'print' }] },
            { title: 'Configuration', items: [{ key: '/printers', label: 'Printers & Templates', icon: <PrinterOutlined /> }] },
            // Hidden for now:
            // { title: 'Insights', items: [{ key: '/analytics', label: 'Printing Analytics', icon: <BarChartOutlined />, perm: ['analytics.basic', 'analytics.full'] }] },
            {
              title: 'History',
              items: [
                { key: '/print-history', label: 'Print History', icon: <UnorderedListOutlined /> },
                { key: '/audit', label: 'Audit Logs', icon: <AuditOutlined />, perm: 'audit.view' },
              ],
            },
            // Hidden for now — users, organisation settings and company profile are super-admin areas:
            // {
            //   title: 'Settings',
            //   items: [
            //     { key: '/company-profile', label: 'Company Profile', icon: <AppstoreOutlined />, perm: 'settings.manage' },
            //     { key: '/settings', label: 'Settings', icon: <SettingOutlined />, perm: ['settings.manage', 'users.manage'] },
            //   ],
            // },
          ]
        : [
            {
              title: null,
              items: [
                { key: '/dashboard', label: 'Dashboard', icon: <DashboardOutlined /> },
                { key: '/labels', label: 'Barcode Printing', icon: <TagsOutlined />, perm: 'print' },
                // Hidden: an admin saves the printer on each PC; users just print.
                // { key: '/printers', label: 'Printer Connection', icon: <PrinterOutlined /> },
                { key: '/print-history', label: 'My Print History', icon: <UnorderedListOutlined /> },
              ],
            },
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
    { key: 'who', label: <div className="py-1"><div className="font-semibold">{user?.name}</div><div className="text-[12px] text-muted">{user?.email || user?.mobile}</div>{user?.businessName && <div className="text-[12px] text-muted">{user.businessName}</div>}</div>, disabled: true },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Sign out', danger: true, onClick: logout },
  ]

  const nav = (
    <div className="flex h-full flex-col">
      <Link to={homePath(user?.role)} className="flex h-28 shrink-0 items-center px-5" onClick={() => setDrawer(false)}>
        <ZenxLogo variant="light" height={38} />
      </Link>
      <div className="sider-scroll flex-1 overflow-y-auto pt-5 pb-4">
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
        <Drawer open={drawer} onClose={() => setDrawer(false)} placement="left" size={260} styles={{ body: { padding: 0, background: '#101A2D' }, header: { display: 'none' } }}>
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
          {can('products.view') && <AutoComplete
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
          </AutoComplete>}
          <div className="ml-auto flex items-center gap-2">
            <Dropdown menu={{ items: userMenu }} trigger={['click']} placement="bottomRight">
              <button className="flex cursor-pointer items-center gap-2 rounded-full border-0 bg-transparent py-1 pr-2 pl-1 transition-colors hover:bg-black/4">
                <Avatar size={32} style={{ background: '#2563EB', fontWeight: 600 }}>
                  {user?.name.split(' ').map((s) => s[0]).slice(0, 2).join('')}
                </Avatar>
                {!isMobile && (
                  <span className="text-left leading-tight">
                    <span className="block text-[13px] font-semibold text-ink">{user?.name}</span>
                    {user && <Tag color={ROLE_META[user.role].color} variant="filled" className="m-0! px-1.5! text-[10px]! leading-4!">{ROLE_META[user.role].label}</Tag>}
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
        {user?.role !== 'SUPER_ADMIN' && <ScanListener onScan={clearSearch} />}
      </Layout>
    </Layout>
  )
}
