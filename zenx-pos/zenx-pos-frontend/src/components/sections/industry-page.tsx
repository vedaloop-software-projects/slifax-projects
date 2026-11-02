import Image from 'next/image'
import { ChevronRight, Phone } from 'lucide-react'
import { ButtonLink } from '@/components/ui/button'
import { CheckList } from '@/components/ui/check-list'
import { Container, cn } from '@/components/ui/layout'
import { site, telHref } from '@/content/site'
import { ClientLogos, CtaBanner, type Picture } from './blocks'
import { PageHero } from './page-hero'

export type Segment = { id: string; title: string; text: string; bullets: string[]; image: Picture }
export type Industry = { title: string; highlight?: string; intro: string; banner: Picture; segments: Segment[] }

/** Retail, textile, restaurant and salon pages: one section per business type, with a jump list. */
export function IndustryPage({ industry }: { industry: Industry }) {
  return (
    <>
      <PageHero
        title={industry.title}
        highlight={industry.highlight}
        description={industry.intro}
        crumbs={[{ label: 'Services', href: '/services' }, { label: `${industry.title}${industry.highlight ? ` ${industry.highlight}` : ''}` }]}
      />

      <Container className="relative -mt-8 sm:-mt-10">
        <Image src={industry.banner.src} alt={industry.banner.alt} width={industry.banner.width} height={industry.banner.height} priority sizes="(min-width: 1280px) 1216px, 95vw" className="h-56 w-full rounded-[1.5rem] object-cover shadow-lift sm:h-80" />
      </Container>

      <Container className="grid gap-12 py-16 lg:grid-cols-[1fr_18rem] lg:py-20">
        <div className="space-y-16 lg:space-y-20">
          {industry.segments.map((segment, index) => (
            <article key={segment.id} id={segment.id} className="grid items-center gap-8 md:grid-cols-2 md:gap-10">
              <div className={cn('overflow-hidden rounded-card bg-brand-50', index % 2 === 1 && 'md:order-2')}>
                <Image src={segment.image.src} alt={segment.image.alt} width={segment.image.width} height={segment.image.height} sizes="(min-width: 1024px) 30vw, 90vw" className="h-full w-full object-cover" />
              </div>
              <div>
                <h2 className="text-2xl font-bold sm:text-3xl">{segment.title}</h2>
                <p className="mt-4 text-sm leading-relaxed text-body sm:text-base">{segment.text}</p>
                <CheckList items={segment.bullets} className="mt-5" />
              </div>
            </article>
          ))}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <nav aria-label="Business types" className="rounded-card border border-line bg-white p-5 shadow-card">
            <p className="font-display text-sm font-semibold uppercase tracking-wider text-ink">Our services</p>
            <ul className="mt-3 space-y-1">
              {industry.segments.map(segment => (
                <li key={segment.id}>
                  <a href={`#${segment.id}`} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-body hover:bg-brand-50 hover:text-navy-600">
                    {segment.title}
                    <ChevronRight aria-hidden className="size-4 text-muted" />
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-5 rounded-card bg-navy-900 p-6 text-white">
            <p className="font-display text-lg font-semibold">See it in your store</p>
            <p className="mt-2 text-sm text-slate-300">Book a free demo tailored to your business.</p>
            <ButtonLink href="/contact-us#contact" variant="brand" arrow className="mt-5 w-full">Book Demo</ButtonLink>
            <a href={telHref(site.phones[0]!)} className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-300 hover:text-white">
              <Phone aria-hidden className="size-4" /> {site.phones[0]}
            </a>
          </div>
        </aside>
      </Container>

      <ClientLogos />
      <CtaBanner />
    </>
  )
}
