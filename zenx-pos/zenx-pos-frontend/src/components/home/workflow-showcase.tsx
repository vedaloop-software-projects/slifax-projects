'use client'

import Link from 'next/link'
import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { ArrowUpRight, Check, CheckCheck, Printer, ScanLine, ShoppingBag, TrendingUp } from 'lucide-react'
import { workflowSteps } from '@/content/experience'
import './workflow-showcase.css'

export function WorkflowShowcase() {
  const [active, setActive] = useState(0)
  const id = useId()
  const tabs = useRef<Array<HTMLButtonElement | null>>([])

  function onTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index
    if (event.key === 'ArrowRight') next = (index + 1) % workflowSteps.length
    else if (event.key === 'ArrowLeft') next = (index - 1 + workflowSteps.length) % workflowSteps.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = workflowSteps.length - 1
    else return
    event.preventDefault()
    setActive(next)
    tabs.current[next]?.focus()
  }

  return (
    <section id="in-action" className="zx-workflow zx-section" data-animate>
      <div className="zx-shell">
        <header className="zx-wf-heading">
          <p className="zx-eyebrow">SMALL MOMENTS. SMOOTHER BUSINESS.</p>
          <h2>It all just clicks.</h2>
          <p>From first scan to final thank you.</p>
        </header>
        <div className="zx-wf-tabs" role="tablist" aria-label="Explore the ZenxPOS workflow">
          {workflowSteps.map((step, index) => <button key={step.id} ref={node => { tabs.current[index] = node }} type="button" role="tab" id={`${id}-tab-${step.id}`} aria-selected={active === index} aria-controls={`${id}-panel-${step.id}`} tabIndex={active === index ? 0 : -1} onClick={() => setActive(index)} onKeyDown={event => onTabKey(event, index)}><step.icon size={17} aria-hidden /><span>{step.label}</span></button>)}
        </div>
        {workflowSteps.map((step, index) => (
          <div key={step.id} className="zx-wf-panel" role="tabpanel" id={`${id}-panel-${step.id}`} aria-labelledby={`${id}-tab-${step.id}`} tabIndex={0} hidden={active !== index}>
            <div className="zx-wf-copy">
              <p className="zx-wf-kicker">{step.eyebrow}</p>
              <h3>{step.title.split('\n').map((line, lineIndex) => <span key={line}>{lineIndex > 0 && <br />}{line}</span>)}</h3>
              <p className="zx-wf-description">{step.text}</p>
              <ul>{step.points.map(point => <li key={point}><Check size={15} aria-hidden />{point}</li>)}</ul>
              <Link href={step.id === 'print' || step.id === 'scan' ? '/hardware' : '/services'} className="zx-text-link">{step.id === 'report' ? 'Explore the possibilities' : 'Find your counter setup'}<ArrowUpRight size={17} aria-hidden /></Link>
            </div>
            <div className={`zx-wf-art zx-wf-art--${step.id}`} aria-hidden>
              <span className="zx-wf-demo-label">ILLUSTRATIVE DEMO</span>
              {step.id === 'scan' ? <ScanPreview /> : step.id === 'print' ? <PrintPreview /> : <ReportsPreview />}
              <div className="zx-wf-status"><span><Check size={13} /></span>{step.status}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function ScanPreview() {
  return <>
    <div className="zx-scan-bag"><div className="zx-scan-fold" /><div className="zx-scan-brand"><span>THE DAILY</span><strong>good stuff.</strong><span>OAT MILK · 1 LITRE</span></div><div className="zx-scan-label"><span>Little things. Better mornings.</span><Barcode /><b>8 90238 104260</b></div><div className="zx-scan-beam" /></div>
    <svg className="zx-scanner" viewBox="0 0 210 200" fill="none"><path d="m80 98 29-13 46 88c8 15-19 29-28 14L80 98Z" fill="#233e50" /><path d="m88 101 15-7 37 78c4 8-7 14-12 7l-40-78Z" fill="#426172" /><path d="m79 88 27-15 19 26-29 15-17-26Z" fill="#122b3a" /><path d="m22 42 79-24c7-2 15 1 18 8l18 42c3 7-1 15-8 18l-68 27c-6 3-13 0-17-5L13 62c-5-8 0-17 9-20Z" fill="#16384a" /><path d="m23 47 76-23c6-2 10 1 13 6l5 11-85 30-14-14c-3-4 0-8 5-10Z" fill="#426577" /><path d="m40 82 79-29 10 21-69 27c-3 1-6 0-8-2L40 82Z" fill="#0c222e" /><path d="m44 83 70-26 4 9-67 26-7-9Z" fill="#42dfff" /><path d="m107 107 10-5 9 16-10 5-9-16Z" fill="#42dfff" /></svg>
    <div className="zx-scan-result"><span><ShoppingBag size={18} /></span><div><strong>Oat milk</strong><small>1 item added to the bill</small></div><b>₹120</b></div>
    <span className="zx-wf-orbit-icon"><ScanLine size={20} /></span>
  </>
}

function PrintPreview() {
  return <>
    <div className="zx-print-paper-window"><div className="zx-print-paper"><span className="zx-print-wordmark">zenx<span>POS</span></span><strong>THE DAILY GRIND</strong><small>SAMPLE RECEIPT · #0042</small><div className="zx-print-rule" /><p><span>Cappuccino</span><b>₹140</b></p><p><span>Butter croissant</span><b>₹110</b></p><div className="zx-print-rule" /><p className="zx-print-total"><span>TOTAL</span><b>₹250</b></p><span className="zx-print-paid"><CheckCheck size={11} /> SAMPLE PAYMENT COMPLETE</span><Barcode /><small>A little receipt. A lovely day.</small></div></div>
    <div className="zx-printer-unit"><div className="zx-printer-top" /><div className="zx-printer-mouth" /><div className="zx-printer-face"><span>zenx<span>print</span></span><i /><div className="zx-printer-button" /></div><div className="zx-printer-foot zx-printer-foot--left" /><div className="zx-printer-foot zx-printer-foot--right" /></div>
    <div className="zx-print-badge"><Printer size={17} /><span>From paid<br /><strong>to printed.</strong></span></div>
  </>
}

function ReportsPreview() {
  const bars = [38, 58, 46, 75, 62, 89, 72]
  return <>
    <div className="zx-report-card"><div className="zx-report-top"><span><i /> Store overview</span><span>SAMPLE DATA</span></div><div className="zx-report-revenue"><span>Sales this week</span><strong>₹24,850<span>.00</span></strong></div><div className="zx-report-chart">{bars.map((height, index) => <div className="zx-report-column" key={index}><div className="zx-report-bar-space"><div className="zx-report-bar" style={{ height: `${height}%`, animationDelay: `${index * 90}ms` }} /></div><span>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}</span></div>)}</div><div className="zx-report-stats"><span>Orders<strong>148</strong></span><span>Items sold<strong>326</strong></span><span>Locations<strong>02</strong></span></div></div>
    <div className="zx-report-float"><TrendingUp size={18} /><span>A clearer view.<br /><strong>A smarter next step.</strong></span></div>
  </>
}

function Barcode() {
  return <svg viewBox="0 0 160 36" fill="currentColor" className="zx-wf-barcode">{[2, 5, 8, 14, 18, 21, 26, 31, 34, 39, 44, 48, 52, 57, 62, 66, 71, 75, 80, 85, 90, 94, 98, 103, 108, 113, 117, 121, 126, 131, 135, 141, 146, 151, 156].map((x, index) => <rect key={x} x={x} width={index % 3 === 0 ? 3 : 1.5} height={index < 3 || index > 31 ? 36 : 31} />)}</svg>
}
