'use client'

import { useEffect, useRef, useState } from 'react'
import { BarChart3, Check, CreditCard, Grid2X2, Plus, RotateCcw, ScanLine, ShoppingBag, Store } from 'lucide-react'
import './pos-demo.css'

const products = [
  { id: 'coffee', name: 'Cappuccino', price: 140, category: 'Drinks', tone: 'coffee' },
  { id: 'croissant', name: 'Butter croissant', price: 110, category: 'Bakery', tone: 'croissant' },
  { id: 'sandwich', name: 'Club sandwich', price: 180, category: 'Bakery', tone: 'sandwich' },
  { id: 'iced', name: 'Iced latte', price: 160, category: 'Drinks', tone: 'iced' },
] as const

type ProductId = typeof products[number]['id']
type CartItem = { id: ProductId; quantity: number }
const starterCart: CartItem[] = [{ id: 'coffee', quantity: 1 }]
const sampleCart: CartItem[] = [...starterCart, { id: 'croissant', quantity: 1 }]
const stages = ['Scan an item', 'Build the bill', 'Take payment', 'Print & go']
const stageDurations = [2600, 2400, 2200, 3600]
const money = (amount: number) => `₹${amount.toLocaleString('en-IN')}`

/** A browser-only product illustration: all orders and payments are sample data. */
export function PosDemo({ compact = false }: { compact?: boolean }) {
  const sceneRef = useRef<HTMLDivElement>(null)
  const [cart, setCart] = useState<CartItem[]>(starterCart)
  const [category, setCategory] = useState('All items')
  const [stage, setStage] = useState(0)
  const [visible, setVisible] = useState(false)
  const [pageVisible, setPageVisible] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(true)
  const [interactionRevision, setInteractionRevision] = useState(0)
  const [idleHold, setIdleHold] = useState(false)
  const manualSale = useRef(false)
  const running = visible && pageVisible && !reducedMotion
  const paid = stage >= 2
  const total = cart.reduce((sum, item) => sum + products.find(product => product.id === item.id)!.price * item.quantity, 0)
  const count = cart.reduce((sum, item) => sum + item.quantity, 0)

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotion = () => setReducedMotion(preference.matches)
    const updateVisibility = () => setPageVisible(!document.hidden)
    updateMotion()
    updateVisibility()
    preference.addEventListener('change', updateMotion)
    document.addEventListener('visibilitychange', updateVisibility)
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.12 })
    if (sceneRef.current) observer.observe(sceneRef.current)
    return () => {
      observer.disconnect()
      preference.removeEventListener('change', updateMotion)
      document.removeEventListener('visibilitychange', updateVisibility)
    }
  }, [])

  useEffect(() => {
    if (!running || !sceneRef.current) return
    const configuredSpeed = Number.parseFloat(window.getComputedStyle(sceneRef.current).getPropertyValue('--zenx-motion-speed'))
    const motionSpeed = configuredSpeed > 0 ? configuredSpeed : 1.1
    const timer = window.setTimeout(() => {
      const nextStage = (stage + 1) % stages.length
      setIdleHold(false)
      setStage(nextStage)
      if (nextStage === 0) {
        manualSale.current = false
        setCart(starterCart)
        setCategory('All items')
      } else if (!manualSale.current) {
        setCart(sampleCart)
      }
    }, idleHold ? 4500 : stageDurations[stage] / motionSpeed)
    return () => window.clearTimeout(timer)
  }, [running, stage, idleHold, interactionRevision])

  function takeControl() {
    // Keep the sample basket stable while someone tries the counter, then resume.
    setIdleHold(true)
    setInteractionRevision(current => current + 1)
  }

  function addProduct(id: ProductId) {
    takeControl()
    manualSale.current = true
    setStage(1)
    setCart(current => {
      const existing = paid ? [] : current
      return existing.some(item => item.id === id)
        ? existing.map(item => item.id === id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...existing, { id, quantity: 1 }]
    })
  }

  function resetSale() {
    takeControl()
    manualSale.current = false
    setCart([])
    setStage(0)
  }

  return (
    <div ref={sceneRef} className={`pos-demo${compact ? ' pos-demo--compact' : ''}`} data-running={running} data-stage={stage}>
      <div className="pos-orbit pos-orbit--one" aria-hidden />
      <div className="pos-orbit pos-orbit--two" aria-hidden />
      <div className="pos-hardware-glow" aria-hidden />
      <div className="pos-floating-label"><span className="pos-status-dot" /> Your counter. Connected.</div>

      <div className="pos-tablet">
        <div className="pos-camera" aria-hidden />
        <div className="pos-screen">
          <div className="pos-toolbar">
            <span className="pos-wordmark">zenx<span>POS</span></span>
            <span className="pos-store"><Store size={11} aria-hidden /> The Daily Grind</span>
            <span className="pos-sample">SAMPLE DEMO</span>
          </div>
          <div className="pos-workspace">
            <div className="pos-sidebar" aria-hidden>
              <span className="pos-sidebar-active"><Grid2X2 size={17} /></span>
              <ShoppingBag size={17} />
              <BarChart3 size={17} />
              <span className="pos-sidebar-avatar">DG</span>
            </div>
            <div className="pos-catalog">
              <div className="pos-catalog-heading"><div><span className="pos-mini-label">YOUR COUNTER. IN CONTROL.</span><h3>Ready for the rush.</h3></div><span className="pos-sun" aria-hidden>✳</span></div>
              <div className="pos-categories" role="group" aria-label="Product categories">
                {['All items', 'Drinks', 'Bakery'].map(item => <button key={item} type="button" aria-pressed={category === item} onClick={() => { takeControl(); setCategory(item) }}>{item}</button>)}
              </div>
              <div className="pos-products">
                {products.filter(product => category === 'All items' || product.category === category).map(product => (
                  <button key={product.id} type="button" className={`pos-product pos-product--${product.tone}`} onClick={() => addProduct(product.id)} aria-label={`Add ${product.name}, ${money(product.price)}`}>
                    <span className="pos-product-art"><ProductArt kind={product.id} />{product.id === 'coffee' && stage === 0 && <span className="pos-scan-ray" />}</span>
                    <span className="pos-product-name">{product.name}</span>
                    <span className="pos-product-bottom"><span>{money(product.price)}</span><Plus size={12} aria-hidden /></span>
                  </button>
                ))}
              </div>
              <div className="pos-catalog-note"><ScanLine size={13} aria-hidden /><span>Scan. Select. Sell. It’s that simple.</span></div>
            </div>
            <div className="pos-order">
              <div className="pos-order-heading"><h3>Current order</h3><button type="button" onClick={resetSale} aria-label="Start a new sample sale" title="New sale"><RotateCcw size={13} aria-hidden /></button></div>
              <p className="pos-order-number">#ZX-0042 <span>Takeaway</span></p>
              <div className="pos-cart-items">
                {cart.length === 0 ? <p className="pos-empty">A fresh start.<br />Tap an item to begin.</p> : cart.map(item => {
                  const product = products.find(entry => entry.id === item.id)!
                  return <div className="pos-cart-item" key={item.id}><span className={`pos-cart-thumbnail pos-cart-thumbnail--${product.tone}`}><ProductArt kind={product.id} /></span><span className="pos-cart-description"><strong>{product.name}</strong><span>{item.quantity} × {money(product.price)}</span></span><b>{money(product.price * item.quantity)}</b></div>
                })}
              </div>
              <div className="pos-order-summary"><span>{count} {count === 1 ? 'item' : 'items'}</span><span>Sample order</span></div>
              <div className="pos-total"><span>Total</span><strong>{money(total)}</strong></div>
              <button type="button" className={`pos-pay${paid ? ' pos-pay--paid' : ''}`} disabled={!cart.length || paid} onClick={() => { takeControl(); setStage(3) }}>{paid ? <Check size={14} aria-hidden /> : <CreditCard size={14} aria-hidden />}{paid ? 'Payment complete' : `Pay ${money(total)}`}</button>
              <p className="pos-payment-note">Demo only · no real payment</p>
            </div>
          </div>
          <div className="pos-screen-footer"><span><i /> Ready for the next customer</span><span>Made for your everyday.</span></div>
        </div>
      </div>
      <div className="pos-tablet-stand" aria-hidden><span /></div>

      <div className={`pos-success${paid ? ' pos-success--visible' : ''}`} aria-hidden>
        <span><Check size={17} /></span><div><strong>Payment confirmed.</strong><small>{money(total)} · Sample sale complete</small></div>
      </div>

      <div className="pos-printer" aria-hidden>
        <div className="pos-receipt-window"><div className={`pos-receipt${stage === 3 ? ' pos-receipt--printed' : ''}`}><strong>THE DAILY GRIND</strong><span>Thanks for stopping by.</span><div className="pos-receipt-rule" /><span>{count} items <b>{money(total)}</b></span><span>PAYMENT RECEIVED <Check size={8} /></span><div className="pos-barcode" /><span>See you again!</span></div></div>
        <div className="pos-printer-body"><div className="pos-printer-slot" /><span className="pos-printer-name">zenx<span>print</span></span><span className="pos-printer-light" /></div>
      </div>

      <div className="pos-demo-caption">
        <span className="pos-stage-label" aria-live={idleHold ? 'polite' : 'off'}><span className="pos-stage-number">0{stage + 1}</span>{stages[stage]}<span className="pos-stage-dots" aria-hidden>{stages.map((_, index) => <i key={index} className={index === stage ? 'is-active' : index < stage ? 'is-complete' : ''} />)}</span></span>
      </div>
    </div>
  )
}

