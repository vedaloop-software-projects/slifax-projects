import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowDown, ArrowUpRight, Check, CreditCard, Mail, MessageCircle, MessageSquare, PlugZap, ReceiptText, Scale, ShoppingBasket, Smartphone, Store } from 'lucide-react'
import { MarketingCta, MarketingHeading, MarketingHero, MarketingPage } from '@/components/marketing/marketing-page'
import { integrations } from '@/content/pages'
import './integrations.css'

export const metadata: Metadata = {
  title: 'Integrations',
  description: 'Explore payment, weighing scale and customer messaging integrations for ZenxPOS. Find the connections that fit your business.',
}
const providers = [
  { name: 'Paytm', text: 'Explore wallet and QR payment options for your counter.', image: integrations.payment.partners[0] },
  { name: 'Pine Labs', text: 'Discuss EDC terminal connections for card payments.', image: integrations.payment.partners[1] },
  { name: 'PhonePe', text: 'Bring UPI payment options into your checkout conversation.', image: integrations.payment.partners[2] },
]
const flow = [
  { title: 'Build the bill', text: 'The items and total come together at your POS.', icon: ReceiptText },
  { title: 'Send the amount', text: 'A supported payment connection receives the total.', icon: Smartphone },
  { title: 'Customer pays', text: 'The customer completes their payment with the provider.', icon: CreditCard },
  { title: 'Bring it together', text: 'Use the payment response to finish the sale workflow.', icon: Check },
]
const messages = [
  { icon: MessageSquare, title: 'A timely text.', label: 'SMS', text: 'Transaction alerts, order updates and useful reminders through supported SMS gateways.', preview: 'Your order is ready to collect. See you soon!' },
  { icon: MessageCircle, title: 'A familiar conversation.', label: 'WHATSAPP', text: 'Discuss digital receipts and order updates using your business messaging setup.', preview: 'Thanks for shopping with us. Here’s your receipt.' },
  { icon: Mail, title: 'The details, delivered.', label: 'EMAIL', text: 'Send receipts and keep customers informed through your connected email service.', preview: 'A little thank you, and the details of your visit.' },
]

