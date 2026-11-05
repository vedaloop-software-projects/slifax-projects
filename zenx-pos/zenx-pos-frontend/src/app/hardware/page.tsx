import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowDown, ArrowRight, ArrowUpRight, Barcode, Bluetooth, Check, ChevronDown, CircleCheck, Keyboard, Monitor, PackageCheck, Plug, Printer, ReceiptText, Scale, ScanBarcode, ShieldCheck, Tablet, Tags, Wallet } from 'lucide-react'
import { MarketingCta, MarketingHeading, MarketingHero, MarketingPage } from '@/components/marketing/marketing-page'
import { hardware } from '@/content/pages'
import './hardware.css'

export const metadata: Metadata = {
  title: 'POS Hardware & Counter Kits',
  description: 'Find the right tablet or desktop POS kit, barcode scanner, thermal receipt printer, cash drawer and accessories for your ZenxPOS counter. Request a tailored hardware quote.',
}

const kitDetails = [
  { label: 'COMPACT COUNTER. COMPLETE WORKFLOW.', icon: Tablet, text: 'A streamlined setup for boutiques, cafés and counters where every centimetre matters. Bring a supported tablet, stand and peripherals together around the way you sell.', use: 'For a flexible, space-conscious counter' },
  { label: 'A DEDICATED HOME FOR YOUR BUSINESS.', icon: Monitor, text: 'A permanent workstation for busy retail counters and larger product catalogues. Pair a desktop terminal with the input devices, printing and cash handling your team needs.', use: 'For a dedicated everyday billing station' },
]
const equipmentIcons = [Tablet, Wallet, Bluetooth, Printer, ReceiptText, Tags, Monitor, ScanBarcode, Barcode, Scale]
const equipmentNotes = ['THE FOUNDATION', 'CASH HANDLING', 'SCAN WIRELESSLY', 'LABEL & ORGANISE', 'THE FINISHING TOUCH', 'EVERY ITEM IDENTIFIED', 'CUSTOMER VISIBILITY', 'COUNTER SCANNING', 'A DIRECT CONNECTION', 'WEIGHT-BASED BILLING']
const hardwareFaqs = [
  { question: 'Can I keep using the hardware I already own?', answer: 'Share the make, model and connection type of your devices with our team. We’ll review compatibility with your ZenxPOS setup before recommending what to keep, configure or replace.' },
  { question: 'What comes with a hardware kit?', answer: 'The kits show common combinations of terminals, printers, scanners, cash drawers and displays. Your quote will confirm the actual devices, specifications and setup included for your business.' },
  { question: 'Can you help with installation and configuration?', answer: 'Yes. Our team can assist with hardware setup, connectivity and configuration, alongside software onboarding. Tell us about your locations and existing equipment when requesting your quote.' },
]

