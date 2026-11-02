import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { ClientLogos, CtaBanner, FeatureGrid } from '@/components/sections/blocks'
import { PageHero } from '@/components/sections/page-hero'
import { Section, SectionHeading } from '@/components/ui/layout'
import { services } from '@/content/pages'

export const metadata: Metadata = {
  title: 'Services',
  description: 'POS services for retail stores, textile stores, restaurants and salons: billing, inventory, reports, integrations and support.',
}

export default function ServicesPage() {
  return (
    <>
      <PageHero title="Power your Business with Our" highlight="Smart Services" description={services.intro} crumbs={[{ label: 'Services' }]} image={services.heroImage}>
        <dl className="grid max-w-xl grid-cols-3 gap-3">
          {services.heroStats.map(stat => (
            <div key={stat.label} className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15">
              <dt className="text-xs text-slate-300">{stat.label}</dt>
              <dd className="font-display text-2xl font-bold text-white">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </PageHero>

      <Section>
        <SectionHeading title="Comprehensive Services" highlight="that Drive Growth" />
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {services.categories.map(category => (
            <Link key={category.href} href={category.href} className="group grid overflow-hidden rounded-card border border-line bg-white shadow-card transition-shadow hover:shadow-lift sm:grid-cols-[0.9fr_1.1fr]">
              <div className="relative aspect-[4/3] sm:aspect-auto">
                <Image src={category.image.src} alt={category.image.alt} fill sizes="(min-width: 768px) 22vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
              </div>
              <div className="flex flex-col p-6">
                <h3 className="text-xl font-semibold">{category.title}</h3>
                <p className="mt-2 line-clamp-5 text-sm leading-relaxed text-muted">{category.text}</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {category.tags.map(tag => <li key={tag} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-navy-600">{tag}</li>)}
                </ul>
                <span className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-semibold text-navy-600">
                  Explore <ArrowUpRight aria-hidden className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      <Section tone="surface">
        <SectionHeading title="Engineered Features for Effortless" highlight="Business Management" />
        <div className="mt-12 grid items-center gap-10 lg:grid-cols-[1.4fr_0.6fr]">
          <FeatureGrid features={services.engineered.items} columns={2} />
          <Image src={services.engineered.image.src} alt={services.engineered.image.alt} width={services.engineered.image.width} height={services.engineered.image.height} sizes="(min-width: 1024px) 25vw, 70vw" className="mx-auto hidden h-auto w-full max-w-xs rounded-[2rem] lg:block" />
        </div>
      </Section>

      <ClientLogos />
      <CtaBanner />
    </>
  )
}
