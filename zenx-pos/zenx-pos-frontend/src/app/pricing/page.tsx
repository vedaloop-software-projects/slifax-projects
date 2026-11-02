import type { Metadata } from 'next'
import { ButtonLink } from '@/components/ui/button'
import { ClientLogos, CtaBanner, SplitSection } from '@/components/sections/blocks'
import { PageHero } from '@/components/sections/page-hero'
import { CheckList } from '@/components/ui/check-list'
import { Section, SectionHeading, cn } from '@/components/ui/layout'
import { pricing } from '@/content/pages'

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Flexible ZenxPOS plans for every business stage. Book a demo to find the right plan for your store.',
}

export default function PricingPage() {
  return (
    <>
      <PageHero title="Flexible Plans" highlight="for Every Business Stage" description={pricing.hero.text} crumbs={[{ label: 'Pricing' }]} image={pricing.hero.image} />

      <Section>
        <SectionHeading title="Choose the plan that" highlight="fits your business" description="Not sure which plan is right? Book a demo and we will help you choose." />
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {pricing.plans.map(plan => (
            <article key={plan.name} className={cn('relative flex flex-col rounded-[1.5rem] border p-8', plan.featured ? 'border-navy-600 bg-navy-900 text-white shadow-lift' : 'border-line bg-white shadow-card')}>
              {plan.featured && <span className="absolute right-6 top-6 rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white">Popular</span>}
              <h2 className={cn('text-xl font-semibold', plan.featured && 'text-white')}>{plan.name}</h2>
              <p className="mt-4 flex items-baseline gap-1">
                <span className={cn('font-display text-4xl font-bold', plan.featured ? 'text-white' : 'text-ink')}>{plan.price}</span>
                <span className={plan.featured ? 'text-slate-300' : 'text-muted'}>{plan.period}</span>
              </p>
              <p className={cn('mt-3 text-sm', plan.featured ? 'text-slate-300' : 'text-muted')}>{plan.text}</p>
              <ButtonLink href="/contact-us#contact" variant={plan.featured ? 'brand' : 'primary'} className="mt-8">Subscribe to plan</ButtonLink>
              <p className={cn('mt-8 text-xs font-semibold uppercase tracking-wider', plan.featured ? 'text-brand-100' : 'text-muted')}>Features</p>
              <CheckList items={pricing.included} className={cn('mt-4', plan.featured && '[&_li]:text-slate-200')} />
            </article>
          ))}
        </div>
      </Section>

      <SplitSection
        tone="surface"
        title="POS hardware built for"
        highlight="modern retail"
        text={<p>{pricing.hardware.text}</p>}
        image={pricing.hardware.image}
        actions={<ButtonLink href="/hardware" arrow>View hardware</ButtonLink>}
      />

      <ClientLogos />
      <CtaBanner />
    </>
  )
}
