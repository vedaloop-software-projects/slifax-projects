'use client'

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

/** Content remains visible without JS. Only enhance elements below the fold. */
export function HomeMotion({ children, speed }: { children: ReactNode; speed?: number }) {
  const root = useRef<HTMLDivElement>(null)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const syncPreference = () => setReduced(preference.matches)
    syncPreference()
    preference.addEventListener('change', syncPreference)
    const container = root.current
    if (!container || !('IntersectionObserver' in window)) return () => preference.removeEventListener('change', syncPreference)
    const reveals = container.querySelectorAll<HTMLElement>('[data-reveal]')
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.remove('zx-reveal-pending')
        observer.unobserve(entry.target)
      }
    }, { threshold: 0.08 })
    if (!preference.matches) reveals.forEach(node => {
      if (node.getBoundingClientRect().top > window.innerHeight) node.classList.add('zx-reveal-pending')
      observer.observe(node)
    })
    const scenes = container.querySelectorAll<HTMLElement>('[data-animate]')
    const sceneObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => { (entry.target as HTMLElement).dataset.inView = String(entry.isIntersecting) })
    }, { rootMargin: '40px' })
    scenes.forEach(node => sceneObserver.observe(node))
    const visibility = () => { container.dataset.hidden = String(document.hidden) }
    document.addEventListener('visibilitychange', visibility)
    visibility()
    return () => {
      observer.disconnect()
      sceneObserver.disconnect()
      preference.removeEventListener('change', syncPreference)
      document.removeEventListener('visibilitychange', visibility)
      reveals.forEach(node => node.classList.remove('zx-reveal-pending'))
    }
  }, [])

  // Pointer depth runs only while settling to a new position, never as an idle loop.
  useEffect(() => {
    const scene = root.current?.querySelector<HTMLElement>('[data-depth]')
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')
    if (!scene || reduced || !finePointer.matches) return
    let frame = 0
    let currentX = 0
    let currentY = 0
    let targetX = 0
    let targetY = 0
    let previousTime = 0
    const paint = (time: number) => {
      const smoothing = 1 - Math.exp(-Math.min(time - previousTime || 16, 50) / 115)
      previousTime = time
      currentX += (targetX - currentX) * smoothing
      currentY += (targetY - currentY) * smoothing
      scene.style.setProperty('--depth-x', currentX.toFixed(4))
      scene.style.setProperty('--depth-y', currentY.toFixed(4))
      scene.style.setProperty('--light-x', `${50 + currentX * 18}%`)
      scene.style.setProperty('--light-y', `${50 + currentY * 14}%`)
      if (Math.abs(targetX - currentX) + Math.abs(targetY - currentY) > .002) frame = requestAnimationFrame(paint)
      else frame = 0
    }
    const start = () => { if (!frame) { previousTime = 0; frame = requestAnimationFrame(paint) } }
    const move = (event: PointerEvent) => {
      const bounds = scene.getBoundingClientRect()
      targetX = ((event.clientX - bounds.left) / bounds.width - .5) * 2
      targetY = ((event.clientY - bounds.top) / bounds.height - .5) * 2
      start()
    }
    const reset = () => { targetX = 0; targetY = 0; start() }
    const stopWhenHidden = () => {
      if (!document.hidden) return
      cancelAnimationFrame(frame)
      frame = 0
      currentX = currentY = targetX = targetY = 0
      scene.style.setProperty('--depth-x', '0')
      scene.style.setProperty('--depth-y', '0')
    }
    scene.addEventListener('pointermove', move, { passive: true })
    scene.addEventListener('pointerleave', reset)
    document.addEventListener('visibilitychange', stopWhenHidden)
    return () => {
      cancelAnimationFrame(frame)
      scene.removeEventListener('pointermove', move)
      scene.removeEventListener('pointerleave', reset)
      document.removeEventListener('visibilitychange', stopWhenHidden)
      scene.style.setProperty('--depth-x', '0')
      scene.style.setProperty('--depth-y', '0')
      scene.style.removeProperty('--light-x')
      scene.style.removeProperty('--light-y')
    }
  }, [reduced])

  return (
    <div className="zx-home" ref={root} style={speed && speed > 0 ? { '--zenx-motion-speed': speed } as CSSProperties : undefined} data-motion={reduced ? 'reduced' : 'playing'}>
      {children}
    </div>
  )
}