export default function HardwarePage() {
  return (
    <MarketingPage className="zx-hw-page">
      <MarketingHero eyebrow="SOFTWARE MEETS THE REAL WORLD" breadcrumb="Hardware" title={<>Your counter.<br /><em>Ready for anything.</em></>} description="The right screen. A quick scan. A neatly printed receipt. Put the pieces together for a counter that works as smoothly as your software." visual={<HardwareHero />}>
        <div className="zx-actions"><Link href="/pricing#quote" className="zx-button">Request a hardware quote <ArrowUpRight size={18} aria-hidden /></Link><a href="#hardware-kits" className="zx-text-link">Find your setup <ArrowDown size={16} aria-hidden /></a></div>
        <p className="zx-hw-hero-note"><ShieldCheck size={15} aria-hidden /> Device compatibility confirmed with your setup.</p>
      </MarketingHero>

      <div className="zx-hw-capabilities"><div className="zx-shell">{[{ icon: Tablet, text: 'Tablet & desktop kits' }, { icon: ScanBarcode, text: 'Barcode scanning' }, { icon: Printer, text: 'Receipt & label printing' }, { icon: Plug, text: 'Setup guidance' }].map(item => <span key={item.text}><item.icon size={18} strokeWidth={1.6} aria-hidden />{item.text}</span>)}</div></div>

      <section id="hardware-kits" className="zx-section zx-hw-kits-section"><div className="zx-shell">
        <MarketingHeading eyebrow="START WITH THE RIGHT FOUNDATION" title={<>Two ways to set up.<br /><em>One connected counter.</em></>} description="Choose the form that fits your space. We’ll help you match the components to your business, your workflow and your budget." />
        <div className="zx-hw-kit-grid">{hardware.kits.map((kit, index) => {
          const detail = kitDetails[index]
          return <article key={kit.title} className="zx-hw-kit" data-reveal data-animate>
            <div className="zx-hw-kit-topline"><span><detail.icon size={16} aria-hidden /> {index === 0 ? 'TABLET SETUP' : 'DESKTOP SETUP'}</span><span>0{index + 1}</span></div>
            <KitPreview desktop={index === 1} />
            <div className="zx-hw-kit-copy"><p className="zx-hw-kicker">{detail.label}</p><h3>{kit.title}</h3><p>{detail.text}</p><ul>{kit.items.map(item => <li key={item}><Check size={14} aria-hidden />{item === 'Plug-and-Play Setup' ? 'Setup & configuration support' : item}</li>)}</ul><div className="zx-hw-kit-footer"><small>{detail.use}</small><Link href="/pricing#quote" className="zx-text-link">Get a quote <ArrowUpRight size={16} aria-hidden /></Link></div></div>
          </article>
        })}</div>
        <p className="zx-hw-kit-note">Illustrative setups. Device models, supported connections and included components are confirmed in your quote.</p>
      </div></section>

      <section className="zx-section zx-hw-flow-section"><div className="zx-shell zx-hw-flow-grid">
        <div className="zx-hw-flow-copy" data-reveal><p className="zx-eyebrow">THE LITTLE DETAILS. WORKING TOGETHER.</p><h2>Scan it. Bill it.<br /><span>Keep things moving.</span></h2><p>A good checkout feels effortless. Connect compatible scanners and printers to bring item entry, billing and the final receipt into the same everyday workflow.</p><div className="zx-hw-flow-points"><span><ScanBarcode size={18} aria-hidden /> Product lookup at the counter</span><span><ReceiptText size={18} aria-hidden /> Clear, itemised customer receipts</span><span><PackageCheck size={18} aria-hidden /> Devices selected for your setup</span></div><Link href="/services" className="zx-text-link">See the software behind it <ArrowUpRight size={17} aria-hidden /></Link></div>
        <CheckoutFlow />
      </div></section>

      <section className="zx-section zx-hw-equipment-section" id="equipment"><div className="zx-shell">
        <MarketingHeading eyebrow="EVERY PIECE HAS A PURPOSE" title={<>Build your counter.<br /><em>Piece by piece.</em></>} description="Need a single device or a few finishing touches? Explore the hardware categories we can help you put together." />
        <div className="zx-hw-equipment-grid">{hardware.equipment.map((item, index) => {
          const Icon = equipmentIcons[index]
          return <article key={item.title} className="zx-hw-equipment" data-reveal><div className="zx-hw-equipment-top"><span className="zx-hw-equipment-icon"><Icon size={29} strokeWidth={1.5} aria-hidden /></span><span>{String(index + 1).padStart(2, '0')}</span></div><p className="zx-hw-kicker">{equipmentNotes[index]}</p><h3>{item.title}</h3><p>{item.text}</p><Link href="/pricing#quote" className="zx-hw-equipment-link" aria-label={`Request a quote for ${item.title}`}>Ask about this device <ArrowUpRight size={15} aria-hidden /></Link></article>
        })}</div>
        <div className="zx-hw-equipment-note"><Plug size={17} aria-hidden /><p>Connections, barcode formats and device features vary by model. We’ll confirm the details before you decide.</p></div>
      </div></section>

      <section className="zx-section zx-hw-compatibility-section"><div className="zx-shell">
        <div className="zx-hw-compatibility" data-reveal><div className="zx-hw-compatibility-copy"><span className="zx-hw-check-icon"><Plug size={28} strokeWidth={1.5} aria-hidden /></span><p className="zx-eyebrow">ALREADY HAVE YOUR HARDWARE?</p><h2>Keep what fits.<br /><span>Connect what’s next.</span></h2><p>You may already have part of your ideal counter. Share your existing devices and we’ll help check how they fit with ZenxPOS.</p><Link href="/pricing#quote" className="zx-button zx-button-dark">Include hardware in my quote <ArrowUpRight size={17} aria-hidden /></Link></div><ol className="zx-hw-compatibility-steps">{[{ title: 'Show us your setup.', text: 'Share your terminal, printer and scanner models, plus how they connect.' }, { title: 'Let’s check the fit.', text: 'We’ll review supported devices, connections and your billing workflow.' }, { title: 'Bring it all together.', text: 'Get guidance on configuration and the hardware your counter still needs.' }].map((step, index) => <li key={step.title}><span>0{index + 1}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></li>)}</ol></div>
      </div></section>

      <section className="zx-section zx-hw-faq-section"><div className="zx-shell zx-hw-faq-grid"><div data-reveal><p className="zx-eyebrow">BEFORE YOU PLUG IN</p><h2>A few good<br /><span>hardware questions.</span></h2></div><div className="zx-hw-faq-list" data-reveal>{hardwareFaqs.map(faq => <details key={faq.question}><summary>{faq.question}<ChevronDown size={18} aria-hidden /></summary><p>{faq.answer}</p></details>)}</div></div></section>

      <MarketingCta eyebrow="YOUR COUNTER. YOUR WAY." title={<>Let’s put your<br /><em>ideal setup together.</em></>} description="Tell us about your business, locations and existing devices. We’ll help you find the right hardware and a quote that fits." />
    </MarketingPage>
  )
}