function ProductArt({ kind }: { kind: ProductId }) {
  if (kind === 'coffee') return <svg viewBox="0 0 110 76" fill="none" aria-hidden><ellipse cx="53" cy="65" rx="34" ry="6" fill="#d8bca7" opacity=".4" /><path d="M75 30h9c15 0 13 25-4 25h-6" stroke="#fffaf3" strokeWidth="8" /><path d="M29 29h49l-4 25c-2 13-36 13-39 0l-6-25Z" fill="#fffaf3" /><ellipse cx="53.5" cy="29" rx="24.5" ry="8" fill="#e7d6be" /><ellipse cx="53.5" cy="29" rx="20" ry="5.7" fill="#9c603e" /><path d="M43 27c4-7 12 0 11 4 0-4 8-11 12-4-2 5-12 7-12 7s-10-2-11-7Z" fill="#f5e6cc" /><path d="M47 16c-8-8 7-8 0-15M62 17c-8-8 7-8 0-15" stroke="#fffaf3" strokeWidth="2" strokeLinecap="round" opacity=".7" /></svg>
  if (kind === 'croissant') return <svg viewBox="0 0 110 76" fill="none" aria-hidden><ellipse cx="55" cy="63" rx="39" ry="6" fill="#cfb781" opacity=".25" /><path d="M21 44c-8 21 17 21 22 10l-2-17-20 7ZM88 44c8 21-17 21-22 10l2-17 20 7Z" fill="#d58b3e" /><path d="m27 29 14-7 14 9-9 26-17-5-7-12 5-11ZM83 29l-14-7-14 9 9 26 17-5 7-12-5-11Z" fill="#efb45f" /><path d="m43 20 12-4 12 4 6 20-7 20H44l-7-20 6-20Z" fill="#f8c77a" /><path d="m47 22-4 18 5 13M30 33l-2 7 6 9M79 33l3 7-6 9" stroke="#ffe0a6" strokeWidth="4" strokeLinecap="round" /></svg>
  if (kind === 'sandwich') return <svg viewBox="0 0 110 76" fill="none" aria-hidden><ellipse cx="55" cy="65" rx="38" ry="6" fill="#b8c8a3" opacity=".3" /><path d="m20 52 35-36 35 36-35 12-35-12Z" fill="#bd7f3e" /><path d="m20 46 35-31 35 31-35 13-35-13Z" fill="#97af56" /><path d="m23 43 32-29 32 29-32 12-32-12Z" fill="#e58a67" /><path d="m20 36 35-27 35 27-35 14-35-14Z" fill="#f0c687" /><path d="m28 34 27-19 26 19-26 10-27-10Z" fill="#ffe2af" /><path d="M55 9v40" stroke="#dba86b" strokeWidth="2" /></svg>
  return <svg viewBox="0 0 110 76" fill="none" aria-hidden><ellipse cx="55" cy="66" rx="25" ry="5" fill="#b4b8d6" opacity=".3" /><path d="m35 20 5 42c1 8 29 8 30 0l5-42H35Z" fill="#f7eadb" /><path d="m38 33 3 27c1 5 26 5 27 0l3-27H38Z" fill="#b78360" /><path d="M37 26h36v8H37z" fill="#ede2d5" /><ellipse cx="55" cy="20" rx="20" ry="5" fill="#f5f3f0" /><path d="m58 24 6-20h11" stroke="#5d8390" strokeWidth="4" strokeLinecap="round" /><path d="m42 36 8-2 2 7-8 2-2-7ZM58 38l8-2 2 7-8 2-2-7Z" fill="#e5c6a6" opacity=".8" /></svg>
}
