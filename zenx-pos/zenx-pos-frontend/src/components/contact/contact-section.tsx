import { Mail, MapPin, Phone } from 'lucide-react'
import { company } from '@/content/legal'
import { site, telHref } from '@/content/site'
import { ContactForm } from './contact-form'
import './contact.css'

/** Contact details and enquiry form share the same accessible layout on every page. */
export function ContactSection({ id = 'contact', title = 'Real people. Ready to help.', text }: { id?: string; title?: string; text?: string }) {
  return (
    <section id={id} className="zx-contact-section">
      <div className="zx-contact-shell zx-contact-layout">
        <div className="zx-contact-details">
          <p className="zx-contact-eyebrow">LET’S TALK BUSINESS</p>
          <h2>{title}</h2>
          <p>{text ?? 'Tell us how your business works. We’ll help you explore the right POS setup, hardware and next steps.'}</p>
          <ul className="zx-contact-lines">
            <ContactLine icon={Phone} label="Give us a call">{site.phones.map(phone => <a key={phone} href={telHref(phone)}>{phone}</a>)}</ContactLine>
            <ContactLine icon={Mail} label="Drop us a line"><a href={`mailto:${site.email}`}>{site.email}</a></ContactLine>
            <ContactLine icon={MapPin} label="Our registered office"><span>{company.legalName}<br />{site.address}</span></ContactLine>
          </ul>
          <div className="zx-contact-note"><strong>Your business is the starting point.</strong>One store or a growing network. We’ll walk through what you need, together.</div>
        </div>
        <ContactForm />
      </div>
    </section>
  )
}

function ContactLine({ icon: Icon, label, children }: { icon: typeof Phone; label: string; children: React.ReactNode }) {
  return <li className="zx-contact-line"><span className="zx-contact-line-icon"><Icon size={20} aria-hidden /></span><div className="zx-contact-line-content"><p>{label}</p>{children}</div></li>
}
