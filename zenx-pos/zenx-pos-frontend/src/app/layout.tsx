import type { Metadata, Viewport } from 'next'
import { DM_Sans, Sora } from 'next/font/google'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { site } from '@/content/site'
import './globals.css'

// A marketing site: every page must be produced at build time.
export const ensureStatic = 'navigation'

const sora = Sora({ variable: '--font-sora', subsets: ['latin'], weight: ['500', '600', '700', '800'] })
const dmSans = DM_Sans({ variable: '--font-dm-sans', subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} | Point of Sale for Retail, Restaurants & Salons`, template: `%s | ${site.name}` },
  description: site.description,
  openGraph: { type: 'website', siteName: site.name, locale: 'en_IN', images: [{ url: '/img/generated/zenx-hardware.webp', width: 1536, height: 1024, alt: 'ZenxPOS tablet, receipt printer and barcode scanner' }] },
}

export const viewport: Viewport = { themeColor: '#080f14' }

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${sora.variable} ${dmSans.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:shadow-lift">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  )
}
