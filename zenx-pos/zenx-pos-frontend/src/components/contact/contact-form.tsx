'use client'

import { useEffect, useId, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react'
import { ArrowUpRight, CircleCheck, LoaderCircle } from 'lucide-react'
import Link from 'next/link'
import { businessTypes, sendEnquiry, type BusinessType, type EnquiryInput } from '@/lib/api'
import './contact.css'

type FieldName = 'name' | 'businessName' | 'mobile' | 'email' | 'businessTypeId' | 'city' | 'subject' | 'message'
type Values = Record<FieldName, string>
type FormErrors = Partial<Record<FieldName, string>>
type ContactFormProps = {
  className?: string
  mode?: 'contact' | 'quote'
  initialSubject?: string
  subject?: string
  onSubjectChange?: (value: string) => void
  selectedSolution?: string
}
const emptyValues: Values = { name: '', businessName: '', mobile: '', email: '', businessTypeId: '', city: '', subject: '', message: '' }
const subscribeToHydration = () => () => {}
const clientReady = () => true
const serverReady = () => false

export function ContactForm({ className = '', mode = 'contact', initialSubject = '', subject, onSubjectChange, selectedSolution }: ContactFormProps) {
  const formId = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const submitting = useRef(false)
  const submission = useRef<{ fingerprint: string; id: string } | null>(null)
  const ready = useSyncExternalStore(subscribeToHydration, clientReady, serverReady)
  const [values, setValues] = useState<Values>({ ...emptyValues, subject: initialSubject })
  const [errors, setErrors] = useState<FormErrors>({})
  const [feedback, setFeedback] = useState('')
  const [status, setStatus] = useState<'idle' | 'pending' | 'error' | 'success'>('idle')
  const [types, setTypes] = useState<BusinessType[]>([])
  const activeSubject = subject ?? values.subject
  const availableMessageLength = 1000

  useEffect(() => {
    let active = true
    businessTypes().then(rows => { if (active) setTypes(rows) }).catch(() => undefined)
    return () => { active = false }
  }, [])

  function update(name: FieldName, value: string) {
    if (name === 'subject' && onSubjectChange) onSubjectChange(value)
    else setValues(current => ({ ...current, [name]: value }))
    setErrors(current => ({ ...current, [name]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    const cleaned = Object.fromEntries(Object.entries({ ...values, subject: activeSubject }).map(([name, value]) => [name, value.trim()])) as Values
    cleaned.mobile = cleaned.mobile.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '')
    const nextErrors: FormErrors = {}
    if (cleaned.name.length < 2 || cleaned.name.length > 255) nextErrors.name = 'Enter your name (2–255 characters).'
    if (cleaned.businessName.length < 2 || cleaned.businessName.length > 255) nextErrors.businessName = 'Enter your business name (2–255 characters).'
    if (!/^[6-9]\d{9}$/.test(cleaned.mobile)) nextErrors.mobile = 'Enter a valid Indian 10-digit mobile number.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned.email) || cleaned.email.length > 255) nextErrors.email = 'Enter a valid email address.'
    if (cleaned.city.length > 100) nextErrors.city = 'Keep your city name within 100 characters.'
    if (cleaned.subject.length < 3 || cleaned.subject.length > 100) nextErrors.subject = 'Add a subject (3–100 characters).'
    if (cleaned.message.length < 10) nextErrors.message = 'Tell us a little more (at least 10 characters).'
    if (cleaned.message.length > availableMessageLength) nextErrors.message = `Please shorten your message to ${availableMessageLength} characters.`
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      setStatus('error')
      setFeedback('Please check the highlighted fields and try again.')
      const firstField = Object.keys(nextErrors)[0]
      window.requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>(`[name="${firstField}"]`)?.focus())
      return
    }
    submitting.current = true
    setStatus('pending')
    setErrors({})
    setFeedback('')
    try {
      const input: Omit<EnquiryInput, 'submissionId'> = {
        type: mode,
        selectedPlan: mode === 'quote' ? selectedSolution === 'Standard' || selectedSolution === 'Premium' ? selectedSolution : 'Help me choose' : null,
        contactPersonName: cleaned.name, businessName: cleaned.businessName,
        mobile: cleaned.mobile, email: cleaned.email.toLowerCase(),
        businessTypeId: cleaned.businessTypeId ? Number(cleaned.businessTypeId) : null,
        city: cleaned.city || null, subject: cleaned.subject, message: cleaned.message,
      }
      // Preserve the same id after a timeout/error; editing the request starts a new one.
      const fingerprint = JSON.stringify(input)
      if (submission.current?.fingerprint !== fingerprint) submission.current = { fingerprint, id: crypto.randomUUID() }
      const message = await sendEnquiry({ ...input, submissionId: submission.current.id })
      setStatus('success')
      setFeedback(message)
    } catch (error) {
      setStatus('error')
      setFeedback(error instanceof Error ? error.message : 'We could not send your request. Please try again.')
    } finally {
      submitting.current = false
    }
  }

  if (status === 'success') return (
    <div className={`zx-enquiry zx-enquiry-success ${className}`} role="status" aria-live="polite">
      <span className="zx-enquiry-success-icon"><CircleCheck size={31} aria-hidden /></span>
      <p className="zx-contact-eyebrow">YOU’RE ON OUR RADAR</p>
      <h2>{mode === 'quote' ? 'Quote request received.' : 'Message received.'}</h2>
      <p>{feedback}</p>
      <p className="zx-enquiry-next">Our team will get in touch using the details you shared.</p>
      <Link href="/services" className="zx-contact-button">Explore ZenxPOS<ArrowUpRight size={18} aria-hidden /></Link>
    </div>
  )

  const field = (name: FieldName) => ({
    name, id: `${formId}-${name}`, value: name === 'subject' ? activeSubject : values[name],
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => update(name, event.target.value),
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `${formId}-${name}-error` : undefined,
    className: 'zx-enquiry-input',
  })
  const pending = status === 'pending'

  return (
    <form ref={formRef} method="post" onSubmit={handleSubmit} noValidate className={`zx-enquiry ${className}`} aria-busy={pending}>
      <div className="zx-enquiry-heading"><span className="zx-enquiry-dot" /><p>{mode === 'quote' ? 'LET’S FIND YOUR FIT' : 'A GOOD CONVERSATION STARTS HERE'}</p></div>
      <h2>{mode === 'quote' ? 'Request your quote.' : 'Tell us what’s next.'}</h2>
      <p className="zx-enquiry-intro">{mode === 'quote' ? 'Share a little about your business. We’ll help shape the right software, hardware and setup.' : 'A new setup, a product question or a little support. Let’s talk about your business.'}</p>
      <noscript><p className="zx-enquiry-error">Enable JavaScript to send this form, or call our team using the contact details on this page.</p></noscript>
      {mode === 'quote' && selectedSolution && <div className="zx-enquiry-selection"><span>YOUR PLAN</span><strong>{selectedSolution}</strong></div>}
      <p className="zx-enquiry-required">Fields marked <span>*</span> are required.</p>
      <fieldset disabled={pending} className="zx-enquiry-fields">
        <Field label="Your name" error={errors.name} htmlFor={`${formId}-name`} required><input {...field('name')} autoComplete="name" placeholder="Your full name" maxLength={255} required /></Field>
        <Field label="Business name" error={errors.businessName} htmlFor={`${formId}-businessName`} required><input {...field('businessName')} autoComplete="organization" placeholder="Your business or store" maxLength={255} required /></Field>
        <Field label="Mobile number" error={errors.mobile} htmlFor={`${formId}-mobile`} required><input {...field('mobile')} type="tel" inputMode="tel" autoComplete="tel-national" placeholder="10-digit mobile number" maxLength={16} required /></Field>
        <Field label="Email address" error={errors.email} htmlFor={`${formId}-email`} required><input {...field('email')} type="email" autoComplete="email" placeholder="you@business.com" maxLength={255} required /></Field>
        <Field label="Business type" htmlFor={`${formId}-businessTypeId`} optional><select {...field('businessTypeId')}><option value="">{types.length ? 'Select your business type' : 'Tell us in your message'}</option>{types.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}</select></Field>
        <Field label="City" error={errors.city} htmlFor={`${formId}-city`} optional><input {...field('city')} autoComplete="address-level2" placeholder="Where you do business" maxLength={100} /></Field>
        <Field label="Subject" error={errors.subject} htmlFor={`${formId}-subject`} wide required><input {...field('subject')} placeholder="How can we help?" maxLength={100} required /></Field>
        <Field label={mode === 'quote' ? 'What does your business need?' : 'Your message'} error={errors.message} htmlFor={`${formId}-message`} wide required><textarea {...field('message')} rows={4} maxLength={availableMessageLength} placeholder={mode === 'quote' ? 'Tell us about your stores, counters, team and any hardware you need.' : 'Tell us a little about what you have in mind…'} required /><span className="zx-enquiry-count">{values.message.length} / {availableMessageLength}</span></Field>
      </fieldset>
      {status === 'error' && <p role="alert" className="zx-enquiry-error">{feedback}</p>}
      <div className="zx-enquiry-submit"><button type="submit" className="zx-contact-button" disabled={pending || !ready}>{pending ? <LoaderCircle size={18} className="zx-enquiry-spinner" aria-hidden /> : <ArrowUpRight size={18} aria-hidden />}{!ready ? 'Preparing form…' : pending ? 'Sending…' : mode === 'quote' ? 'Request Quote' : 'Send message'}</button><p>We’ll use your details to respond to this request.<br /><Link href="/privacy-policy">Privacy policy</Link></p></div>
    </form>
  )
}

function Field({ label, error, htmlFor, wide = false, required = false, optional = false, children }: { label: string; error?: string; htmlFor: string; wide?: boolean; required?: boolean; optional?: boolean; children: ReactNode }) {
  return <div className={`zx-enquiry-field${wide ? ' zx-enquiry-field--wide' : ''}`}><label htmlFor={htmlFor}>{label}{required && <span aria-hidden> *</span>}{optional && <small> Optional</small>}</label>{children}{error && <p id={`${htmlFor}-error`} className="zx-enquiry-field-error">{error}</p>}</div>
}
