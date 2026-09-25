import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Label } from '../../src/components/LabelPreview'
import '../../src/index.css'

const template = {
  widthMm: 50, heightMm: 25, orientation: 'LANDSCAPE' as const, barcodeType: 'CODE128' as const,
  fields: { shopName: true, address: false, productName: true, mrp: true, salePrice: true, barcode: true, productCode: true, packedDate: true, expiryDate: true, batchCode: false, qr: false },
}
const product = { name: 'TOOR DAL 1KG', productCode: '00000401', mrp: 195, salePrice: 138, packedDate: '2026-09-02', expiryDate: '2026-12-02' }
const shop = { name: 'VIJAYA DURGA SUPER MARKET' }
function Fixture() {
  const [updated, setUpdated] = useState(false)
  return <>
    <button onClick={() => setUpdated(!updated)}>Change spacing and barcode</button>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, padding: 20 }}>
      {[false, true].flatMap((physical) => [true, false].map((caption) => <div key={`${physical}-${caption}`} data-label-case={`${physical ? 'physical' : 'preview'}-${caption ? 'caption' : 'bars'}`}>
        <Label physical={physical} scale={4.4} template={{ ...template, fields: { ...template.fields, productCode: caption }, ...(updated ? { marginsMm: { top: 1.5, right: 3, bottom: 2, left: 2 }, fieldGapMm: 0.2 } : {}) }} product={{ ...product, productCode: updated ? 'ALMONDS250' : product.productCode } as never} shop={shop as never} />
      </div>))}
    </div>
  </>
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Fixture /></React.StrictMode>)
