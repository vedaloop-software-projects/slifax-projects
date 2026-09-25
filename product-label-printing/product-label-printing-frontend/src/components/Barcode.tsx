import { useEffect, useMemo, useRef } from 'react'
import JsBarcode from 'jsbarcode'
import { barcodeBars } from '../lib/barcodeLayout'

interface Props {
  value: string
  format?: 'CODE128' | 'EAN13'
  height?: number
  width?: number
  fontSize?: number
  displayValue?: boolean
  className?: string
  /** Fill the label's available width and height; keep the caption unstretched. */
  fillHeight?: boolean
}

export function Barcode(props: Props) {
  return props.fillHeight ? <FullWidthBarcode {...props} /> : <NaturalBarcode {...props} />
}

/** React owns the bars, so edits/remounts cannot leave an empty imperative SVG. */
function FullWidthBarcode({ value, format = 'CODE128', displayValue = true, className }: Props) {
  const bars = useMemo(() => {
    const fmt = format === 'EAN13' && /^\d{12,13}$/.test(value) ? 'EAN13' : 'CODE128'
    try { return barcodeBars(value || '0', fmt, 1000) }
    catch {
      try { return barcodeBars(value || '0', 'CODE128', 1000) }
      catch { return null }
    }
  }, [value, format])
  return <div className={className} style={{ width: '100%', height: '100%', display: 'grid', gridTemplateRows: displayValue ? 'minmax(0, 1fr) auto' : 'minmax(0, 1fr)', minHeight: 0 }}>
    <div style={{ position: 'relative', minHeight: 0 }}>
      {bars ? <svg role="img" aria-label={`Barcode ${value}`} viewBox="0 0 1000 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}>
        <g fill="#000000">{bars.map((bar) => <rect key={bar.x} x={bar.x} y={0} width={bar.width} height={100} />)}</g>
      </svg> : <span role="alert">Invalid barcode</span>}
    </div>
    {displayValue && <span style={{ textAlign: 'center', fontFamily: 'Arial', lineHeight: 1.1 }}>{value}</span>}
  </div>
}

function NaturalBarcode({ value, format = 'CODE128', height = 40, width = 1.4, fontSize = 11, displayValue = true, className }: Props) {
  const ref = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const fmt = format === 'EAN13' && /^\d{12,13}$/.test(value) ? 'EAN13' : 'CODE128'
    try {
      JsBarcode(ref.current, value || '0', { format: fmt, height, width, fontSize, displayValue, margin: 0, marginLeft: width * 10, marginRight: width * 10, background: 'transparent', textMargin: 1, font: 'Arial' })
    } catch {
      JsBarcode(ref.current, value || '0', { format: 'CODE128', height, width, fontSize, displayValue, margin: 0, marginLeft: width * 10, marginRight: width * 10, background: 'transparent' })
    }
  }, [value, format, height, width, fontSize, displayValue])

  return <svg ref={ref} className={className} style={{ maxWidth: '100%', height: 'auto' }} />
}
