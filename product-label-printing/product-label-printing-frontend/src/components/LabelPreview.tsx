import { QRCodeSVG } from 'qrcode.react'
import type { LabelTemplate, Product, ProductBatch, Shop } from '../types'
import { fmtDate } from '../lib/dates'
import { Barcode } from './Barcode'

interface LabelProps {
  template: Pick<LabelTemplate, 'widthMm' | 'heightMm' | 'fields' | 'barcodeType' | 'orientation'>
  product: Product
  batch?: ProductBatch | null
  shop?: Shop
  qrUrl?: string
  /** CSS pixels per millimetre for on-screen preview. 4 ≈ comfortable. */
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
export function Label({ template, product, batch, shop, qrUrl, scale = 4, physical, outline, textScale = 1 }: LabelProps) {
  const portrait = template.orientation === 'PORTRAIT'
  const wMm = portrait ? Math.min(template.widthMm, template.heightMm) : Math.max(template.widthMm, template.heightMm)
  const hMm = portrait ? Math.max(template.widthMm, template.heightMm) : Math.min(template.widthMm, template.heightMm)
  // Physical output is measured in mm so the driver prints at exact size;
  // on screen we scale mm → px. Every inner size derives from `unit`.
  const uom = physical ? 'mm' : 'px'
  const k = physical ? 1 : scale
  const w = wMm * k
  const h = hMm * k
  const unit = h / 25
  const u = (n: number) => `${+(unit * n * textScale).toFixed(3)}${uom}`
  const f = template.fields
  const packed = batch?.packedDate ?? product.packedDate
  const expiry = batch ? batch.expiryDate : product.expiryDate
  const showQr = f.qr && !!qrUrl
  const qrSide = Math.min(h * (portrait ? 0.34 : 0.52), w * 0.34)
  const code = template.barcodeType === 'EAN13' && product.eanCode ? product.eanCode : product.productCode

  return (
    <div
      className="label-paper relative"
      style={{
        width: `${w}${uom}`,
        height: `${h}${uom}`,
        padding: u(1.1),
        fontSize: u(2.3),
        borderRadius: physical ? 0 : 3,
        outline: outline ? '0.2mm dashed #999' : undefined,
        outlineOffset: '-0.1mm',
      }}
    >
      <div className={portrait ? 'flex h-full flex-col' : 'flex h-full gap-[4%]'}>
        <div className="flex min-w-0 flex-1 flex-col">
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
