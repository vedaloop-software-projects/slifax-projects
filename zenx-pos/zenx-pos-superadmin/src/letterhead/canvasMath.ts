import { clampElement, shapeOf, type Frame, type LetterheadElement } from './model'

// Ported from the product-label designer: grid + edge/centre snapping and resize maths.
export const DRAG_KIND = 'application/x-letterhead-element'
export type Handle = 'nw' | 'ne' | 'sw' | 'se' | 'e' | 'w' | 'n' | 's'
export interface Gesture { mode: 'move' | 'resize'; handle?: Handle; start: LetterheadElement; x: number; y: number }
export interface Guide { axis: 'x' | 'y'; mm: number }

export const GRID_MM = 0.5
const GUIDE_MM = 1.2
const snap = (value: number, free: boolean) => (free ? value : Math.round(value / GRID_MM) * GRID_MM)

/** Snap an element being moved to the band edges/centre and to other elements. */
export function snapMove(element: LetterheadElement, others: LetterheadElement[], frame: Frame, free: boolean): { element: LetterheadElement; guides: Guide[] } {
  let xMm = snap(element.xMm, free), yMm = snap(element.yMm, free)
  const guides: Guide[] = []
  if (!free) {
    const best = (points: number[], targets: number[]) => {
      let hit: { delta: number; target: number } | null = null
      for (const point of points) for (const target of targets) {
        const delta = target - point
        if (Math.abs(delta) <= GUIDE_MM && (!hit || Math.abs(delta) < Math.abs(hit.delta))) hit = { delta, target }
      }
      return hit
    }
    // The 15 mm page margins are snap targets too, so content lines up with the invoice body.
    const xs = [0, 15, frame.width / 2, frame.width - 15, frame.width, ...others.flatMap(o => [o.xMm, o.xMm + o.wMm / 2, o.xMm + o.wMm])]
    const ys = [0, frame.height / 2, frame.height, ...others.flatMap(o => [o.yMm, o.yMm + o.hMm / 2, o.yMm + o.hMm])]
    const hx = best([xMm, xMm + element.wMm / 2, xMm + element.wMm], xs), hy = best([yMm, yMm + element.hMm / 2, yMm + element.hMm], ys)
    if (hx) { xMm += hx.delta; guides.push({ axis: 'x', mm: hx.target }) }
    if (hy) { yMm += hy.delta; guides.push({ axis: 'y', mm: hy.target }) }
  }
  return { element: clampElement({ ...element, xMm, yMm }, frame), guides }
}

/** New box for a resize drag. Text corners scale the font with the height. */
export function resizeElement(start: LetterheadElement, handle: Handle, dx: number, dy: number, frame: Frame, free: boolean): LetterheadElement {
  let { xMm, yMm, wMm, hMm } = start
  if (handle.includes('e')) wMm = start.wMm + dx
  if (handle.includes('w')) { xMm = start.xMm + dx; wMm = start.wMm - dx }
  if (handle.includes('s')) hMm = start.hMm + dy
  if (handle.includes('n')) { yMm = start.yMm + dy; hMm = start.hMm - dy }
  wMm = snap(wMm, free); hMm = snap(hMm, free)
  let fontMm = start.fontMm
  if (shapeOf(start.kind) === 'text' && handle.length === 2 && start.fontMm) fontMm = Math.max(1, start.fontMm * (hMm / start.hMm))
  return clampElement({ ...start, xMm, yMm, wMm, hMm, ...(fontMm !== undefined ? { fontMm } : {}) }, frame)
}
