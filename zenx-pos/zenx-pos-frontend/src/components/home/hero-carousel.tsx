'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { ButtonLink } from '@/components/ui/button'
import { Container, cn } from '@/components/ui/layout'
import type { Picture } from '@/components/sections/blocks'

type Slide = { eyebrow: string; title: string; highlight: string }

/** Rotating headline over a fixed product image. Pauses on hover/focus and for reduced motion. */
export function HeroCarousel({ slides, image }: { slides: Slide[]; image: Picture }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = setInterval(() => setIndex(current => (current + 1) % slides.length), 5000)
    return () => clearInterval(timer)
  }, [paused, slides.length])

  return (
    <section
      aria-roledescription="carousel"
      aria-label="ZenxPOS highlights"
      className="relative overflow-hidden bg-gradient-to-br from-navy-950 via-navy-900 to-navy-700 text-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div aria-hidden className="pointer-events-none absolute -left-40 top-10 size-[28rem] rounded-full bg-brand-500/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-20 bottom-0 size-96 rounded-full bg-brand-400/15 blur-3xl" />
      <Container className="relative grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-2 lg:py-24">
        <div>
          <div className="grid">
            {slides.map((slide, position) => (
              <div
                key={slide.title}
                role="group"
                aria-roledescription="slide"
                aria-label={`${position + 1} of ${slides.length}`}
                aria-hidden={position !== index}
                className={cn('col-start-1 row-start-1 transition-all duration-700', position === index ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0')}
              >
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm text-brand-100 ring-1 ring-white/15">🌍 {slide.eyebrow}</span>
                {position === 0
                  ? <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">{slide.title} <span className="text-brand-400">{slide.highlight}</span></h1>
                  : <p className="mt-6 font-display text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">{slide.title} <span className="text-brand-400">{slide.highlight}</span></p>}
              </div>
            ))}
          </div>
          <p className="mt-6 max-w-xl text-lg text-slate-300">Billing, inventory, reports and integrations for retail, textile, restaurant and salon businesses, in one platform.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/contact-us#contact" variant="brand" arrow>Book Demo</ButtonLink>
            <ButtonLink href="/services" variant="ghostLight">Explore services</ButtonLink>
          </div>
          <div className="mt-10 flex gap-2" role="tablist" aria-label="Choose slide">
            {slides.map((slide, position) => (
              <button
                key={slide.title}
                type="button"
                role="tab"
                aria-selected={position === index}
                aria-label={`Show slide ${position + 1}`}
                onClick={() => setIndex(position)}
                className={cn('h-2 rounded-full transition-all', position === index ? 'w-8 bg-brand-400' : 'w-2 bg-white/30 hover:bg-white/50')}
              />
            ))}
          </div>
        </div>
        <div className="relative">
          <Image src={image.src} alt={image.alt} width={image.width} height={image.height} priority sizes="(min-width: 1024px) 45vw, 90vw" className="h-auto w-full drop-shadow-2xl" />
        </div>
      </Container>
    </section>
  )
}
