'use client'

import { useRef, useState } from 'react'
import { ArrowDown, ArrowUpRight, Check, CheckCheck, Layers3, Store } from 'lucide-react'
import { pricing } from '@/content/pages'
import { site, telHref } from '@/content/site'
import { ContactForm } from './contact-form'

export function PricingInquiry() {
  const [selected, setSelected] = useState('Help me choose')
  const [subject, setSubject] = useState('Help me choose a ZenxPOS plan')
  const quoteHeading = useRef<HTMLHeadingElement>(null)

  function choose(plan: string, scroll = true) {
    setSelected(plan)
    setSubject(plan === 'Help me choose' ? 'Help me choose a ZenxPOS plan' : `Request a quote for ZenxPOS ${plan}`)
    if (scroll && quoteHeading.current) {
      quoteHeading.current.focus({ preventScroll: true })
      document.getElementById('quote')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })
    }
  }

  return <>
    <section className="zx-pricing-plans zx-pricing-shell" id="plans" aria-labelledby="plans-title">
      <div className="zx-pricing-section-heading"><div><p className="zx-pricing-eyebrow">TWO STARTING POINTS. YOUR PERFECT FIT.</p><h2 id="plans-title">Choose your direction.</h2></div><p>Your quote brings together the software, setup and support your business needs.</p></div>
      <div className="zx-pricing-grid">
        {pricing.plans.map((plan, index) => <article className={`zx-plan-card${index ? ' zx-plan-card--premium' : ''}`} key={plan.name}>
          <div className="zx-plan-top"><span className="zx-plan-icon">{index ? <Layers3 size={24} aria-hidden /> : <Store size={24} aria-hidden />}</span><span>0{index + 1}</span></div>
          <p className="zx-plan-eyebrow">{plan.eyebrow}</p><h3>{plan.name}</h3><p className="zx-plan-description">{plan.text}</p>
          <div className="zx-plan-quote"><strong>Built around your business.</strong><span>Personalised pricing, confirmed in your quote.</span></div>
          <button type="button" className="zx-plan-button" onClick={() => choose(plan.name)} aria-label={`Request Quote for ${plan.name}`}>Request Quote<ArrowUpRight size={18} aria-hidden /></button>
          <p className="zx-plan-audience">{plan.audience}</p><ul>{plan.features.map(feature => <li key={feature}><Check size={16} aria-hidden />{feature}</li>)}</ul>
        </article>)}
      </div>
      <a className="zx-pricing-compare-link" href="#comparison">See the plans side by side<ArrowDown size={16} aria-hidden /></a>
    </section>

    <section className="zx-pricing-comparison" id="comparison" aria-labelledby="comparison-title">
      <div className="zx-pricing-shell">
        <div className="zx-pricing-section-heading"><div><p className="zx-pricing-eyebrow">THE DETAILS, AT A GLANCE</p><h2 id="comparison-title">A clearer comparison.</h2></div><p>Find your starting point. We’ll work through the details with you.</p></div>
        <div className="zx-comparison-scroll" role="region" aria-label="Standard and Premium feature comparison" tabIndex={0}>
          <table className="zx-comparison-table">
            <caption>Final inclusions, limits and integrations are confirmed in your quote.</caption>
            <thead><tr><th scope="col">Feature</th><th scope="col"><span>01</span> Standard</th><th scope="col"><span>02</span> Premium</th></tr></thead>
            <tbody>{pricing.comparison.map(row => <tr key={row.feature}><th scope="row">{row.feature}</th><td>{row.standard === 'Available' && <CheckCheck size={16} aria-hidden />}{row.standard}</td><td>{row.premium === 'Available' && <CheckCheck size={16} aria-hidden />}{row.premium}</td></tr>)}</tbody>
            <tfoot><tr><th scope="row">Your next step</th><td><button type="button" onClick={() => choose('Standard')} aria-label="Request Quote for Standard from comparison">Request Quote<ArrowUpRight size={15} aria-hidden /></button></td><td><button type="button" onClick={() => choose('Premium')} aria-label="Request Quote for Premium from comparison">Request Quote<ArrowUpRight size={15} aria-hidden /></button></td></tr></tfoot>
          </table>
        </div>
      </div>
    </section>

    <section className="zx-pricing-quote zx-pricing-shell" id="quote" aria-labelledby="quote-title">
      <div className="zx-pricing-quote-copy">
        <p className="zx-pricing-eyebrow">LET’S MAKE IT YOURS</p><h2 id="quote-title" tabIndex={-1} ref={quoteHeading}>Your business.<br /><em>Your next move.</em></h2>
        <p>Tell us what you have in mind. We’ll explore your requirements and put together a quote for your setup.</p>
        <ol className="zx-quote-steps"><li><span>01</span><div><strong>Start with your needs</strong><p>Your business, locations and everyday workflows.</p></div></li><li><span>02</span><div><strong>Find the right setup</strong><p>Explore software, compatible devices and onboarding.</p></div></li><li><span>03</span><div><strong>Get a personalised quote</strong><p>Review the scope and next steps with our team.</p></div></li></ol>
        <label className="zx-quote-selector" htmlFor="quote-plan">Which plan are you exploring?<select id="quote-plan" value={selected} onChange={event => choose(event.target.value, false)}><option>Help me choose</option><option>Standard</option><option>Premium</option></select></label>
        <div className="zx-quote-call"><span>Prefer a conversation?</span><a href={telHref(site.phones[0]!)}>{site.phones[0]}<ArrowUpRight size={16} aria-hidden /></a></div>
      </div>
      <ContactForm mode="quote" selectedSolution={selected} subject={subject} onSubjectChange={setSubject} />
    </section>
  </>
}
