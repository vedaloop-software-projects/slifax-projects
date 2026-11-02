import { Mail, MapPin, Phone } from 'lucide-react'
import { Section } from '@/components/ui/layout'
import { company } from '@/content/legal'
import { site, telHref } from '@/content/site'
import { ContactForm } from './contact-form'

/** Contact details beside the enquiry form; used on the home and contact pages. */
export function ContactSection({ id = 'contact', title = 'Have Questions? Reach Out to Us Now', text }: { id?: string; title?: string; text?: string }) {
  return (
    <Section id={id} tone="tint">
      <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Start your digital journey today</p>
          <h2 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">{title}</h2>
          <p className="mt-4 text-muted">
            {text ?? 'Contact our team for a personalized demo, product information, or expert guidance tailored to your business needs.'}
          </p>
          <ul className="mt-8 space-y-5">
            <ContactLine icon={Phone} label="Call us">
              {site.phones.map((phone, index) => (
                <span key={phone}>{index > 0 && ', '}<a href={telHref(phone)} className="hover:text-navy-600">{phone}</a></span>
              ))}
            </ContactLine>
            <ContactLine icon={Mail} label="Email">
              <a href={`mailto:${site.email}`} className="hover:text-navy-600">{site.email}</a>
            </ContactLine>
            <ContactLine icon={MapPin} label="Registered office">{company.legalName}, {site.address}</ContactLine>
          </ul>
        </div>
        <ContactForm />
      </div>
    </Section>
  )
}

function ContactLine({ icon: Icon, label, children }: { icon: typeof Phone; label: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-brand-600 shadow-card">
        <Icon aria-hidden className="size-5" />
      </span>
      <div className="text-sm leading-relaxed text-body">
        <p className="font-semibold text-ink">{label}</p>
        {children}
      </div>
    </li>
  )
}
