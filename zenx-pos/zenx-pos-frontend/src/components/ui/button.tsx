import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from './layout'

const variants = {
  primary: 'bg-navy-600 text-white shadow-sm hover:bg-navy-800',
  brand: 'bg-brand-500 text-white shadow-sm hover:bg-brand-600',
  outline: 'border border-line bg-white text-ink hover:border-navy-600 hover:text-navy-600',
  light: 'bg-white text-navy-900 hover:bg-brand-50',
  ghostLight: 'border border-white/40 text-white hover:bg-white/10',
}

export const buttonClass = (variant: keyof typeof variants = 'primary', className?: string) =>
  cn('inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60', variants[variant], className)

export function ButtonLink({ href, variant, arrow = false, className, children }: { href: string; variant?: keyof typeof variants; arrow?: boolean; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={buttonClass(variant, cn('group', className))}>
      {children}
      {arrow && <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />}
    </Link>
  )
}
