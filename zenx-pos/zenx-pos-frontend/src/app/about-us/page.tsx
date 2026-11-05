import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, Check, HeartHandshake, Layers3, MapPin, MessageCircle, ScanLine, Sparkles, Store, Users, Wallet } from 'lucide-react'
import { MarketingClients, MarketingCta, MarketingHeading, MarketingHero, MarketingPage } from '@/components/marketing/marketing-page'
import './about.css'

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Meet ZenxPOS, a Slifax product built to connect billing, inventory, customers and everyday business operations.',
}

const values = [
  { icon: HeartHandshake, title: 'Merchant first.', text: 'Start with the people at the counter. Build around the work they do every day.' },
  { icon: Layers3, title: 'Keep it connected.', text: 'Bring sales, stock and customer information together, so the next decision is easier.' },
  { icon: Sparkles, title: 'Make it feel simple.', text: 'Give useful tools a clear, approachable home. Leave more room for the business itself.' },
  { icon: Wallet, title: 'Be clear from the start.', text: 'Discuss the software, equipment and support you need, then put the agreed scope in your quote.' },
]
const approach = [
  { icon: MessageCircle, title: 'First, we listen.', text: 'Your customers, your counters, your way of working. That’s where a good setup begins.' },
  { icon: ScanLine, title: 'Then, we connect.', text: 'Bring the right software, compatible devices and team workflows into one plan.' },
  { icon: Users, title: 'And help you settle in.', text: 'From setup questions to learning the day-to-day flow, find a person to talk to.' },
]

export default function AboutPage() {
  return (
    <MarketingPage className="zx-about">
      <MarketingHero eyebrow="About ZenxPOS" title={<>Good business.<br /><em>Great everyday.</em></>} description="There’s a person behind every counter. We build the tools that give them a little more clarity, a little less admin, and more time for what matters." visual={
        <div className="zx-about-team">
          <div className="zx-about-orbit" aria-hidden />
          <span className="zx-about-team-note"><HeartHandshake size={16} aria-hidden /> People behind the product.</span>
          <Image src="/img/generated/zenx-team-cyan.webp" alt="Illustration of two business software specialists working together at a POS counter" width={1536} height={1024} preload sizes="(min-width: 1000px) 50vw, 95vw" />
          <div className="zx-about-team-label"><span className="zx-live-dot" /> A Slifax product. Built around your business.</div>
        </div>
      }>
        <Link href="/contact-us#contact" className="zx-button">Meet your next POS team<ArrowUpRight size={18} aria-hidden /></Link>
        <Link href="#our-story" className="zx-text-link">Our story<ArrowUpRight size={16} aria-hidden /></Link>
      </MarketingHero>

      <section className="zx-about-principles"><div className="zx-shell">{[{ icon: Store, label: 'For the way you do business', text: 'Retail, restaurants, textiles & salons' }, { icon: Layers3, label: 'One more connected workday', text: 'Software, hardware & daily workflows' }, { icon: MapPin, label: 'A team you can talk to', text: 'Based in Hyderabad, India' }].map(item => <div key={item.label}><item.icon size={23} aria-hidden /><span><strong>{item.label}</strong><small>{item.text}</small></span></div>)}</div></section>

      <section id="our-story" className="zx-section zx-shell zx-about-story">
        <div data-reveal><p className="zx-eyebrow">THE IDEA BEHIND ZENXPOS</p><h2>The everyday<br />deserves <em>better.</em></h2><p className="zx-inner-copy">Opening the store. Checking the shelves. Welcoming a familiar face. There’s a lot that goes into a good business day.</p><p className="zx-inner-copy">ZenxPOS brings billing, inventory, customer records and reports into one place. It’s a product of Slifax, created to make those everyday tasks feel more connected.</p><Link href="/services" className="zx-text-link">See what’s possible<ArrowUpRight size={16} aria-hidden /></Link></div>
        <div className="zx-about-story-visual" data-animate data-reveal>
          <div className="zx-about-story-top"><span className="zx-live-dot" /><span>THE SMALL THINGS, WORKING TOGETHER</span></div>
          <div className="zx-about-wordmark">zenx<span>POS</span></div>
          <div className="zx-about-connections" aria-hidden><span /><span /><span /></div>
          <div className="zx-about-story-nodes">{[{ icon: ScanLine, title: 'Your sales' }, { icon: Layers3, title: 'Your stock' }, { icon: Users, title: 'Your customers' }].map(item => <div key={item.title}><item.icon size={25} aria-hidden /><strong>{item.title}</strong><span>Part of the same day.</span></div>)}</div>
          <p>More connected. <span>More in your control.</span></p>
        </div>
      </section>

      <section className="zx-about-purpose zx-section"><div className="zx-shell zx-about-purpose-grid">
        <article className="zx-about-mission" data-reveal><span className="zx-about-purpose-number">01 / OUR MISSION</span><h2>Less friction.<br /><em>More possibility.</em></h2><p>Give businesses practical technology that simplifies daily operations and makes room for sustainable growth.</p><ul>{['Bring billing and inventory together', 'Make business information easier to understand', 'Help teams work with confidence'].map(text => <li key={text}><Check size={16} aria-hidden />{text}</li>)}</ul></article>
        <article className="zx-about-vision" data-reveal><span className="zx-about-purpose-number">02 / OUR VISION</span><h2>A smarter future.<br />For every counter.</h2><p>A local store taking its next step. A growing team finding its rhythm. We want useful, approachable technology to be part of that story.</p><span className="zx-about-vision-line" aria-hidden /><strong>Start with today.<br />Make room for tomorrow.</strong></article>
      </div></section>

      <section className="zx-shell zx-section"><MarketingHeading eyebrow="OUR WAY OF THINKING" title={<>A few things<br /><em>we stand for.</em></>} description="The principles that shape the product, the conversations, and the work behind the scenes." /><div className="zx-about-values">{values.map((value, index) => <article key={value.title} data-reveal><div><span className="zx-inner-icon"><value.icon size={22} aria-hidden /></span><small>0{index + 1}</small></div><h3>{value.title}</h3><p>{value.text}</p></article>)}</div></section>

      <section className="zx-about-approach zx-section"><div className="zx-shell"><MarketingHeading eyebrow="FROM CONVERSATION TO COUNTER" title={<>Built together.<br /><em>Step by step.</em></>} description="The right setup begins with understanding your business. Here’s how that conversation takes shape." /><div className="zx-about-steps">{approach.map((step, index) => <article key={step.title} data-reveal><div><span>0{index + 1}</span><step.icon size={23} aria-hidden /></div><h3>{step.title}</h3><p>{step.text}</p></article>)}</div></div></section>
      <MarketingClients />
      <MarketingCta title={<>Your business has a story.<br />Let’s be part of it.</>} description="Tell us what a better workday looks like for you." />
    </MarketingPage>
  )
}
