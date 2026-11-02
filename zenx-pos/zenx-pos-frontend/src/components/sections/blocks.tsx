import Image from 'next/image'
import { ChevronDown, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { ButtonLink } from '@/components/ui/button'
import { CheckList } from '@/components/ui/check-list'
import { Container, Eyebrow, Section, SectionHeading, cn } from '@/components/ui/layout'
import { clients, cta as defaultCta } from '@/content/site'

export type Picture = { src: string; alt: string; width: number; height: number }
export type Feature = { title?: string; text: string; icon?: LucideIcon; image?: Picture }

/** Image beside text: the building block of most content sections. */
export function SplitSection({
  id, eyebrow, title, highlight, text, bullets, image, reverse = false, tone, actions, children,
}: {
  id?: string; eyebrow?: string; title: string; highlight?: string; text?: ReactNode; bullets?: string[]
  image: Picture; reverse?: boolean; tone?: 'white' | 'surface' | 'tint'; actions?: ReactNode; children?: ReactNode
}) {
  return (
    <Section id={id} tone={tone}>
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className={cn('relative', reverse && 'lg:order-2')}>
          <div aria-hidden className="absolute -inset-4 -z-0 rounded-[2rem] bg-brand-50" />
          <Image src={image.src} alt={image.alt} width={image.width} height={image.height} sizes="(min-width: 1024px) 45vw, 90vw" className="relative h-auto w-full rounded-card object-cover" />
        </div>
        <div>
          {eyebrow && <Eyebrow className="mb-4">{eyebrow}</Eyebrow>}
          <h2 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {title}
            {highlight && <> <span className="text-brand-500">{highlight}</span></>}
          </h2>
          {text && <div className="mt-5 space-y-4 text-base leading-relaxed text-body">{text}</div>}
          {bullets && <CheckList items={bullets} className="mt-6" />}
          {children}
          {actions && <div className="mt-8 flex flex-wrap gap-3">{actions}</div>}
        </div>
      </div>
    </Section>
  )
}

export function FeatureGrid({ features, columns = 3, className }: { features: Feature[]; columns?: 2 | 3 | 4; className?: string }) {
  return (
    <div className={cn('grid gap-5 sm:grid-cols-2', columns === 3 && 'lg:grid-cols-3', columns === 4 && 'lg:grid-cols-4', className)}>
      {features.map(feature => (
        <article key={feature.title ?? feature.text} className="group flex flex-col rounded-card border border-line bg-white p-6 shadow-card transition-shadow hover:shadow-lift">
          {feature.image && (
            <div className="-mx-6 -mt-6 mb-5 flex h-44 items-center justify-center rounded-t-card bg-brand-50 p-4">
              <Image src={feature.image.src} alt={feature.image.alt} width={feature.image.width} height={feature.image.height} className="h-full w-auto object-contain" />
            </div>
          )}
          {feature.icon && (
            <span className="mb-5 grid size-12 place-items-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-500 group-hover:text-white">
              <feature.icon aria-hidden className="size-6" />
            </span>
          )}
          {feature.title && <h3 className="text-lg font-semibold">{feature.title}</h3>}
          <p className={cn('text-sm leading-relaxed text-muted', feature.title && 'mt-2')}>{feature.text}</p>
        </article>
      ))}
    </div>
  )
}

export function StatGrid({ stats, invert = false }: { stats: Array<{ value: string; label: string; text?: string }>; invert?: boolean }) {
  return (
    <dl className={cn('grid gap-4', stats.length === 4 ? 'grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3')}>
      {stats.map(stat => (
        <div key={stat.label} className={cn('rounded-card p-5', invert ? 'bg-white/10' : 'border border-line bg-white shadow-card')}>
          <dt className={cn('text-sm font-medium', invert ? 'text-slate-300' : 'text-muted')}>{stat.label}</dt>
          <dd className={cn('mt-1 font-display text-3xl font-bold', invert ? 'text-white' : 'text-navy-600')}>{stat.value}</dd>
          {stat.text && <dd className={cn('mt-1 text-xs', invert ? 'text-slate-300' : 'text-muted')}>{stat.text}</dd>}
        </div>
      ))}
    </dl>
  )
}

export type FaqGroup = { title: string; items: Array<{ question: string; answer: string }> }

/** Accordion built on <details>, so it works without JavaScript. */
export function FaqList({ groups }: { groups: FaqGroup[] }) {
  return (
    <div className="space-y-10">
      {groups.map(group => (
        <div key={group.title}>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-brand-600">{group.title}</h3>
          <div className="divide-y divide-line rounded-card border border-line bg-white">
            {group.items.map(item => (
              <details key={item.question} className="group px-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium text-ink">
                  {item.question}
                  <ChevronDown aria-hidden className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180" />
                </summary>
                <p className="pb-5 text-sm leading-relaxed text-muted">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function CtaBanner({ title = defaultCta.title, text = defaultCta.text }: { title?: string; text?: string }) {
  return (
    <section className="py-16 sm:py-20">
      <Container>
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-navy-900 to-navy-600 px-6 py-12 text-center sm:px-12 sm:py-16">
          <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-brand-500/25 blur-3xl" />
          <h2 className="relative text-3xl font-bold text-white sm:text-4xl">{title}</h2>
          <p className="relative mx-auto mt-4 max-w-2xl text-slate-300">{text}</p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/contact-us#contact" variant="brand" arrow>Book Demo</ButtonLink>
            <ButtonLink href="/pricing" variant="ghostLight">See pricing</ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  )
}

/** "Our Clients" logo grid (logos listed in content/site.ts). */
export function ClientLogos() {
  if (!clients.length) return null
  return (
    <Section tone="surface">
      <SectionHeading title="Our" highlight="Clients" description="Retailers, restaurants, schools and hostels that run on our software." />
      <ul className="mt-10 grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 lg:grid-cols-6">
        {clients.map(client => (
          <li key={client.name} className="rounded-xl border border-line bg-white p-2 transition-shadow hover:shadow-card">
            <Image src={client.logo} alt={client.name} title={client.name} width={207} height={138} sizes="(min-width: 1024px) 180px, 30vw" className="h-auto w-full" />
          </li>
        ))}
      </ul>
    </Section>
  )
}
