import { QRCodeSVG } from 'qrcode.react'
import type { CSSProperties } from 'react'
import type { LabelElement, LabelTemplate, Product, ProductBatch, Shop } from '../types'
import { fmtDate } from '../lib/dates'
import { labelContentBox } from '../lib/labelLayout'
import { QR_ENABLED, barcodeValue, elementBox, elementText, labelFrame, shapeOf, type ElementData } from '../lib/freeLayout'
import { fitText } from '../lib/textFit'
import { screenMeasure } from '../lib/textMeasure'
import { fontCss } from '../lib/fonts'
import { printerFontPreview } from '../lib/printerFonts'
import { Barcode } from './Barcode'

interface LabelProps {
  template: Pick<LabelTemplate, 'widthMm' | 'heightMm' | 'fields' | 'barcodeType' | 'orientation' | 'marginsMm' | 'fieldGapMm' | 'elements'>
  product: Product
  batch?: ProductBatch | null
  shop?: Shop
  qrUrl?: string
  /** CSS pixels per millimetre for on-screen preview. 4 ≈ comfortable. */
  showMargins?: boolean
  scale?: number
  /** Render at true physical size (mm) — used when printing through the browser. */
  physical?: boolean
  /** Hairline border, to check alignment against the die-cut stock. */
  outline?: boolean
  /** Multiplies every text size — thermal printers need larger type to stay legible. */
  textScale?: number
}

/** Long names step down in size rather than getting cut off with an ellipsis. */
function fitName(text: string, base: number, comfortable = 22): number {
  const over = text.length - comfortable
  if (over <= 0) return base
  return Math.max(base * 0.62, base * (comfortable / text.length))
}

/** A single physical label, drawn at true aspect ratio (or true size when `physical`). */
export function Label(props: LabelProps) {
  if (props.template.elements) return <FreeLabel {...props} elements={props.template.elements} />
  return <StackedLabel {...props} />
}

