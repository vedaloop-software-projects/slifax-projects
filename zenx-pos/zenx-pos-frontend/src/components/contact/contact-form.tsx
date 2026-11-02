'use client'

import { useActionState, useEffect, useState } from 'react'
import { CircleCheck, LoaderCircle, Send } from 'lucide-react'
import { buttonClass } from '@/components/ui/button'
import { cn } from '@/components/ui/layout'
import { businessTypes, sendEnquiry, type BusinessType } from '@/lib/api'

type FieldName = 'name' | 'businessName' | 'mobile' | 'email' | 'subject' | 'message'
type State = { status: 'idle' | 'success' | 'error'; message: string; errors: Partial<Record<FieldName, string>>; values: Record<string, string> }

const initial: State = { status: 'idle', message: '', errors: {}, values: {} }
const text = (form: FormData, name: string) => String(form.get(name) ?? '').trim()

// Mirrors the backend's /registerBusiness rules so mistakes show before sending.
function validate(values: Record<string, string>) {
  const errors: State['errors'] = {}
  if (values.name!.length < 2) errors.name = 'Please enter your name.'
  if (values.businessName!.length < 2) errors.businessName = 'Please enter your business name.'
  if (!/^[6-9]\d{9}$/.test(values.mobile!)) errors.mobile = 'Enter a valid 10-digit mobile number.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email!)) errors.email = 'Enter a valid email address.'
  if (values.subject!.length < 3) errors.subject = 'Please add a subject.'
  if (values.message!.length < 10) errors.message = 'Please write at least 10 characters.'
  return errors
}

async function submit(_previous: State, form: FormData): Promise<State> {
  const values = Object.fromEntries(['name', 'businessName', 'mobile', 'email', 'businessTypeId', 'city', 'subject', 'message'].map(name => [name, text(form, name)]))
  values.mobile = values.mobile!.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '')
  const errors = validate(values)
  if (Object.keys(errors).length) return { status: 'error', message: 'Please correct the highlighted fields.', errors, values }
  try {
    const message = await sendEnquiry({
      contactPersonName: values.name!, businessName: values.businessName!, mobile: values.mobile!, email: values.email!,
      businessTypeId: values.businessTypeId ? Number(values.businessTypeId) : null, city: values.city || null,
      notes: `${values.subject}\n\n${values.message}`.slice(0, 1000),
    })
    return { status: 'success', message, errors: {}, values: {} }
  } catch (error) {
    return { status: 'error', message: (error as Error).message, errors: {}, values }
  }
}

export function ContactForm({ className }: { className?: string }) {
  const [state, action, pending] = useActionState(submit, initial)
  const [types, setTypes] = useState<BusinessType[]>([])
  useEffect(() => {
    let alive = true
    businessTypes().then(rows => { if (alive) setTypes(rows) }).catch(() => undefined)
    return () => { alive = false }
  }, [])

  if (state.status === 'success') {
    return (
      <div role="status" className={cn('flex flex-col items-center justify-center rounded-card border border-line bg-white p-10 text-center shadow-card', className)}>
        <CircleCheck aria-hidden className="size-12 text-brand-500" />
        <p className="mt-4 font-display text-xl font-semibold text-ink">Message sent</p>
        <p className="mt-2 max-w-sm text-sm text-muted">{state.message}</p>
      </div>
    )
  }

  // React resets the form after each submission; defaultValue refills it after a failed attempt.
  const field = (name: FieldName) => ({ name, id: `contact-${name}`, defaultValue: state.values[name] ?? '', 'aria-invalid': state.errors[name] ? true : undefined, 'aria-describedby': state.errors[name] ? `contact-${name}-error` : undefined })

  return (
    <form action={action} noValidate className={cn('rounded-card border border-line bg-white p-6 shadow-card sm:p-8', className)}>
      <h2 className="text-2xl font-bold">Get in Touch!</h2>
      <p className="mt-1 text-sm text-muted">Book a demo or ask us anything. We usually reply within one business day.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Your name" error={state.errors.name} htmlFor="contact-name">
          <input {...field('name')} autoComplete="name" placeholder="Enter your name" className={inputClass} />
        </Field>
        <Field label="Business name" error={state.errors.businessName} htmlFor="contact-businessName">
          <input {...field('businessName')} autoComplete="organization" placeholder="Enter your business name" className={inputClass} />
        </Field>
        <Field label="Mobile number" error={state.errors.mobile} htmlFor="contact-mobile">
          <input {...field('mobile')} type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="10-digit mobile number" className={inputClass} />
        </Field>
        <Field label="Email address" error={state.errors.email} htmlFor="contact-email">
          <input {...field('email')} type="email" autoComplete="email" placeholder="Enter your email" className={inputClass} />
        </Field>
        <Field label="Business type (optional)" htmlFor="contact-businessTypeId">
          <select id="contact-businessTypeId" name="businessTypeId" defaultValue={state.values.businessTypeId ?? ''} className={inputClass}>
            <option value="">Select business type</option>
            {types.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}
          </select>
        </Field>
        <Field label="City (optional)" htmlFor="contact-city">
          <input id="contact-city" name="city" defaultValue={state.values.city ?? ''} autoComplete="address-level2" placeholder="Enter your city" className={inputClass} />
        </Field>
        <Field label="Subject" error={state.errors.subject} htmlFor="contact-subject" wide>
          <input {...field('subject')} placeholder="e.g. Demo for my supermarket" className={inputClass} />
        </Field>
        <Field label="Message" error={state.errors.message} htmlFor="contact-message" wide>
          <textarea {...field('message')} rows={4} maxLength={900} placeholder="Write your message here..." className={cn(inputClass, 'resize-y')} />
        </Field>
      </div>
      {state.status === 'error' && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.message}</p>}
      <button type="submit" disabled={pending} className={buttonClass('primary', 'mt-6 w-full sm:w-auto')}>
        {pending ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <Send aria-hidden className="size-4" />}
        {pending ? 'Sending…' : 'Send Message'}
      </button>
    </form>
  )
}

const inputClass = 'block w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100 aria-[invalid=true]:border-red-400'

function Field({ label, error, htmlFor, wide = false, children }: { label: string; error?: string; htmlFor: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn(wide && 'sm:col-span-2')}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink">{label}</label>
      {children}
      {error && <p id={`${htmlFor}-error`} className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  )
}
