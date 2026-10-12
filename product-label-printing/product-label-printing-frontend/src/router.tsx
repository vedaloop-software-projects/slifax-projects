import { Navigate, createBrowserRouter } from 'react-router'
import { AppLayout } from './components/AppLayout'
import { ClientOnly, Guard, GuestOnly, NotFound, RequireAuth, RoleHome } from './components/guards'
import { LoginPage } from './pages/auth/LoginPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProductDetailPage } from './pages/products/ProductDetailPage'
import { PrintLabelsPage } from './pages/print/PrintLabelsPage'
import { PrintersPage } from './pages/PrintersPage'
// import { AnalyticsPage } from './pages/AnalyticsPage'
import { AuditPage } from './pages/AuditPage'
// import { SettingsPage } from './pages/SettingsPage'
import { PublicProductPage } from './pages/PublicProductPage'
import { PrintHistoryPage } from './pages/AccountPages'
// import { CompanyProfilePage } from './pages/AccountPages'

export const router = createBrowserRouter([
  { path: '/login', element: <GuestOnly><LoginPage /></GuestOnly> },
  { path: '/forgot-password', element: <GuestOnly><ForgotPasswordPage /></GuestOnly> },
  // Public resolver page (§7, §24) — no auth, reached by scanning a label's QR.
  { path: '/q/:qrId', element: <PublicProductPage /> },
  {
    path: '/',
    element: <RequireAuth><AppLayout /></RequireAuth>,
    children: [
      { index: true, element: <RoleHome /> },

      // Client workspace (admin + user)
      { path: 'dashboard', element: <ClientOnly><DashboardPage /></ClientOnly> },
      { path: 'labels', element: <Guard perm="print"><PrintLabelsPage /></Guard> },
      { path: 'printers', element: <ClientOnly><PrintersPage /></ClientOnly> },
      { path: 'print-history', element: <ClientOnly><PrintHistoryPage /></ClientOnly> },
      { path: 'products/:id', element: <Guard perm="products.view"><ProductDetailPage /></Guard> },

      // Admin
      { path: 'audit', element: <Guard perm="audit.view"><AuditPage /></Guard> },
      // Hidden for now (menu entries are commented out in AppLayout):
      // { path: 'analytics', element: <Guard perm={['analytics.basic', 'analytics.full']}><AnalyticsPage /></Guard> },
      // { path: 'company-profile', element: <Guard perm="settings.manage"><CompanyProfilePage /></Guard> },
      // { path: 'settings', element: <Guard perm={['settings.manage', 'users.manage']}><SettingsPage /></Guard> },

      // Old links: Templates now lives inside Printers; Printer Settings and Products were removed.
      { path: 'templates', element: <Navigate to="/printers?tab=templates" replace /> },
      { path: 'printer-settings', element: <Navigate to="/printers" replace /> },
      { path: 'products', element: <RoleHome /> },

      { path: '*', element: <NotFound /> },
    ],
  },
])