export default function IntegrationsPage() {
  return <MarketingPage className="zx-integrations">
    <MarketingHero eyebrow="Integrations" title={<>Good on its own.<br /><em>Better connected.</em></>} description="Your payments, devices and customer conversations belong in the same picture. Find the connections that make your counter work better." visual={<ConnectionMap />}>
      <Link href="/pricing#quote" className="zx-button">Connect your business<ArrowUpRight size={18} aria-hidden /></Link>
      <Link href="#connections" className="zx-text-link">Explore integrations<ArrowDown size={16} aria-hidden /></Link>
    </MarketingHero>

    <nav aria-label="Integration categories" className="zx-int-categories"><div className="zx-shell">{[{ href: '#payments', icon: CreditCard, title: 'Payments', text: 'From billed to paid' }, { href: '#devices', icon: Scale, title: 'Devices', text: 'Your counter, connected' }, { href: '#messaging', icon: MessageCircle, title: 'Messaging', text: 'Keep the conversation going' }].map(item => <Link key={item.href} href={item.href}><item.icon size={23} aria-hidden /><span><strong>{item.title}</strong><small>{item.text}</small></span><ArrowUpRight size={17} aria-hidden /></Link>)}</div></nav>

    <section id="connections" className="zx-section zx-shell">
      <div id="payments" className="zx-int-anchor"><MarketingHeading eyebrow="PAYMENT CONNECTIONS" title={<>A smoother checkout.<br /><em>From start to paid.</em></>} description="Discuss the provider and terminal you use. We’ll help you understand the supported connection and what your setup needs." /></div>
      <div className="zx-int-providers">{providers.map(provider => <article key={provider.name} data-reveal><div className="zx-int-provider-logo"><Image src={provider.image.src} alt={provider.name} width={provider.image.width} height={provider.image.height} unoptimized={provider.image.src.endsWith('.svg')} /></div><span className="zx-int-provider-type">PAYMENT PROVIDER</span><h3>{provider.name}</h3><p>{provider.text}</p><Link href="/contact-us#contact" className="zx-text-link">Discuss your setup<ArrowUpRight size={15} aria-hidden /></Link></article>)}</div>
      <p className="zx-int-availability"><PlugZap size={16} aria-hidden />Provider availability, terminal compatibility and activation requirements are confirmed for your setup.</p>
    </section>

    <section className="zx-int-flow-section zx-section" data-animate><div className="zx-shell"><MarketingHeading eyebrow="A CONNECTED PAYMENT WORKFLOW" title={<>One total.<br /><em>A clearer handover.</em></>} description="An illustrative view of how a supported payment integration connects your checkout to a payment provider." /><ol className="zx-int-flow">{flow.map((step, index) => <li key={step.title} data-reveal><div className="zx-int-flow-line" aria-hidden /><div className="zx-int-flow-top"><span className="zx-inner-icon"><step.icon size={23} aria-hidden /></span><small>0{index + 1}</small></div><h3>{step.title}</h3><p>{step.text}</p></li>)}</ol><div className="zx-int-flow-note"><Check size={15} aria-hidden /><span>Less retyping between systems. More continuity at the counter.</span></div></div></section>

    <section id="devices" className="zx-section zx-shell zx-int-weighing">
      <div className="zx-int-scale-scene" data-animate data-reveal>
        <span className="zx-int-scene-label">ILLUSTRATIVE DEVICE WORKFLOW</span>
        <div className="zx-int-scale-basket"><ShoppingBasket size={73} strokeWidth={1.25} aria-hidden /><span>Fresh produce</span></div>
        <div className="zx-int-scale-platform" /><div className="zx-int-scale-body"><span className="zx-int-scale-brand">zenx<span>connect</span></span><div className="zx-int-scale-display"><small>WEIGHT</small><strong>0.750 <span>kg</span></strong></div><span className="zx-int-scale-light" /></div>
        <div className="zx-int-weight-link" aria-hidden><i /><i /><i /></div>
        <div className="zx-int-weight-ticket"><span><ReceiptText size={16} aria-hidden /> Sample bill</span><h3>Fresh produce</h3><div><span>Weight</span><strong>0.750 kg</strong></div><div><span>Rate / kg</span><strong>₹80.00</strong></div><div className="zx-int-weight-total"><span>Line total</span><strong>₹60.00</strong></div><p><Check size={12} aria-hidden /> Weight received</p></div>
        <div className="zx-int-scale-caption"><span className="zx-live-dot" />From the scale to the sale.</div>
      </div>
      <div data-reveal><p className="zx-eyebrow">WEIGH. CONNECT. BILL.</p><h2>Good things come<br /><em>by the kilo.</em></h2><p className="zx-inner-copy">For grocery stores, sweet shops and fresh produce counters, a supported weighing scale can pass the weight straight into your billing workflow.</p><ul className="zx-inner-list">{['Reduce repeated weight entry', 'Connect weight with the item’s selling rate', 'Choose a device suited to your counter'].map(text => <li key={text}><Check size={16} aria-hidden />{text}</li>)}</ul><Link href="/hardware" className="zx-text-link">Explore your hardware options<ArrowUpRight size={16} aria-hidden /></Link><small className="zx-int-device-note">Share your scale model with us to check compatibility.</small></div>
    </section>

    <section id="messaging" className="zx-int-messages-section zx-section"><div className="zx-shell"><MarketingHeading eyebrow="CUSTOMER COMMUNICATION" title={<>The sale ends.<br /><em>The connection stays.</em></>} description="Explore receipt delivery and customer updates through the channels that suit your business." /><div className="zx-int-messages">{messages.map((message, index) => <article key={message.label} data-reveal data-animate><div className="zx-int-message-header"><span className="zx-inner-icon"><message.icon size={22} aria-hidden /></span><small>{message.label}</small></div><h3>{message.title}</h3><p>{message.text}</p><div className={`zx-int-message-preview zx-int-message-preview--${index}`}><span>EXAMPLE MESSAGE</span><p>{message.preview}</p><small><Check size={12} aria-hidden /> A little more connected.</small></div></article>)}</div><p className="zx-int-messaging-note">Messaging setup depends on your provider, account permissions and customer preferences. We’ll discuss the details with you.</p></div></section>
      <MarketingCta title={<>Your tools.<br />A more connected team.</>} description="Tell us about the payments, devices and services you want to bring together." />
  </MarketingPage>
}

function ConnectionMap() {
  return <div className="zx-int-map">
    <span className="zx-int-map-label">YOUR BUSINESS, WORKING TOGETHER</span>
    <svg className="zx-int-map-lines" viewBox="0 0 600 500" fill="none" aria-hidden><path d="M300 248 95 113M300 248l205-135M300 248 96 386M300 248l205 138" /><path className="zx-int-map-signal" d="M300 248 95 113M300 248l205-135M300 248 96 386M300 248l205 138" /></svg>
    <div className="zx-int-map-orbit" aria-hidden /><div className="zx-int-map-core"><span className="zx-int-core-icon"><Store size={27} aria-hidden /></span><strong>zenx<span>POS</span></strong><small>At the heart of your counter.</small><span className="zx-int-core-status"><i />One connected workday.</span></div>
    {[{ icon: CreditCard, title: 'Payments', text: 'A smoother checkout' }, { icon: Scale, title: 'Devices', text: 'Made for your counter' }, { icon: MessageCircle, title: 'Messaging', text: 'Stay in the conversation' }, { icon: ReceiptText, title: 'Receipts', text: 'Every detail together' }].map((node, index) => <div key={node.title} className={`zx-int-map-node zx-int-map-node--${index}`}><node.icon size={23} aria-hidden /><strong>{node.title}</strong><small>{node.text}</small></div>)}
    <span className="zx-int-map-caption">Explore the connections that fit your setup.</span>
  </div>
}