function HardwareHero() {
  return <div className="zx-hw-hero-scene" data-animate><div className="zx-hw-hero-halo" aria-hidden /><div className="zx-hw-hero-ring" aria-hidden /><div className="zx-hw-hero-ring zx-hw-hero-ring-two" aria-hidden /><span className="zx-hw-hero-label"><span className="zx-live-dot" /> BUILT AROUND YOUR COUNTER</span><Image src="/img/generated/zenx-hardware.webp" alt="POS tablet, thermal receipt printer and barcode scanner arranged as a connected counter setup" width={1536} height={1024} preload sizes="(min-width: 1100px) 48vw, 95vw" className="zx-hw-hero-image" /><div className="zx-hw-hero-chip zx-hw-chip-terminal" aria-hidden><Tablet size={17} /><span>The command centre.</span></div><div className="zx-hw-hero-chip zx-hw-chip-printer" aria-hidden><Printer size={17} /><span>The finishing touch.</span></div><div className="zx-hw-hero-caption"><span>01 / SELECT</span><ArrowRight size={12} aria-hidden /><span>02 / CONNECT</span><ArrowRight size={12} aria-hidden /><span>03 / SELL</span></div></div>
}

function KitPreview({ desktop }: { desktop: boolean }) {
  return <div className={`zx-hw-kit-preview${desktop ? ' zx-hw-kit-preview-desktop' : ''}`} aria-hidden>
    <div className="zx-hw-kit-glow" /><div className="zx-hw-mini-terminal"><div className="zx-hw-mini-camera" /><div className="zx-hw-mini-screen"><div className="zx-hw-mini-nav"><span>zenx<b>POS</b></span><i /></div><div className="zx-hw-mini-workspace"><div className="zx-hw-mini-products">{Array.from({ length: 6 }, (_, index) => <span key={index}><i /><i /></span>)}</div><div className="zx-hw-mini-order"><span /><span /><span /><b /><strong>₹250.00</strong><em>PAYMENT COMPLETE</em></div></div></div></div>
    <div className="zx-hw-mini-stand" /><div className="zx-hw-mini-drawer"><span /><i /></div><div className="zx-hw-mini-printer"><div className="zx-hw-mini-paper-window"><div className="zx-hw-mini-paper"><span>ZENXPOS</span><i /><i /><i /><b>₹250</b><span>SAMPLE RECEIPT</span></div></div><div className="zx-hw-mini-printer-body"><span /><i /></div></div>
    {desktop ? <div className="zx-hw-mini-keyboard"><Keyboard size={66} strokeWidth={1} /></div> : <div className="zx-hw-mini-scanner"><ScanBarcode size={31} strokeWidth={1.4} /><span /></div>}<span className="zx-hw-preview-caption">ILLUSTRATIVE HARDWARE SETUP</span>
  </div>
}

function CheckoutFlow() {
  return <div className="zx-hw-checkout-scene" data-animate data-reveal aria-hidden><div className="zx-hw-checkout-header"><span><span className="zx-live-dot" /> COUNTER WORKFLOW</span><small>SAMPLE DEMONSTRATION</small></div><div className="zx-hw-scan-card"><div className="zx-hw-scan-card-top"><ScanBarcode size={19} /><span>PRODUCT IDENTIFIED</span></div><strong>Daily essentials</strong><small>SKU ZX-042 · 1 item</small><BarcodeGraphic /><div className="zx-hw-scan-laser" /><div className="zx-hw-scan-confirm"><CircleCheck size={13} /><span>Added to the bill</span></div></div><div className="zx-hw-flow-connector"><i /><i /><i /><ArrowRight size={18} /></div><div className="zx-hw-flow-printer"><div className="zx-hw-flow-paper-window"><div className="zx-hw-flow-paper"><strong>zenx<span>POS</span></strong><small>SAMPLE RECEIPT</small><div /><p><span>Daily essentials</span><b>₹250</b></p><p><span>Total</span><b>₹250</b></p><BarcodeGraphic /><small>Thanks for stopping by.</small></div></div><div className="zx-hw-flow-printer-body"><div className="zx-hw-flow-slot" /><span>zenx<span>print</span></span><i /></div></div><div className="zx-hw-checkout-footer"><Check size={15} /><span>A clear finish to every transaction.</span></div></div>
}

function BarcodeGraphic() {
  return <svg className="zx-hw-barcode" viewBox="0 0 140 33" fill="currentColor">{[2, 6, 9, 14, 19, 23, 28, 33, 36, 42, 46, 50, 55, 60, 65, 69, 75, 80, 84, 89, 94, 99, 103, 108, 113, 117, 122, 127, 133, 137].map((x, index) => <rect key={x} x={x} width={index % 3 === 0 ? 3 : 1.5} height={index < 2 || index > 27 ? 33 : 29} />)}</svg>
}