/** What one element looks like; shared by the label preview and the template designer canvas. */
export function ElementContent({ el, data, template, k, uom, textScale = 1, placeholder = false }: {
  el: LabelElement
  data: ElementData
  template: Pick<LabelTemplate, 'barcodeType' | 'elements'>
  k: number
  uom: string
  textScale?: number
  /** Designer only: show a hint where a field is empty for the sample product (e.g. no batch). */
  placeholder?: boolean
}) {
  const shape = shapeOf(el.kind)
  if (shape === 'barcode') {
    return <Barcode value={barcodeValue(template, data.product)} format={template.barcodeType} displayValue={false} fillHeight />
  }
  if (shape === 'qr') {
    if (!QR_ENABLED) return null
    if (!data.qrUrl) return placeholder ? <div className="grid h-full w-full place-items-center border border-dashed border-slate-300 text-[10px] text-slate-400">QR</div> : null
    return <QRCodeSVG value={data.qrUrl} size={128} level="M" marginSize={0} style={{ width: '100%', height: '100%', display: 'block' }} />
  }
  const text = elementText(el, data)
  if (!text && !placeholder) return null
  // MRP is struck through when the label also shows a sale price (same as the classic layout).
  const strike = el.kind === 'mrp' && !!template.elements?.some((e) => e.kind === 'salePrice')
  // Long text shrinks, wraps and finally cuts with ".." so it never runs past its box.
  const family = printerFontPreview(el.printerFont) ?? fontCss(el.fontFamily)
  const fit = text ? fitText(text, { widthMm: el.wMm, heightMm: el.hMm, fontMm: (el.fontMm ?? 2.4) * textScale, measure: screenMeasure(!!el.bold, family) }) : null
  const style: CSSProperties = {
    fontSize: `${+((fit?.fontMm ?? (el.fontMm ?? 2.4) * textScale) * k).toFixed(3)}${uom}`,
    fontWeight: el.bold ? 700 : 400,
    textAlign: el.align ?? 'left',
    lineHeight: 1.15,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    width: '100%',
    height: '100%',
    fontFamily: family,
    color: text ? undefined : '#94a3b8',
  }
  if (!text || !fit) return <div style={style}>{`(${el.kind === 'batchCode' ? 'no batch' : 'empty'})`}</div>
  if (strike && fit.lines.length === 1 && !fit.truncated) {
    const value = `₹${data.product.mrp}`
    const prefix = text.slice(0, text.length - value.length)
    return <div style={style}>{prefix}<span style={{ textDecoration: 'line-through' }}>{value}</span></div>
  }
  return (
    <div style={style}>
      {fit.lines.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </div>
  )
}

/** Designer layout: every element at its own position and size. */
function FreeLabel({ template, product, batch, shop, qrUrl, scale = 4, physical, outline, textScale = 1, elements }: LabelProps & { elements: LabelElement[] }) {
  const frame = labelFrame(template)
  const uom = physical ? 'mm' : 'px'
  const k = physical ? 1 : scale
  const data: ElementData = { product, batch, shop, qrUrl }
  return (
    <div
      className="label-paper relative overflow-hidden"
      style={{
        width: `${frame.width * k}${uom}`,
        height: `${frame.height * k}${uom}`,
        boxSizing: 'border-box',
        borderRadius: physical ? 0 : 3,
        outline: outline ? '0.2mm dashed #999' : undefined,
        outlineOffset: '-0.1mm',
      }}
    >
      {elements.map((el) => (
        <div key={el.id} style={elementBox(el, k, uom)}>
          <ElementContent el={el} data={data} template={template} k={k} uom={uom} textScale={textScale} />
        </div>
      ))}
    </div>
  )
}

/** Classic layout: switched-on fields stacked top to bottom. */
function StackedLabel({ template, product, batch, shop, qrUrl, scale = 4, physical, outline, textScale = 1, showMargins = false }: LabelProps) {
  const box = labelContentBox(template)
  const portrait = template.orientation === 'PORTRAIT'
  const wMm = portrait ? Math.min(template.widthMm, template.heightMm) : Math.max(template.widthMm, template.heightMm)
  const hMm = portrait ? Math.max(template.widthMm, template.heightMm) : Math.min(template.widthMm, template.heightMm)
  // Physical output is measured in mm so the driver prints at exact size;
  // on screen we scale mm → px. Every inner size derives from `unit`.
  const uom = physical ? 'mm' : 'px'
  const k = physical ? 1 : scale
  const w = wMm * k
  const h = hMm * k
  const unit = template.marginsMm || template.fieldGapMm !== undefined
    ? Math.min(h / 25, box.contentHeight * k / 22.8, box.contentWidth * k / 47.8)
    : h / 25
  const u = (n: number) => `${+(unit * n * textScale).toFixed(3)}${uom}`
  const f = template.fields
  const packed = batch?.packedDate ?? product.packedDate
  const expiry = batch ? batch.expiryDate : product.expiryDate
  const showQr = QR_ENABLED && f.qr && !!qrUrl
  const qrSide = Math.min(box.contentHeight * k * (portrait ? 0.34 : 0.52), box.contentWidth * k * 0.34)
  const code = template.barcodeType === 'EAN13' && product.eanCode ? product.eanCode : product.productCode

  return (
    <div
      className="label-paper relative"
      style={{
        width: `${w}${uom}`,
        height: `${h}${uom}`,
        boxSizing: 'border-box',
        padding: [box.margins.top, box.margins.right, box.margins.bottom, box.margins.left].map((v) => `${v * k}${uom}`).join(' '),
        fontSize: u(2.3),
        borderRadius: physical ? 0 : 3,
        outline: outline ? '0.2mm dashed #999' : undefined,
        outlineOffset: '-0.1mm',
      }}
    >
      {showMargins && <div aria-hidden="true" style={{ position: 'absolute', pointerEvents: 'none', top: box.margins.top * k, right: box.margins.right * k, bottom: box.margins.bottom * k, left: box.margins.left * k, border: '1px dashed #0b8a65', zIndex: 1 }} />}
      <div className={portrait ? 'flex h-full flex-col' : 'flex h-full gap-[4%]'}>
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden" style={{ rowGap: `${box.gap * k}${uom}` }}>
          {f.shopName && shop && (
            <div className="shrink-0 truncate text-center font-bold" style={{ fontSize: u(fitName(shop.name, 2.5)) }}>
              {shop.name}
            </div>
          )}
          {f.address && shop && (
            <div className="shrink-0 truncate text-center" style={{ fontSize: u(2.1) }}>
              {shop.location.toUpperCase()}
            </div>
          )}
          {f.productName && (
            <div className="shrink-0 truncate font-bold" style={{ fontSize: u(fitName(product.name, 3.4, 16)) }}>
              {product.name}
            </div>
          )}
          {(f.mrp || f.salePrice) && (
            <div className="flex shrink-0 gap-[6%] font-bold whitespace-nowrap" style={{ fontSize: u(2.6) }}>
              {f.mrp && (
                <span>
                  MRP <span className={f.salePrice ? 'line-through' : 'font-bold'}>₹{product.mrp}</span>
                </span>
              )}
              {f.salePrice && <span className="font-bold">SALE ₹{product.salePrice}</span>}
            </div>
          )}
          {f.barcode && (
            <div className="mt-[2%] min-h-0 flex-1 py-[1%]">
              <Barcode value={code} format={template.barcodeType} height={60} width={2} fontSize={f.productCode ? 20 : 0} displayValue={f.productCode} fillHeight />
            </div>
          )}
          {!f.barcode && f.productCode && <div className="shrink-0 font-bold" style={{ fontSize: u(2.4) }}>{product.productCode}</div>}
          {(f.packedDate || f.expiryDate || f.batchCode) && (
            <div className="flex shrink-0 flex-wrap gap-x-[6%] whitespace-nowrap" style={{ fontSize: u(2.1) }}>
              {f.packedDate && <span>Packed: {fmtDate(packed, true)}</span>}
              {f.expiryDate && expiry && <span>Expiry: {fmtDate(expiry, true)}</span>}
              {f.batchCode && batch && <span>Batch: {batch.batchCode}</span>}
            </div>
          )}
        </div>
        {showQr && (
          <div className={portrait ? 'mt-[3%] flex shrink-0 justify-center' : 'flex shrink-0 items-center'}>
            <span style={{ width: `${qrSide}${uom}`, height: `${qrSide}${uom}`, display: 'block' }}>
              <QRCodeSVG value={qrUrl!} size={128} level="M" marginSize={0} style={{ width: '100%', height: '100%', display: 'block' }} />
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

interface RollProps extends Omit<LabelProps, 'template'> {
  template: LabelProps['template'] & { columns: 1 | 2 | 3; gapMm?: number }
  rows?: number
}

/** 1UP / 2UP / 3UP roll preview (labels side by side on the liner). */
export function LabelRoll({ template, rows = 1, ...rest }: RollProps) {
  // Show the real die-cut gap so the preview matches the stock on the roll.
  const gapPx = (template.gapMm ?? 2) * (rest.scale ?? 4)
  return (
    <div className="label-sheet inline-flex flex-col gap-3 rounded-xl p-4">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex" style={{ gap: gapPx }}>
          {Array.from({ length: template.columns }, (_, c) => (
            <Label key={c} template={template} {...rest} />
          ))}
        </div>
      ))}
    </div>
  )
}
