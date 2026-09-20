import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'

interface Props {
  value: string
  format?: 'CODE128' | 'EAN13'
  height?: number
  width?: number
  fontSize?: number
  displayValue?: boolean
  className?: string
  /** Scale to fill the parent's height instead of its width */
  fillHeight?: boolean
}

export function Barcode({ value, format = 'CODE128', height = 40, width = 1.4, fontSize = 11, displayValue = true, className, fillHeight }: Props) {
  const ref = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const fmt = format === 'EAN13' && /^\d{12,13}$/.test(value) ? 'EAN13' : 'CODE128'
    try {
      JsBarcode(ref.current, value || '0', { format: fmt, height, width, fontSize, displayValue, margin: 0, background: 'transparent', textMargin: 1, font: 'Arial' })
    } catch {
      JsBarcode(ref.current, value || '0', { format: 'CODE128', height, width, fontSize, displayValue, margin: 0, background: 'transparent' })
    }
  }, [value, format, height, width, fontSize, displayValue])

  return <svg ref={ref} className={className} style={fillHeight ? { height: '100%', width: 'auto', maxWidth: '100%', display: 'block' } : { maxWidth: '100%', height: 'auto' }} />
}
