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
  const menuButtonRef = useRef<HTMLButtonElement>(null)
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

  useEffect(() => {
    if (!menuOpen) return
    const close = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      menuButtonRef.current?.focus()
    }
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [menuOpen])

  const active = (href: string) => (href === '/' ? pathname === '/' : href === '/services' ? servicePaths.includes(pathname) : pathname === href)
  const linkClass = (href: string) =>
    cn('rounded-full px-3 py-2 text-sm font-medium transition-colors', active(href) ? 'zx-nav-current' : 'text-slate-300 hover:text-white')

  return (
    <header className="sticky top-0 z-50 border-b border-[#42dfff20] bg-[#080f14]/95 backdrop-blur-xl">
      <Container className="flex h-18 items-center justify-between gap-4">
        <Link href="/" className="shrink-0" aria-label="ZenxPOS home">
          <Image src="/img/logo.svg" alt="ZenxPOS" width={150} height={37} preload unoptimized />
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
                  className="-ml-2 rounded-full p-1.5 text-slate-300 hover:text-neon"
                >
                  <ChevronDown aria-hidden className={cn('size-4 transition-transform', servicesOpen && 'rotate-180')} />
                </button>
                {servicesOpen && (
                  <div id="services-menu" className="absolute left-1/2 top-full mt-3 w-80 -translate-x-1/2 rounded-card border border-[#42dfff30] bg-[#101d25] p-2 shadow-lift">
                    {industries.map(industry => (
                      <Link key={industry.href} href={industry.href} className="block rounded-xl px-4 py-3 hover:bg-white/5">
                        <span className="block text-sm font-semibold text-white">{industry.label}</span>
                        <span className="block text-xs text-slate-400">{industry.description}</span>
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
          <Link href="/contact-us" className={buttonClass('ghostLight', 'px-5 py-2.5')}>Contact Us</Link>
          <Link href="/pricing#quote" className={buttonClass('neon', 'px-5 py-2.5')}>Request Quote</Link>
        </div>

        <button
          ref={menuButtonRef}
          type="button"
          className="rounded-full p-2 text-white lg:hidden"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen(open => !open)}
        >
          {menuOpen ? <X aria-hidden className="size-6" /> : <Menu aria-hidden className="size-6" />}
        </button>
      </Container>

      {menuOpen && (
        <nav id="mobile-menu" aria-label="Mobile" className="max-h-[calc(100dvh-4.5rem)] overflow-y-auto border-t border-[#42dfff20] bg-[#080f14] lg:hidden">
          <Container className="flex flex-col gap-1 py-4">
            {mainNav.map(item => (
              <div key={item.href}>
                <Link href={item.href} className={cn('block rounded-xl px-3 py-3 text-base font-medium', active(item.href) ? 'bg-[#42dfff14] zx-nav-current' : 'text-slate-200')}>
                  {item.label}
                </Link>
                {item.href === '/services' && (
                  <div className="ml-3 border-l border-[#42dfff30] pl-3">
                    {industries.map(industry => (
                      <Link key={industry.href} href={industry.href} className={cn('block rounded-xl px-3 py-2 text-sm', pathname === industry.href ? 'zx-nav-current' : 'text-slate-400')}>
                        {industry.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link href="/contact-us" className={buttonClass('ghostLight')}>Contact Us</Link>
              <Link href="/pricing#quote" className={buttonClass('neon')}>Request Quote</Link>
            </div>
          </Container>
        </nav>
      )}
    </header>
  )
}
