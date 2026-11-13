import Image from 'next/image'
import Link from 'next/link'
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronDown, CircleCheck, Headphones, MonitorSmartphone, ScanBarcode, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { HomeMotion } from '@/components/home/home-motion'
// Launch popup hidden for now; uncomment this import and <LaunchAnimationModal /> below to bring it back.
// import { LaunchAnimationModal } from '@/components/home/launch-animation-modal'
import { PosDemo } from '@/components/home/pos-demo'
import { WorkflowShowcase } from '@/components/home/workflow-showcase'
import { businessCards, everydayFeatures, homepageFaqs } from '@/content/experience'
import { clients, site, telHref } from '@/content/site'
import './home.css'

export default function HomePage() {
  return (
    <HomeMotion speed={1.3}>
      {/* <LaunchAnimationModal /> */}
      <section className="zx-hero" data-animate data-depth>
        <div className="zx-hero-grid" aria-hidden />
        <div className="zx-hero-light" aria-hidden />
        <div className="zx-hero-beam" aria-hidden />
        <div className="zx-shell">
          <div className="zx-hero-layout">
            <div className="zx-hero-copy">
              <p className="zx-eyebrow"><span className="zx-live-dot" /> YOUR BUSINESS. BEAUTIFULLY CONNECTED.</p>
              <h1>Sell smarter.<br />Run <span>brighter.<svg viewBox="0 0 400 20" fill="none" aria-hidden><path d="M4 14C112 1 248 0 395 8M44 19C157 8 274 8 361 13" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg></span></h1>
              <p className="zx-hero-description">The point of sale that brings it all together.<br className="zx-desktop-break" /> Effortless billing, smarter inventory and a little more time for what you love.</p>
              <div className="zx-actions"><Link href="/pricing#quote" className="zx-button">Request a Quote <ArrowUpRight size={19} aria-hidden /></Link><a href="#in-action" className="zx-hero-link"><span><ArrowDown size={17} aria-hidden /></span>See it in action</a></div>
              <div className="zx-hero-notes"><span><Check size={14} aria-hidden /> Made for your business</span><span><Check size={14} aria-hidden /> Real people. Real support.</span></div>
            </div>
            <div className="zx-hero-demo"><span className="zx-orbit zx-orbit-one" aria-hidden /><span className="zx-orbit zx-orbit-two" aria-hidden /><div className="zx-hero-demo-label"><span className="zx-live-dot" /> A LITTLE PREVIEW OF A BETTER WORKDAY</div><PosDemo /><p className="zx-demo-hint"><span aria-hidden>↳</span> Go on, try adding something to the bill.</p></div>
          </div>
          <div className="zx-hero-bottom"><span><Zap size={17} aria-hidden /> Smooth at every sale</span><span><ShieldCheck size={17} aria-hidden /> GST-ready billing</span><span><MonitorSmartphone size={17} aria-hidden /> Made for modern counters</span><Link href="/services">Meet your new POS <ArrowRight size={17} aria-hidden /></Link></div>
        </div>
      </section>

      <section className="zx-client-strip" aria-label="Slifax clients"><div className="zx-shell"><p>In good company.<span>Businesses in the Slifax family.</span></p><div className="zx-client-logos">{[clients[0], clients[1], clients[2], clients[3], clients[9]].map(client => <Image key={client.name} src={client.logo} alt={client.name} width={135} height={90} sizes="(max-width: 600px) 90px, 135px" />)}</div></div></section>

      <section className="zx-section zx-business-section" id="businesses"><div className="zx-shell">
        <div className="zx-section-heading" data-reveal><div><p className="zx-eyebrow">HOWEVER YOU DO BUSINESS</p><h2>Your kind of business.<br /><span>Your kind of POS.</span></h2></div><p>A busy café. Your neighbourhood store. The next big brand. There’s a ZenxPOS workflow that feels right at home.</p></div>
        <div className="zx-business-grid">{businessCards.map(business => <Link href={business.href} key={business.href} className={`zx-business-card zx-tone-${business.tone}`} data-reveal><div className="zx-business-card-top"><span className="zx-business-icon"><business.icon size={33} strokeWidth={1.5} aria-hidden /></span><span className="zx-card-number">{business.number}</span></div><h3>{business.name}</h3><p>{business.description}</p><div className="zx-business-card-bottom"><small>{business.detail}</small><span className="zx-round-arrow"><ArrowUpRight size={19} aria-hidden /></span></div></Link>)}</div>
      </div></section>

      <WorkflowShowcase />

      <section className="zx-section zx-everyday-section"><div className="zx-shell zx-everyday-grid">
        <div className="zx-merchant-scene" data-reveal data-animate><div className="zx-merchant-circle" /><span className="zx-scene-spark zx-spark-one" aria-hidden>✳</span><span className="zx-scene-spark zx-spark-two" aria-hidden>+</span><div className="zx-merchant-caption"><Sparkles size={14} aria-hidden /> A little more zen in your day.</div><Image src="/img/generated/zenx-merchant-neon.webp" alt="A shopkeeper welcoming customers at a counter with a POS tablet, receipt printer and groceries" width={1536} height={1024} sizes="(min-width: 1000px) 48vw, 95vw" className="zx-merchant-image" /><div className="zx-floating-note zx-stock-note"><span><CircleCheck size={20} aria-hidden /></span><div><strong>One sale. All connected.</strong><small>Billing, stock and customer records.</small></div></div></div>
        <div className="zx-everyday-copy" data-reveal><p className="zx-eyebrow">LESS TO MANAGE. MORE TO LOVE.</p><h2>Your counter.<br /><span>Only smarter.</span></h2><p className="zx-section-description">Running a business takes heart. Running your operations should take a little less effort.</p><div className="zx-feature-list">{everydayFeatures.map(feature => <div key={feature.title}><span><feature.icon size={20} aria-hidden /></span><div><h3>{feature.title}</h3><p>{feature.text}</p></div></div>)}</div><Link href="/services" className="zx-text-link">A closer look at ZenxPOS <ArrowUpRight size={19} aria-hidden /></Link></div>
      </div></section>

      <section className="zx-hardware-section"><div className="zx-shell"><div className="zx-hardware-grid" data-animate><div className="zx-hardware-copy" data-reveal><p className="zx-eyebrow">MEET YOUR COUNTER’S DREAM TEAM</p><h2>Great software.<br /><span>Meet great hardware.</span></h2><p>Your tablet, scanner and receipt printer, all part of the same smooth experience. We’ll help you find the right setup for your space.</p><div className="zx-hardware-tags"><span><ScanBarcode size={15} aria-hidden />Barcode scanners</span><span>Receipt printers</span><span>POS terminals</span><span>Cash drawers</span></div><Link href="/hardware" className="zx-button zx-button-dark">Explore POS hardware <ArrowUpRight size={18} aria-hidden /></Link><small className="zx-compatibility">Have your own devices? Let’s check compatibility.</small></div><div className="zx-hardware-art" data-reveal><div className="zx-hardware-ring" /><Image src="/img/generated/zenx-hardware.webp" alt="Illustration of a navy POS tablet, thermal receipt printer and barcode scanner" width={1536} height={1024} sizes="(min-width: 1000px) 50vw, 95vw" /><span className="zx-hardware-label zx-label-tablet">The brains <span>↙</span></span><span className="zx-hardware-label zx-label-printer">The finishing touch <span>↖</span></span><span className="zx-hardware-dot" /></div></div></div></section>

      <section className="zx-section zx-get-started"><div className="zx-shell"><div className="zx-section-heading" data-reveal><div><p className="zx-eyebrow">FROM HELLO TO YOUR FIRST SALE</p><h2>We’re with you.<br /><span>All the way.</span></h2></div><p>A new system shouldn’t mean figuring everything out alone. Our team helps you get comfortable from day one.</p></div><div className="zx-onboarding-grid">{[{ n: '01', title: 'Let’s talk business.', text: 'Tell us how you work. We’ll show you the features that fit your day.' }, { n: '02', title: 'Make yourself at home.', text: 'Get help with configuration, hardware and bringing your team up to speed.' }, { n: '03', title: 'Ready. Set. Sell.', text: 'Open for business with technical support there when you need a hand.' }].map(step => <div key={step.n} data-reveal><span>{step.n}</span><h3>{step.title}</h3><p>{step.text}</p></div>)}</div></div></section>

      <section className="zx-section zx-plans-preview" data-animate>
        <div className="zx-shell">
          <div className="zx-section-heading" data-reveal>
            <div><p className="zx-eyebrow">A PLAN FOR THE WAY YOU GROW</p><h2>Built around you.<br /><span>Quoted for your business.</span></h2></div>
            <Link href="/pricing#comparison" className="zx-text-link">Compare Standard &amp; Premium <ArrowUpRight size={19} aria-hidden /></Link>
          </div>
          <div className="zx-plans-art" data-reveal>
            <div className="zx-plans-light" aria-hidden />
            <Image src="/img/generated/zenx-pricing-world.webp" alt="A connected retail shop, café and fashion store with entrepreneurs using POS systems" width={2172} height={724} sizes="(min-width: 1400px) 1280px, 95vw" />
            <span className="zx-plans-caption"><span className="zx-live-dot" /> Different businesses. One connected platform.</span>
          </div>
          <div className="zx-plan-options" data-reveal>
            <Link href="/pricing#plans"><div><span className="zx-plan-kicker">FOR YOUR EVERYDAY</span><h3>Standard</h3><p>Billing, inventory and the essentials to run your store.</p></div><span className="zx-plan-link">Explore plan <ArrowUpRight size={19} aria-hidden /></span></Link>
            <Link href="/pricing#plans"><div><span className="zx-plan-kicker">FOR YOUR NEXT CHAPTER</span><h3>Premium</h3><p>Bring your locations and integrations into one bigger picture.</p></div><span className="zx-plan-link">Explore plan <ArrowUpRight size={19} aria-hidden /></span></Link>
          </div>
        </div>
      </section>

      <section className="zx-section zx-faq-section" id="faq"><div className="zx-shell zx-faq-grid"><div data-reveal><p className="zx-eyebrow">A FEW THINGS YOU MIGHT BE WONDERING</p><h2>Good questions.<br /><span>Clear answers.</span></h2><p>Still curious about something?<br />There’s a real person at the other end.</p><a href={telHref(site.phones[1]!)} className="zx-text-link"><Headphones size={19} aria-hidden /> Talk to our team <ArrowUpRight size={17} aria-hidden /></a></div><div className="zx-faq-list" data-reveal>{homepageFaqs.map((faq, index) => <details key={faq.question}><summary><span><small>0{index + 1}</small>{faq.question}</span><ChevronDown size={18} aria-hidden /></summary><p>{faq.answer}</p></details>)}</div></div></section>

      <section className="zx-final-section" data-animate><div className="zx-shell"><div className="zx-final-card" data-reveal><div className="zx-final-orbit" aria-hidden /><p className="zx-eyebrow"><span className="zx-live-dot" /> YOUR NEXT CHAPTER STARTS HERE</p><h2>A better workday.<br /><span>A demo away.</span></h2><p>Let’s find a little more flow for your business.</p><div className="zx-actions"><Link href="/contact-us#contact" className="zx-button">Let’s meet your new POS <ArrowUpRight size={19} aria-hidden /></Link><Link href="/pricing" className="zx-hero-link">Explore plans <ArrowRight size={17} aria-hidden /></Link></div><span className="zx-final-note">A personalised walkthrough. At your pace.</span></div></div></section>
    </HomeMotion>
  )
}
