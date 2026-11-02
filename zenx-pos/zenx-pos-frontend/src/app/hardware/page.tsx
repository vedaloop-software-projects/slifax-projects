import type { Metadata } from 'next'
import { ButtonLink } from '@/components/ui/button'
import { CtaBanner, FeatureGrid, SplitSection } from '@/components/sections/blocks'
import { PageHero } from '@/components/sections/page-hero'
import { CheckList } from '@/components/ui/check-list'
import { Section, SectionHeading } from '@/components/ui/layout'
import { hardware } from '@/content/pages'

export const metadata: Metadata = {
  title: 'Hardware',
  description: 'iPad and desktop POS hardware kits, barcode scanners, thermal printers, cash drawers, pole displays and weighing scales for ZenxPOS.',
}

export default function HardwarePage() {
  return (
    <>
      <PageHero title="Billing" highlight="Hardware" after="for POS Retail" description={hardware.hero.text} crumbs={[{ label: 'Hardware' }]} image={hardware.hero.image} />

      {hardware.kits.map((kit, index) => (
        <SplitSection
          key={kit.title}
          eyebrow="Hardware kit"
          title={kit.title}
          text={<p>{kit.text}</p>}
          image={kit.image}
          reverse={index % 2 === 1}
          tone={index % 2 === 1 ? 'surface' : 'white'}
          actions={<ButtonLink href="/contact-us#contact" arrow>Get a quote</ButtonLink>}
        >
          <CheckList items={kit.items} columns={2} className="mt-6" />
        </SplitSection>
      ))}

      <Section>
        <SectionHeading title="Individual POS" highlight="Hardware Equipment" description="Pick exactly what your counter needs; every device works with ZenxPOS out of the box." />
        <FeatureGrid features={hardware.equipment} columns={4} className="mt-12" />
      </Section>

      <CtaBanner />
    </>
  )
}
