import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowDown, ArrowUpRight, BarChart3, Boxes, Cable, Check, CheckCheck,
  Coffee, GraduationCap, Headset, ReceiptText, Scissors, Shirt, ShoppingBag, Users,
} from 'lucide-react'
import { PosDemo } from '@/components/home/pos-demo'
import { MarketingPage, MarketingHero, MarketingHeading, MarketingCta, MarketingClients } from '@/components/marketing/marketing-page'
import './services.css'

export const metadata: Metadata = {
  title: 'Services',
  description: 'Explore ZenxPOS services for retail, textiles, restaurants and salons. Bring billing, inventory, customers and reporting together with onboarding and hardware guidance.',
}

const industries = [
  { title: 'Retail & supermarkets', href: '/retail-services', image: '/img/services-1.webp', alt: 'A customer checking out at a supermarket counter', icon: ShoppingBag, text: 'Bring the shelf, the stockroom and the checkout together. Keep everyday sales and inventory in view.', tags: ['Barcode billing', 'Stock management', 'Customers'] },
  { title: 'Restaurants & cafés', href: '/restaurant-cafe', image: '/img/coffe.webp', alt: 'A freshly prepared cappuccino on a café table', icon: Coffee, text: 'From the first order to the final bill. Connect service, kitchen workflows and the details of your day.', tags: ['Orders & tables', 'Kitchen tickets', 'Billing'] },
  { title: 'Fashion & textiles', href: '/textile-services', image: '/img/f1.webp', alt: 'Colourful fabrics arranged in a textile store', icon: Shirt, text: 'Every colour, size and style has its place. Organise your range and find the right item at the counter.', tags: ['Product variants', 'Inventory', 'Sales reports'] },
  { title: 'Salons & spas', href: '/salon-spa', image: '/img/saloon.webp', alt: 'A stylist helping a customer at a salon', icon: Scissors, text: 'Give your customers a little more attention. Bring appointments, services and billing into your workflow.', tags: ['Appointments', 'Service billing', 'Customer history'] },
]

const features = [
  { icon: ReceiptText, title: 'Billing that keeps up.', text: 'Create itemised bills, record payments and manage GST invoices from your counter.', number: '01' },
  { icon: Boxes, title: 'Keep stock in sight.', text: 'Follow inventory movements and identify low stock before your next busy day.', number: '02' },
  { icon: Users, title: 'Know your customers.', text: 'Keep customer details and purchase history together for a more informed conversation.', number: '03' },
  { icon: BarChart3, title: 'Make sense of the day.', text: 'Review sales and business reports to understand what is moving and what needs attention.', number: '04' },
  { icon: Cable, title: 'Connect your setup.', text: 'Explore compatible scanners, printers and integrations that fit the way your business works.', number: '05' },
  { icon: GraduationCap, title: 'Get your team ready.', text: 'Work through setup and onboarding with guidance shaped around your everyday workflows.', number: '06' },
]

