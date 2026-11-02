'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Menu, X } from 'lucide-react'
import { buttonClass } from '@/components/ui/button'
import { Container, cn } from '@/components/ui/layout'
import { industries, mainNav } from '@/content/site'

const servicePaths = ['/services', ...industries.map(item => item.href)]

export function SiteHeader() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)
  const servicesRef = useRef<HTMLDivElement>(null)
  // Close menus after navigating.
  const [lastPath, setLastPath] = useState(pathname)
  if (pathname !== lastPath) {
    setLastPath(pathname)
    setMenuOpen(false)
    setServicesOpen(false)
  }

  useEffect(() => {
    if (!servicesOpen) return
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !servicesRef.current?.contains(event.target as Node)) setServicesOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [servicesOpen])

  const active = (href: string) => (href === '/' ? pathname === '/' : href === '/services' ? servicePaths.includes(pathname) : pathname === href)
  const linkClass = (href: string) =>
    cn('rounded-full px-3 py-2 text-sm font-medium transition-colors', active(href) ? 'text-navy-600' : 'text-body hover:text-navy-600')

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <Container className="flex h-18 items-center justify-between gap-4">
        <Link href="/" className="shrink-0" aria-label="ZenxPOS home">
          <Image src="/img/log0-1.svg" alt="ZenxPOS" width={150} height={37} priority unoptimized />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {mainNav.map(item =>
            item.href === '/services' ? (
              <div key={item.href} ref={servicesRef} className="relative flex items-center">
                <Link href="/services" className={linkClass('/services')}>Services</Link>
                <button
                  type="button"
                  aria-label="Show services"
                  aria-expanded={servicesOpen}
                  aria-controls="services-menu"
                  onClick={() => setServicesOpen(open => !open)}
                  className="-ml-2 rounded-full p-1.5 text-muted hover:text-navy-600"
                >
                  <ChevronDown aria-hidden className={cn('size-4 transition-transform', servicesOpen && 'rotate-180')} />
                </button>
                {servicesOpen && (
                  <div id="services-menu" className="absolute left-1/2 top-full mt-3 w-80 -translate-x-1/2 rounded-card border border-line bg-white p-2 shadow-lift">
                    {industries.map(industry => (
                      <Link key={industry.href} href={industry.href} className="block rounded-xl px-4 py-3 hover:bg-brand-50">
                        <span className="block text-sm font-semibold text-ink">{industry.label}</span>
                        <span className="block text-xs text-muted">{industry.description}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link key={item.href} href={item.href} className={linkClass(item.href)} aria-current={active(item.href) ? 'page' : undefined}>
                {item.label}
              </Link>
            ),
          )}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/contact-us" className={buttonClass('outline', 'px-5 py-2.5')}>Contact Us</Link>
          <Link href="/contact-us#contact" className={buttonClass('primary', 'px-5 py-2.5')}>Book a Demo</Link>
        </div>

        <button
          type="button"
          className="rounded-full p-2 text-ink lg:hidden"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen(open => !open)}
        >
          {menuOpen ? <X aria-hidden className="size-6" /> : <Menu aria-hidden className="size-6" />}
        </button>
      </Container>

      {menuOpen && (
        <nav id="mobile-menu" aria-label="Mobile" className="max-h-[calc(100dvh-4.5rem)] overflow-y-auto border-t border-line bg-white lg:hidden">
          <Container className="flex flex-col gap-1 py-4">
            {mainNav.map(item => (
              <div key={item.href}>
                <Link href={item.href} className={cn('block rounded-xl px-3 py-3 text-base font-medium', active(item.href) ? 'bg-brand-50 text-navy-600' : 'text-ink')}>
                  {item.label}
                </Link>
                {item.href === '/services' && (
                  <div className="ml-3 border-l border-line pl-3">
                    {industries.map(industry => (
                      <Link key={industry.href} href={industry.href} className={cn('block rounded-xl px-3 py-2 text-sm', pathname === industry.href ? 'text-navy-600' : 'text-muted')}>
                        {industry.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link href="/contact-us" className={buttonClass('outline')}>Contact Us</Link>
              <Link href="/contact-us#contact" className={buttonClass('primary')}>Book a Demo</Link>
            </div>
          </Container>
        </nav>
      )}
    </header>
  )
}
