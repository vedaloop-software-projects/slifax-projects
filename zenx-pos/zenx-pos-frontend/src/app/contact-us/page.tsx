import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowDown, ArrowUpRight, Headset } from 'lucide-react'
import { ContactSection } from '@/components/contact/contact-section'
import '@/components/contact/contact.css'

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Talk to the ZenxPOS team about your business, request a product demo, or get help with your POS setup.',
}

export default function ContactPage() {
  return <div className="zx-contact-page">
    <section className="zx-contact-shell zx-contact-hero">
      <div className="zx-contact-hero-copy">
        <p className="zx-contact-eyebrow">YOUR NEXT CHAPTER STARTS WITH HELLO</p>
        <h1>Big plans.<br /><em>Let’s talk.</em></h1>
        <p>Great business starts with a good conversation. Meet the people who help bring your ZenxPOS setup to life.</p>
        <div className="zx-contact-hero-links"><a href="#contact" className="zx-contact-button">Start a conversation<ArrowDown size={18} aria-hidden /></a><Link href="/pricing#quote" className="zx-contact-text-link">Request Quote<ArrowUpRight size={17} aria-hidden /></Link></div>
      </div>
      <div className="zx-contact-hero-art"><Image src="/img/generated/zenx-support-neon.webp" alt="A friendly ZenxPOS support expert ready to help with your business setup" width={1536} height={1024} sizes="(max-width: 600px) 90vw, 45vw" preload /><span className="zx-contact-hero-badge"><Headset size={18} aria-hidden />A real person. A fresh perspective.</span></div>
    </section>
    <ContactSection />
  </div>
}
