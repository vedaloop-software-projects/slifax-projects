import type { Measure } from './textFit'

let ctx: CanvasRenderingContext2D | null | undefined

/** Real text width of the label font (Arial) in the browser; an estimate elsewhere. */
export function screenMeasure(bold: boolean): Measure {
  return (text, fontMm) => {
    if (ctx === undefined) ctx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null
    if (!ctx) return text.length * fontMm * (bold ? 0.6 : 0.55)
    ctx.font = `${bold ? 700 : 400} 100px Arial, Helvetica, sans-serif`
    return (ctx.measureText(text).width / 100) * fontMm
  }
}
