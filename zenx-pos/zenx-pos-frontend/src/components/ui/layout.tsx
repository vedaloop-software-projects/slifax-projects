import type { ReactNode } from 'react'

export const cn = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ')

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', className)}>{children}</div>
}

const tones = {
  white: 'bg-white',
  surface: 'bg-surface',
  tint: 'bg-gradient-to-b from-white to-brand-50',
  navy: 'bg-navy-900 text-white',
}

export function Section({ id, tone = 'white', className, children }: { id?: string; tone?: keyof typeof tones; className?: string; children: ReactNode }) {
  return (
    <section id={id} className={cn('py-16 sm:py-20 lg:py-24', tones[tone], className)}>
      <Container>{children}</Container>
    </section>
  )
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-600', className)}>
      {children}
    </span>
  )
}

/** Section title; `highlight` is rendered in the brand colour after the title. */
export function SectionHeading({
  eyebrow, title, highlight, description, align = 'center', invert = false, as: Tag = 'h2', className,
}: {
  eyebrow?: string; title: string; highlight?: string; description?: ReactNode; align?: 'center' | 'left'
  invert?: boolean; as?: 'h1' | 'h2'; className?: string
}) {
  return (
    <div className={cn('max-w-3xl', align === 'center' && 'mx-auto text-center', className)}>
      {eyebrow && <Eyebrow className="mb-4">{eyebrow}</Eyebrow>}
      <Tag className={cn('text-3xl font-bold leading-tight tracking-tight sm:text-4xl', Tag === 'h1' && 'lg:text-5xl', invert && 'text-white')}>
        {title}
        {highlight && <> <span className="text-brand-500">{highlight}</span></>}
      </Tag>
      {description && <p className={cn('mt-4 text-base leading-relaxed sm:text-lg', invert ? 'text-slate-300' : 'text-muted')}>{description}</p>}
    </div>
  )
}
