import type { Metadata } from 'next'
import Image from 'next/image'
import { ChevronRight } from 'lucide-react'
import { CtaBanner, FeatureGrid, SplitSection } from '@/components/sections/blocks'
import { PageHero } from '@/components/sections/page-hero'
import { Section, SectionHeading } from '@/components/ui/layout'
import { integrations } from '@/content/pages'

export const metadata: Metadata = {
  title: 'Integrations',
  description: 'ZenxPOS integrates with Paytm, Pine Labs and PhonePe payments, weighing scales, and SMS, WhatsApp and email messaging.',
}

export default function IntegrationsPage() {
  const { payment, weighing, communication } = integrations
  return (
    <>
      <PageHero title="Unified" highlight="POS Integrations" after="for Retail & Restaurants" description={integrations.hero.text} crumbs={[{ label: 'Integrations' }]} image={integrations.hero.image} />

      <SplitSection eyebrow="Payments" title="Third Party Payment Integration" text={<p>{payment.text}</p>} bullets={payment.bullets} image={payment.image}>
        <ul className="mt-8 flex flex-wrap items-center gap-4">
          {payment.partners.map(partner => (
            <li key={partner.alt} className="flex h-16 w-36 items-center justify-center rounded-xl border border-line bg-white p-3 shadow-card">
              <Image src={partner.src} alt={partner.alt} width={partner.width} height={partner.height} className="max-h-10 w-auto object-contain" unoptimized={partner.src.endsWith('.svg')} />
            </li>
          ))}
        </ul>
      </SplitSection>

      <Section tone="surface">
        <SectionHeading eyebrow="How it works" title="Payment" highlight="Gateway Flow" description="From the moment a customer pays to the money landing in your account." />
        <ol className="mt-12 flex flex-col items-stretch gap-3 md:flex-row md:items-center">
          {payment.flow.map((step, index) => (
            <li key={step} className="flex flex-1 items-center gap-3">
              <div className="flex-1 rounded-card border border-line bg-white px-4 py-5 text-center shadow-card">
                <span className="text-xs font-semibold text-brand-600">Step {index + 1}</span>
                <p className="mt-1 font-display text-sm font-semibold text-ink">{step}</p>
              </div>
              {index < payment.flow.length - 1 && <ChevronRight aria-hidden className="hidden size-5 shrink-0 text-muted md:block" />}
            </li>
          ))}
        </ol>
      </Section>

      <SplitSection eyebrow="Hardware" title="Weighing Machine Integration" text={<p>{weighing.text}</p>} image={weighing.image} reverse />

      <Section tone="surface">
        <SectionHeading eyebrow="Messaging" title="Communication" highlight="Integration" description={communication.text} />
        <FeatureGrid features={communication.items} className="mt-12" />
      </Section>

      <CtaBanner />
    </>
  )
}
