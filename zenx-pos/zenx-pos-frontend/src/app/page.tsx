import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, Phone } from 'lucide-react'
import { ContactSection } from '@/components/contact/contact-section'
import { HeroCarousel } from '@/components/home/hero-carousel'
import { ClientLogos, FaqList, FeatureGrid } from '@/components/sections/blocks'
import { Section, SectionHeading } from '@/components/ui/layout'
import { faqs, featureBadges, features, featuresImage, heroImage, heroSlides, supported, why } from '@/content/home'
import { site, telHref } from '@/content/site'

export default function HomePage() {
  return (
    <>
      <HeroCarousel slides={heroSlides} image={heroImage} />

      <Section>
        <SectionHeading eyebrow="Industries" title="Our POS System" highlight="Supports" description="Purpose-built workflows for the way your business sells." />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {supported.map(item => (
            <Link key={item.href} href={item.href} className="group flex flex-col overflow-hidden rounded-card border border-line bg-white shadow-card transition-shadow hover:shadow-lift">
              <div className="relative aspect-[3/2] overflow-hidden">
                <Image src={item.image.src} alt={item.image.alt} fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted">{item.text}</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {item.tags.map(tag => <li key={tag} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-navy-600">{tag}</li>)}
                </ul>
                <span className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-semibold text-navy-600">
                  Read more <ArrowUpRight aria-hidden className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      <Section tone="surface">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading align="left" eyebrow="Why ZenxPOS" title={why.title} description={why.text} />
            <ul className="mt-8 grid gap-5 sm:grid-cols-2">
              {why.points.map(point => (
                <li key={point.title} className="rounded-card bg-white p-5 shadow-card">
                  <point.icon aria-hidden className="size-6 text-brand-500" />
                  <p className="mt-3 font-display font-semibold text-ink">{point.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{point.text}</p>
                </li>
              ))}
            </ul>
          </div>
          <Image src={why.image.src} alt={why.image.alt} width={why.image.width} height={why.image.height} sizes="(min-width: 1024px) 45vw, 90vw" className="mx-auto h-auto w-full max-w-lg rounded-[2rem]" />
        </div>
      </Section>

      <Section>
        <SectionHeading eyebrow="Features" title="Intelligent Features for Seamless" highlight="Management" />
        <div className="mt-12 grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div className="relative order-last lg:order-first">
            <Image src={featuresImage.src} alt={featuresImage.alt} width={featuresImage.width} height={featuresImage.height} sizes="(min-width: 1024px) 45vw, 90vw" className="mx-auto h-auto w-full max-w-md" />
            <div className="mt-6 grid grid-cols-2 gap-3 sm:absolute sm:inset-x-0 sm:bottom-4 sm:mt-0 sm:flex sm:justify-between">
              {featureBadges.map(badge => (
                <div key={badge.label} className="flex items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 shadow-lift">
                  <badge.icon aria-hidden className="size-6 shrink-0 text-brand-500" />
                  <div>
                    <p className="font-display text-base font-bold text-ink">{badge.value}</p>
                    <p className="text-xs text-muted">{badge.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <FeatureGrid features={features} columns={2} />
        </div>
      </Section>

      <ContactSection />

      <Section id="faq">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <SectionHeading
              align="left"
              eyebrow="FAQ"
              title="Frequently Asked"
              highlight="Questions"
              description="Answers to common questions about our POS software, billing, inventory, reporting, integrations and hardware."
            />
            <a href={telHref(site.phones[1]!)} className="mt-8 inline-flex items-center gap-3 rounded-full bg-navy-900 px-5 py-3 text-sm font-semibold text-white hover:bg-navy-700">
              <Phone aria-hidden className="size-4" /> Still have questions? Call us
            </a>
          </div>
          <FaqList groups={faqs} />
        </div>
      </Section>

      <ClientLogos />
    </>
  )
}
