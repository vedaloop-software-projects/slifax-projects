import Image from 'next/image'
import Link from 'next/link'
import { cacheLife } from 'next/cache'
import { Mail, Phone } from 'lucide-react'
import { Container } from '@/components/ui/layout'
import { company, policies } from '@/content/legal'
import { footerQuickLinks, footerServiceLinks, site, telHref } from '@/content/site'

export async function SiteFooter() {
  const copyrightYear = await buildYear()
  return (
    <footer className="border-t border-[#29404c] bg-[#080f14] text-slate-300">
      <Container className="grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.3fr_0.8fr_1.4fr_1fr]">
        <div>
          <Link href="/" aria-label="ZenxPOS home">
            <Image src="/img/logo.svg" alt="ZenxPOS" width={150} height={37} unoptimized />
          </Link>
          <p className="mt-5 max-w-xs text-sm leading-relaxed">{site.footerBlurb}</p>
        </div>

        <FooterLinks title="Quick links" links={footerQuickLinks} />
        <FooterLinks title="Our services" links={footerServiceLinks} columns />

        <div>
          <p className="font-display text-sm font-semibold uppercase tracking-wider text-white">Contact us</p>
          <ul className="mt-4 space-y-3 text-sm">
            {site.phones.map(phone => (
              <li key={phone}>
                <a href={telHref(phone)} className="inline-flex items-center gap-2 hover:text-white">
                  <Phone aria-hidden className="size-4 text-brand-400" />
                  {phone}
                </a>
              </li>
            ))}
            <li>
              <a href={`mailto:${site.email}`} className="inline-flex items-center gap-2 hover:text-white">
                <Mail aria-hidden className="size-4 text-brand-400" />
                {site.email}
              </a>
            </li>
          </ul>
        </div>
      </Container>
      <div className="border-t border-white/10">
        <Container className="flex flex-col items-center gap-3 py-5 text-xs text-slate-400 md:flex-row md:justify-between">
          <p>© {copyrightYear} {company.legalName}. {company.brand} is a product of {company.legalName}. All rights reserved.</p>
          <nav aria-label="Legal">
            <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1">
              {policies.map(policy => <li key={policy.href}><Link href={policy.href} className="hover:text-white">{policy.label}</Link></li>)}
            </ul>
          </nav>
        </Container>
      </div>
    </footer>
  )
}

// The site is prerendered: the year is read once at build time and cached.
async function buildYear() {
  'use cache'
  cacheLife('days')
  return new Date().getFullYear()
}

function FooterLinks({ title, links, columns = false }: { title: string; links: Array<{ label: string; href: string }>; columns?: boolean }) {
  return (
    <div>
      <p className="font-display text-sm font-semibold uppercase tracking-wider text-white">{title}</p>
      <ul className={columns ? 'mt-4 grid gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2' : 'mt-4 space-y-2.5 text-sm'}>
        {links.map(link => (
          <li key={link.href}>
            <Link href={link.href} className="hover:text-white">{link.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
