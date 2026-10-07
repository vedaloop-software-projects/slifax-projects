import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button, Descriptions, Modal, Result } from 'antd'
import { useDb } from '../mock/db'
import { useSession } from '../hooks/useSession'
import { createScanDetector, findScannedProduct } from '../lib/scanner'
import { fmtDate } from '../lib/dates'
import { money } from '../lib/format'
import { ExpiryTag, Mono, ProductStatusTag } from './common'

function isEditable(el: EventTarget | null) {
  return el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}

/**
 * Shows the product for any label scanned with a USB (keyboard-mode) barcode scanner.
 * Works anywhere in the app except while typing in a form field, so scanning an
 * EAN into a product form still just fills the field. The header search counts as
 * a scan target (mark it with data-scan-search).
 */
export function ScanListener({ onScan }: { onScan?: () => void }) {
  const db = useDb()
  const { can } = useSession()
  const navigate = useNavigate()
  const [code, setCode] = useState<string | null>(null)

  useEffect(() => {
    const detector = createScanDetector()
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (isEditable(target) && !target?.closest('[data-scan-search]')) {
        detector.reset()
        return
      }
      const scanned = detector.key(e.key, e.timeStamp)
      if (!scanned) return
      // Stop the scanner's Enter from also clicking whatever button has focus.
      e.preventDefault()
      e.stopPropagation()
      if (target?.closest('[data-scan-search]')) (target as HTMLElement).blur()
      onScan?.()
      setCode(scanned)
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [onScan])

  const product = code ? findScannedProduct(db.products, code) : undefined
  const close = () => setCode(null)

  return (
    <Modal open={code !== null} onCancel={close} footer={null} width={480} destroyOnHidden>
      {product ? (
        <>
          <Result
            status="success"
            className="px-0! pt-2! pb-4!"
            title={product.name}
            subTitle={<>Scanned <Mono>{code}</Mono></>}
          />
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Product code"><Mono>{product.productCode}</Mono></Descriptions.Item>
            {product.eanCode && <Descriptions.Item label="EAN"><Mono>{product.eanCode}</Mono></Descriptions.Item>}
            <Descriptions.Item label="MRP / Sale price">{money(product.mrp)} / {money(product.salePrice)}</Descriptions.Item>
            <Descriptions.Item label="Packed">{fmtDate(product.packedDate)}</Descriptions.Item>
            <Descriptions.Item label="Expiry"><ExpiryTag date={product.expiryDate} /></Descriptions.Item>
            <Descriptions.Item label="Status"><ProductStatusTag status={product.status} /></Descriptions.Item>
          </Descriptions>
          <div className="mt-5 flex justify-end gap-2">
            <Button onClick={close}>Close</Button>
            {can('products.view') && <Button type="primary" onClick={() => { close(); navigate(`/products/${product.id}`) }}>Open product</Button>}
          </div>
        </>
      ) : (
        <Result
          status="warning"
          className="px-0! pt-2! pb-2!"
          title="No product matches this barcode"
          subTitle={<>Scanned <Mono>{code}</Mono>. Check that this label was printed from this shop's products.</>}
          extra={<Button onClick={close}>Close</Button>}
        />
      )}
    </Modal>
  )
}
