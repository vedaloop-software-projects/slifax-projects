import { Navigate, createBrowserRouter } from 'react-router'
import { AppLayout } from './components/AppLayout'
import { Guard, GuestOnly, NotFound, RequireAuth } from './components/guards'
import { LoginPage } from './pages/auth/LoginPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProductsPage } from './pages/products/ProductsPage'
import { ProductDetailPage } from './pages/products/ProductDetailPage'
import { BatchesPage } from './pages/BatchesPage'
import { PrintLabelsPage } from './pages/print/PrintLabelsPage'
import { PrintQueuePage } from './pages/print/PrintQueuePage'
import { PrintersPage } from './pages/PrintersPage'
import { TemplatesPage } from './pages/TemplatesPage'
import { IdentityPage } from './pages/IdentityPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { AuditPage } from './pages/AuditPage'
import { SettingsPage } from './pages/SettingsPage'
import { PublicProductPage } from './pages/PublicProductPage'

export const router = createBrowserRouter([
  { path: '/login', element: <GuestOnly><LoginPage /></GuestOnly> },
  { path: '/forgot-password', element: <GuestOnly><ForgotPasswordPage /></GuestOnly> },
  // Public resolver page (§7, §24) — no auth, reached by scanning a label's QR.
  { path: '/q/:qrId', element: <PublicProductPage /> },
  {
    path: '/',
    element: <RequireAuth><AppLayout /></RequireAuth>,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'products', element: <Guard perm="products.view"><ProductsPage /></Guard> },
      { path: 'products/:id', element: <Guard perm="products.view"><ProductDetailPage /></Guard> },
      { path: 'batches', element: <Guard perm="products.view"><BatchesPage /></Guard> },
      { path: 'labels', element: <Guard perm="print"><PrintLabelsPage /></Guard> },
      { path: 'queue', element: <PrintQueuePage /> },
      { path: 'printers', element: <PrintersPage /> },
      { path: 'templates', element: <Guard perm="templates.manage"><TemplatesPage /></Guard> },
      { path: 'identity', element: <Guard perm="products.view"><IdentityPage /></Guard> },
      { path: 'analytics', element: <Guard perm={['analytics.basic', 'analytics.full']}><AnalyticsPage /></Guard> },
      { path: 'audit', element: <Guard perm="audit.view"><AuditPage /></Guard> },
      { path: 'settings', element: <Guard perm={['settings.manage', 'users.manage']}><SettingsPage /></Guard> },
      { path: '*', element: <NotFound /> },
    ],
  },
])
