import type { Metadata } from 'next'
import Image from 'next/image'
import { ArrowDown, ArrowUpRight, Check } from 'lucide-react'
import { PricingInquiry } from '@/components/contact/pricing-inquiry'
import './pricing.css'

export const metadata: Metadata = {
  title: 'Plans & Pricing',
  description: 'Explore ZenxPOS Standard and Premium. Compare your options and request a personalised quote for your software, hardware and business setup.',
}

export default function PricingPage() {
  return <div className="zx-pricing">
    <section className="zx-pricing-hero zx-pricing-shell">
      <div className="zx-pricing-hero-copy"><p className="zx-pricing-eyebrow">A PLAN FOR YOUR NEXT CHAPTER</p><h1>Big possibilities.<br /><em>Your kind of plan.</em></h1><p>One counter or your next big expansion. Find a ZenxPOS setup shaped around the way you do business.</p><div className="zx-pricing-hero-actions"><a href="#quote" className="zx-contact-button">Request Quote<ArrowUpRight size={18} aria-hidden /></a><a href="#plans" className="zx-pricing-text-link">Explore the plans<ArrowDown size={17} aria-hidden /></a></div><div className="zx-pricing-hero-proof"><span><Check size={14} aria-hidden />Your requirements</span><span><Check size={14} aria-hidden />A personalised proposal</span></div></div>
      <div className="zx-pricing-hero-art"><Image src="/img/generated/zenx-pricing-world.webp" alt="A connected world of shops, counters and POS devices showing room for business growth" width={2172} height={724} sizes="(max-width: 800px) 95vw, 90vw" preload /><span className="zx-pricing-art-label"><i />BUILT FOR YOUR BUSINESS</span></div>
    </section>
    <PricingInquiry />
  </div>
}
