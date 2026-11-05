import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { HomeMotion } from '@/components/home/home-motion'
import { clients } from '@/content/site'
import '@/app/home.css'
import './marketing.css'

export function MarketingPage({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <HomeMotion><div className={`zx-inner ${className}`}>{children}</div></HomeMotion>
}

export function MarketingHero({ eyebrow, breadcrumb = eyebrow, title, description, children, visual }: { eyebrow: string; breadcrumb?: string; title: ReactNode; description: string; children?: ReactNode; visual: ReactNode }) {
  return (
    <section className="zx-inner-hero">
      <div className="zx-inner-hero-grid" aria-hidden />
      <div className="zx-shell zx-inner-hero-layout">
        <div className="zx-inner-hero-copy">
          <nav aria-label="Breadcrumb" className="zx-inner-breadcrumb"><Link href="/">Home</Link><ChevronRight size={12} aria-hidden /><span aria-current="page">{breadcrumb}</span></nav>
          <p className="zx-eyebrow"><span className="zx-live-dot" />{eyebrow}</p>
          <h1>{title}</h1>
          <p className="zx-inner-intro">{description}</p>
          <div className="zx-inner-hero-actions">{children ?? <Link href="/pricing#quote" className="zx-button">Request a Quote<ArrowUpRight size={18} aria-hidden /></Link>}</div>
        </div>
        <div className="zx-inner-visual" data-animate>{visual}</div>
      </div>
    </section>
  )
}

export function MarketingHeading({ eyebrow, title, description }: { eyebrow: string; title: ReactNode; description?: string }) {
  return <header className="zx-inner-heading" data-reveal><div><p className="zx-eyebrow">{eyebrow}</p><h2>{title}</h2></div>{description && <p>{description}</p>}</header>
}

export function MarketingCta({ eyebrow = 'YOUR NEXT CHAPTER STARTS HERE', title = <>A better workday.<br />Let’s build yours.</>, description = 'Tell us about your business. We’ll help you find the right setup.' }: { eyebrow?: string; title?: ReactNode; description?: string }) {
  return <section className="zx-final-section"><div className="zx-shell"><div className="zx-final-card" data-reveal><div className="zx-final-orbit" aria-hidden /><p className="zx-eyebrow">{eyebrow}</p><h2>{title}</h2><p>{description}</p><div className="zx-actions"><Link href="/pricing#quote" className="zx-button">Request a Quote<ArrowUpRight size={18} aria-hidden /></Link><Link href="/contact-us#contact" className="zx-hero-link">Talk to our team<ArrowUpRight size={16} aria-hidden /></Link></div><small className="zx-final-note">Your business. Your setup. A quote that fits.</small></div></div></section>
}

export function MarketingClients() {
  return <section className="zx-inner-clients"><div className="zx-shell"><div><p>In good company.</p><span>Businesses in the Slifax family.</span></div><ul>{clients.slice(0, 5).map(client => <li key={client.name}><Image src={client.logo} alt={client.name} width={207} height={138} sizes="(max-width: 550px) 27vw, 140px" /></li>)}</ul></div></section>
}