export default function ServicesPage() {
  return <MarketingPage className="zx-services">
    <MarketingHero
      eyebrow="YOUR BUSINESS. BETTER CONNECTED."
      breadcrumb="Services"
      title={<>Made for your day.<br /><em>Built for your way.</em></>}
      description="From a neighbourhood store to a busy café. Bring your billing, inventory and customer moments together with a POS that fits your business."
      visual={<div className="zx-svc-hero-scene"><PosDemo /><p className="zx-svc-demo-note"><span />Explore a sample checkout, from product to printed receipt.</p></div>}
    >
      <div className="zx-svc-hero-actions"><Link className="zx-button" href="/pricing#quote">Find your setup<ArrowUpRight size={18} aria-hidden /></Link><a className="zx-text-link" href="#industries">Explore your industry<ArrowDown size={17} aria-hidden /></a></div>
      <div className="zx-svc-hero-notes"><span><Check size={14} aria-hidden />Built around your business</span><span><Check size={14} aria-hidden />Guidance from real people</span></div>
    </MarketingHero>

    <section id="industries" className="zx-section zx-svc-industries">
      <div className="zx-shell">
        <MarketingHeading eyebrow="HOWEVER YOU DO BUSINESS" title={<>Different worlds.<br /><em>One connected POS.</em></>} description="The right tools start with the way you work. Explore a setup for your kind of business." />
        <div className="zx-svc-industry-grid">
          {industries.map((industry, index) => <Link key={industry.href} href={industry.href} className="zx-svc-industry-card" data-reveal>
            <div className="zx-svc-industry-image"><Image src={industry.image} alt={industry.alt} fill sizes="(max-width: 600px) 90vw, (max-width: 900px) 45vw, 44vw" /><span className="zx-svc-industry-number">0{index + 1} / INDUSTRIES</span><span className="zx-svc-industry-icon"><industry.icon size={22} aria-hidden /></span></div>
            <div className="zx-svc-industry-body"><h3>{industry.title}<ArrowUpRight size={22} aria-hidden /></h3><p>{industry.text}</p><ul>{industry.tags.map(tag => <li key={tag}>{tag}</li>)}</ul></div>
          </Link>)}
        </div>
      </div>
    </section>

    <section className="zx-section zx-svc-features" id="features" data-animate>
      <div className="zx-shell">
        <MarketingHeading eyebrow="THE EVERYDAY ESSENTIALS" title={<>Less to juggle.<br /><em>More working together.</em></>} description="The details behind a smoother workday, connected in one place." />
        <div className="zx-svc-flow" aria-label="Connected workflow: billing, inventory, customers and reports"><div className="zx-svc-flow-line" aria-hidden /><span><ReceiptText size={18} aria-hidden />Bill</span><span><Boxes size={18} aria-hidden />Track</span><span><Users size={18} aria-hidden />Connect</span><span><BarChart3 size={18} aria-hidden />Understand</span></div>
        <div className="zx-svc-feature-grid">
          {features.map(feature => <article key={feature.number} className="zx-svc-feature" data-reveal><div className="zx-svc-feature-top"><feature.icon size={23} aria-hidden /><span>{feature.number}</span></div><h3>{feature.title}</h3><p>{feature.text}</p></article>)}
        </div>
        <div className="zx-svc-features-footer"><p>Software, hardware compatibility and integration scope are confirmed with your setup.</p><Link href="/integrations" className="zx-text-link">Explore integrations<ArrowUpRight size={16} aria-hidden /></Link></div>
      </div>
    </section>

    <section className="zx-section zx-svc-support" id="support">
      <div className="zx-shell zx-svc-support-grid">
        <div className="zx-svc-support-art" data-animate><div className="zx-svc-support-ring" aria-hidden /><Image src="/img/generated/zenx-support-neon.webp" alt="A ZenxPOS team member ready to help with your POS setup" width={1536} height={1024} sizes="(max-width: 800px) 90vw, 45vw" /><div className="zx-svc-support-badge"><Headset size={19} aria-hidden /><span>From your first question.<br /><strong>To your everyday.</strong></span></div></div>
        <div className="zx-svc-support-copy" data-reveal><p className="zx-eyebrow">PEOPLE BEHIND THE PLATFORM</p><h2>A good setup.<br /><em>A team beside you.</em></h2><p>Introducing new software should feel like a step forward. We’ll help you work through the details, from your first conversation to getting your team comfortable.</p><ol className="zx-svc-onboarding"><li><span>01</span><div><h3>Let’s understand your business.</h3><p>Your industry, your counters, your team and what you need next.</p></div></li><li><span>02</span><div><h3>Shape the right setup.</h3><p>Review your software, hardware compatibility and onboarding requirements.</p></div></li><li><span>03</span><div><h3>Get familiar. Get going.</h3><p>Work through your workflows with product guidance and support.</p></div></li></ol><Link href="/contact-us#contact" className="zx-text-link">Talk to our team<ArrowUpRight size={17} aria-hidden /></Link></div>
      </div>
    </section>

    <section className="zx-svc-fit"><div className="zx-shell zx-svc-fit-inner"><span className="zx-svc-fit-icon"><CheckCheck size={27} aria-hidden /></span><div><h2>Start with your business. Build from there.</h2><p>Compare Standard and Premium, then request a quote around your requirements.</p></div><Link href="/pricing#comparison" className="zx-text-link">Compare plans<ArrowUpRight size={17} aria-hidden /></Link></div></section>
    <MarketingClients />
    <MarketingCta eyebrow="YOUR NEXT WORKDAY, REIMAGINED" title={<>Your business has its rhythm.<br /><em>Let’s find your flow.</em></>} description="Tell us what you need. We’ll help you find your ZenxPOS setup." />
  </MarketingPage>
}
