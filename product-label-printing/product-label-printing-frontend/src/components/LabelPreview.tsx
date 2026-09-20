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
  /** CSS pixels per millimetre. 4 ≈ comfortable on-screen size. */
  scale?: number
}

/** A single physical label, drawn at true aspect ratio. */
export function Label({ template, product, batch, shop, qrUrl, scale = 4 }: LabelProps) {
  const portrait = template.orientation === 'PORTRAIT'
  const wMm = portrait ? Math.min(template.widthMm, template.heightMm) : Math.max(template.widthMm, template.heightMm)
  const hMm = portrait ? Math.max(template.widthMm, template.heightMm) : Math.min(template.widthMm, template.heightMm)
  const w = wMm * scale
  const h = hMm * scale
  const f = template.fields
  const packed = batch?.packedDate ?? product.packedDate
  const expiry = batch ? batch.expiryDate : product.expiryDate
  const unit = h / 25 // text scales with label height
  const showQr = f.qr && !!qrUrl
  const qrSize = Math.min(h * (portrait ? 0.34 : 0.52), w * 0.34)
  const code = template.barcodeType === 'EAN13' && product.eanCode ? product.eanCode : product.productCode

  return (
    <div className="label-paper relative rounded-[3px]" style={{ width: w, height: h, padding: unit * 1.1, fontSize: unit * 2.3 }}>
      <div className={portrait ? 'flex h-full flex-col' : 'flex h-full gap-[4%]'}>
        <div className="flex min-w-0 flex-1 flex-col">
          {f.shopName && shop && (
            <div className="shrink-0 truncate font-bold tracking-tight" style={{ fontSize: unit * 2.2 }}>
              {shop.name}
            </div>
          )}
          {f.address && shop && (
            <div className="shrink-0 truncate" style={{ fontSize: unit * 1.8 }}>
              {shop.location.toUpperCase()}
            </div>
          )}
          {f.productName && (
            <div className="mt-[2%] shrink-0 truncate font-bold" style={{ fontSize: unit * 2.8 }}>
              {product.name}
            </div>
          )}
          {(f.mrp || f.salePrice) && (
            <div className="flex shrink-0 gap-[8%] whitespace-nowrap" style={{ fontSize: unit * 2.2 }}>
              {f.mrp && (
                <span>
                  MRP <span className={f.salePrice ? 'line-through' : 'font-bold'}>₹{product.mrp}</span>
                </span>
              )}
              {f.salePrice && (
                <span className="font-bold">SALE ₹{product.salePrice}</span>
              )}
            </div>
          )}
          {f.barcode && (
            <div className="mt-[2%] min-h-0 flex-1 py-[1%]">
              <Barcode value={code} format={template.barcodeType} height={60} width={1.4} fontSize={f.productCode ? 16 : 0} displayValue={f.productCode} fillHeight />
            </div>
          )}
          {!f.barcode && f.productCode && <div style={{ fontSize: unit * 2 }}>{product.productCode}</div>}
          {(f.packedDate || f.expiryDate || f.batchCode) && (
            <div className="flex shrink-0 flex-wrap gap-x-[6%] whitespace-nowrap" style={{ fontSize: unit * 1.8 }}>
              {f.packedDate && <span>Packed: {fmtDate(packed, true)}</span>}
              {f.expiryDate && expiry && <span>Expiry: {fmtDate(expiry, true)}</span>}
              {f.batchCode && batch && <span>Batch: {batch.batchCode}</span>}
            </div>
          )}
        </div>
        {showQr && (
          <div className={portrait ? 'mt-[3%] flex justify-center' : 'flex shrink-0 items-center'}>
            <QRCodeSVG value={qrUrl!} size={qrSize} level="M" marginSize={0} />
          </div>
        )}
      </div>
    </div>
  )
}

interface RollProps extends Omit<LabelProps, 'template'> {
  template: LabelProps['template'] & { columns: 1 | 2 | 3 }
  rows?: number
}

/** 1UP / 2UP / 3UP roll preview (labels side by side on the liner). */
export function LabelRoll({ template, rows = 1, ...rest }: RollProps) {
  return (
    <div className="label-sheet inline-flex flex-col gap-3 rounded-xl p-4">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex gap-2">
          {Array.from({ length: template.columns }, (_, c) => (
            <Label key={c} template={template} {...rest} />
          ))}
        </div>
      ))}
    </div>
  )
}
