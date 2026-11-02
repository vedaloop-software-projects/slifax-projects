import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import { buttonClass } from '@/components/ui/button'
import { Bullets, LegalDocument, LegalTable, Note } from '@/components/sections/legal'
import { commitments, company } from '@/content/legal'

export const metadata: Metadata = {
  title: 'Account & Data Deletion',
  description: `How to request deletion of your ${company.appName} account and data, what is deleted and what is kept.`,
}

const subject = `Account deletion request - ${company.appName}`
const body = 'Business name:\nRegistered mobile number:\nRegistered email:\nDelete: whole business account / one staff user (name):\nReason (optional):\n'
const mailto = `mailto:${company.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

export default function DeleteAccountPage() {
  return (
    <LegalDocument
      title="Account & Data Deletion"
      path="/delete-account"
      summary={`Request deletion of your ${company.appName} account and associated data.`}
      intro={
        <>
          <p>
            This page explains how to delete an account in the <strong>{company.appName}</strong> app (developer: {company.legalName}) and its related web and desktop software,
            and what happens to your data. You do not need the app installed to make a request.
          </p>
          <div className="flex flex-wrap items-center gap-4 rounded-card border border-line bg-surface p-5">
            <a href={mailto} className={buttonClass('primary', '!text-white !no-underline')}>
              <Mail aria-hidden className="size-4" /> Request account deletion
            </a>
            <p className="text-sm text-muted">Opens an email to {company.email} with the details we need.</p>
          </div>
        </>
      }
      sections={[
        {
          id: 'how-to-request', title: 'How to request deletion',
          body: (
            <>
              <p><strong>Delete your business account and all its data</strong> (owner or administrator only):</p>
              <ol className="list-decimal space-y-2 pl-5 marker:font-semibold marker:text-navy-600">
                <li>Send an email to <a href={mailto}>{company.email}</a> from the email address registered on the account, with the subject &quot;{subject}&quot;.</li>
                <li>Include your business name and registered mobile number.</li>
                <li>We verify the request with an OTP or a call to the registered mobile number, so that nobody else can delete your account.</li>
                <li>We confirm when the deletion is complete.</li>
              </ol>
              <p><strong>Remove a single staff user:</strong> your business administrator can set the user to Inactive on the Users screen in the app, which stops all access immediately, or include the user&apos;s name in a deletion request as above.</p>
              <Note>Before requesting deletion, download any reports or invoices you need. Deleted data cannot be recovered.</Note>
            </>
          ),
        },
        {
          id: 'what-is-deleted', title: 'What is deleted and what is kept',
          body: (
            <LegalTable
              head={['Data', 'What happens', 'When']}
              rows={[
                ['Account and user profiles (names, mobile numbers, emails, passwords)', 'Deleted', `Within ${commitments.deletionDays} days of verification`],
                ['Business data (products, stock, bills, customers, suppliers, reports)', 'Deleted', `Within ${commitments.deletionDays} days of verification`],
                ['Device, sign-in and audit logs', 'Deleted or anonymised', `Within ${commitments.deletionDays} days of verification`],
                ['Backups containing your data', 'Overwritten', `Within ${commitments.backupPurgeDays} days`],
                ['Our invoices and payment records for your subscription', 'Kept, as required by GST and accounting laws, then deleted', 'Up to 8 years'],
                ['Records we must keep for a legal claim, investigation or authority request', 'Kept only for that purpose', 'Until the matter is closed'],
              ]}
            />
          ),
        },
        {
          id: 'subscriptions', title: 'Subscriptions and payments',
          body: (
            <Bullets items={[
              'Deleting your account ends your subscription. Fees already paid are refunded only as set out in our Refund & Cancellation Policy.',
              'Uninstalling the app does not delete your account or data; please send a deletion request.',
            ]} />
          ),
        },
        {
          id: 'more', title: 'More information',
          body: <p>See our <Link href="/privacy-policy">Privacy Policy</Link> for how we handle data and your other rights, including access, correction and export.</p>,
        },
      ]}
    />
  )
}
