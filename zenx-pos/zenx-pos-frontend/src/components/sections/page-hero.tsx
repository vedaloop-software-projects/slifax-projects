import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Container, cn } from '@/components/ui/layout'

export type Crumb = { label: string; href?: string }

/** Banner at the top of every inner page: breadcrumb, title and an optional illustration. */
export function PageHero({
  title, highlight, after, description, crumbs, image, children,
}: {
  title: string; highlight?: string; after?: string; description?: ReactNode; crumbs: Crumb[]
  image?: { src: string; alt: string; width: number; height: number }; children?: ReactNode
}) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-navy-950 via-navy-900 to-navy-700 text-white">
      <div aria-hidden className="pointer-events-none absolute -right-32 -top-32 size-96 rounded-full bg-brand-500/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 left-1/4 size-96 rounded-full bg-brand-400/10 blur-3xl" />
      <Container className={cn('relative grid items-center gap-10 py-14 sm:py-20', image && 'lg:grid-cols-[1.1fr_0.9fr]')}>
        <div>
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-300">
              <li><Link href="/" className="hover:text-white">Home</Link></li>
              {crumbs.map(crumb => (
                <li key={crumb.label} className="flex items-center gap-1">
                  <ChevronRight aria-hidden className="size-3.5" />
                  {crumb.href ? <Link href={crumb.href} className="hover:text-white">{crumb.label}</Link> : <span aria-current="page" className="text-white">{crumb.label}</span>}
                </li>
              ))}
            </ol>
          </nav>
          <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
            {title}
            {highlight && <> <span className="text-brand-400">{highlight}</span></>}
            {after && <> {after}</>}
          </h1>
          {description && <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">{description}</p>}
          {children && <div className="mt-8">{children}</div>}
        </div>
        {image && (
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <Image src={image.src} alt={image.alt} width={image.width} height={image.height} priority sizes="(min-width: 1024px) 40vw, 90vw" className="h-auto w-full drop-shadow-2xl" />
          </div>
        )}
      </Container>
    </section>
  )
}
