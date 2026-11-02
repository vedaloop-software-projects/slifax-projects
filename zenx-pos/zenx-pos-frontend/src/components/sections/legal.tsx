import Link from 'next/link'
import type { ReactNode } from 'react'
import { Globe, Mail, MapPin, Phone, UserRound } from 'lucide-react'
import { Container, cn } from '@/components/ui/layout'
import { commitments, company, policies } from '@/content/legal'
import { telHref } from '@/content/site'
import { PageHero } from './page-hero'

export type LegalSection = { id: string; title: string; body: ReactNode }

/** Layout shared by the policy pages: numbered sections, a contents list and the legal contacts. */
export function LegalDocument({ title, path, summary, intro, sections }: {
  title: string; path: string; summary: string; intro: ReactNode; sections: LegalSection[]
}) {
  return (
    <>
      <PageHero title={title} description={summary} crumbs={[{ label: title }]} />
      <Container className="grid gap-12 py-14 lg:grid-cols-[16rem_1fr] lg:py-20">
        <nav aria-label="Sections" className="hidden lg:sticky lg:top-24 lg:block lg:max-h-[calc(100dvh-8rem)] lg:self-start lg:overflow-y-auto">
          <p className="font-display text-sm font-semibold uppercase tracking-wider text-ink">On this page</p>
          <ol className="mt-3 space-y-1 border-l border-line text-sm">
            {sections.map((section, index) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="-ml-px block border-l border-transparent py-1.5 pl-4 text-muted hover:border-brand-500 hover:text-navy-600">
                  {index + 1}. {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <article className="max-w-3xl space-y-10 text-body [&_a]:text-navy-600 [&_a]:underline-offset-2 hover:[&_a]:underline [&_li]:leading-relaxed [&_p]:leading-relaxed [&_strong]:text-ink">
          <p className="text-sm text-muted">Effective date: {company.effectiveDate} · Last updated: {company.effectiveDate}</p>
          <div className="space-y-4">{intro}</div>
          {sections.map((section, index) => (
            <section key={section.id} id={section.id} className="space-y-4">
              <h2 className="text-2xl font-bold">{index + 1}. {section.title}</h2>
              {section.body}
            </section>
          ))}
          <ContactCard />
          <RelatedPolicies current={path} />
        </article>
      </Container>
    </>
  )
}

function ContactCard() {
  const officer = company.grievanceOfficer
  return (
    <section aria-labelledby="legal-contact" className="rounded-card bg-navy-900 p-8 text-white [&_a]:text-white">
      <h2 id="legal-contact" className="text-xl font-bold text-white">Contact & Grievance Officer</h2>
      <p className="mt-2 text-sm text-slate-300">
        Questions, requests or complaints about this policy can be sent to our Grievance Officer. We acknowledge complaints within {commitments.grievanceAckHours} hours and resolve them within {commitments.grievanceResolveDays} days.
      </p>
      <ul className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <li className="flex gap-2"><UserRound aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-400" /><span>{officer.name}<br /><span className="text-slate-300">{officer.designation}</span></span></li>
        <li className="flex gap-2"><Mail aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-400" /><a href={`mailto:${officer.email}`}>{officer.email}</a></li>
        <li className="flex gap-2"><Phone aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-400" /><a href={telHref(officer.phone)}>{officer.phone}</a></li>
        <li className="flex gap-2"><Globe aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-400" /><a href={`https://${company.website}`}>{company.website}</a></li>
        <li className="flex gap-2 sm:col-span-2"><MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-400" /><span>{company.legalName}, {company.address}</span></li>
      </ul>
    </section>
  )
}

function RelatedPolicies({ current }: { current: string }) {
  return (
    <nav aria-label="Other policies" className="border-t border-line pt-6">
      <p className="text-sm font-semibold text-ink">Other policies</p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {policies.filter(policy => policy.href !== current).map(policy => (
          <li key={policy.href}>
            <Link href={policy.href} className="inline-block rounded-full border border-line px-4 py-1.5 text-sm !text-body !no-underline hover:border-navy-600 hover:!text-navy-600">{policy.label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 marker:text-brand-500">
      {items.map((item, index) => <li key={index}>{item}</li>)}
    </ul>
  )
}

/** Two-column table: used for "what we collect / why" and similar lists. */
export function LegalTable({ head, rows }: { head: [string, string] | [string, string, string]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-card border border-line">
      <table className="w-full min-w-[32rem] text-left text-sm">
        <thead className="bg-surface text-ink">
          <tr>{head.map(cell => <th key={cell} scope="col" className="px-4 py-3 font-semibold">{cell}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row, index) => (
            <tr key={index} className="align-top">
              {row.map((cell, column) => <td key={column} className={cn('px-4 py-3', column === 0 && 'font-medium text-ink')}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="rounded-card border-l-4 border-brand-500 bg-brand-50 p-4 text-sm">{children}</p>
}
