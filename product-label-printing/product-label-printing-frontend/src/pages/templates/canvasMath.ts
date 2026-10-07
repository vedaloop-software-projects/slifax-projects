import type { LabelElement } from '../../types'
import { clampElement, shapeOf } from '../../lib/freeLayout'

/** dataTransfer type used when dragging a field from the palette onto the label. */
export const DRAG_KIND = 'application/x-label-element'

export type Handle = 'nw' | 'ne' | 'sw' | 'se' | 'e' | 'w'
type Frame = { width: number; height: number }
export interface Gesture {
  mode: 'move' | 'resize'
  handle?: Handle
  start: LabelElement
  x: number
  y: number
}
export interface Guide {
  axis: 'x' | 'y'
  mm: number
}

export const GRID_MM = 0.5
const GUIDE_MM = 0.8

const snap = (v: number, free: boolean) => (free ? v : Math.round(v / GRID_MM) * GRID_MM)

/** Snap an element being moved to the label edges/centre and to other elements. */
export function snapMove(el: LabelElement, others: LabelElement[], frame: Frame, free: boolean): { el: LabelElement; guides: Guide[] } {
  let xMm = snap(el.xMm, free)
  let yMm = snap(el.yMm, free)
  const guides: Guide[] = []
  if (!free) {
    const best = (points: number[], targets: number[]) => {
      let hit: { delta: number; target: number } | null = null
      for (const p of points) for (const t of targets) {
        const delta = t - p
        if (Math.abs(delta) <= GUIDE_MM && (!hit || Math.abs(delta) < Math.abs(hit.delta))) hit = { delta, target: t }
      }
      return hit
    }
    const xs = [0, frame.width / 2, frame.width, ...others.flatMap((o) => [o.xMm, o.xMm + o.wMm / 2, o.xMm + o.wMm])]
    const ys = [0, frame.height / 2, frame.height, ...others.flatMap((o) => [o.yMm, o.yMm + o.hMm / 2, o.yMm + o.hMm])]
    const hx = best([xMm, xMm + el.wMm / 2, xMm + el.wMm], xs)
    const hy = best([yMm, yMm + el.hMm / 2, yMm + el.hMm], ys)
    if (hx) {
      xMm += hx.delta
      guides.push({ axis: 'x', mm: hx.target })
    }
    if (hy) {
      yMm += hy.delta
      guides.push({ axis: 'y', mm: hy.target })
    }
  }
  return { el: clampElement({ ...el, xMm, yMm }, frame), guides }
}

/** New box for a resize drag. Text corners scale the font with the height (Canva-style). */
export function resizeElement(start: LabelElement, handle: Handle, dx: number, dy: number, frame: Frame, free: boolean): LabelElement {
  let { xMm, yMm, wMm, hMm } = start
  if (handle.includes('e')) wMm = start.wMm + dx
  if (handle.includes('w')) {
    xMm = start.xMm + dx
    wMm = start.wMm - dx
  }
  if (handle.includes('s')) hMm = start.hMm + dy
  if (handle.includes('n')) {
    yMm = start.yMm + dy
    hMm = start.hMm - dy
  }
  wMm = snap(wMm, free)
  hMm = snap(hMm, free)
  const shape = shapeOf(start.kind)
  if (shape === 'qr') {
    const side = Math.max(wMm, hMm)
    if (handle.includes('w')) xMm = start.xMm + start.wMm - side
    if (handle.includes('n')) yMm = start.yMm + start.hMm - side
    wMm = hMm = side
  }
  let fontMm = start.fontMm
  if (shape === 'text' && handle.length === 2 && start.fontMm) fontMm = Math.max(0.1, start.fontMm * (hMm / start.hMm))
  return clampElement({ ...start, xMm, yMm, wMm, hMm, ...(fontMm !== undefined ? { fontMm } : {}) }, frame)
}

