import type { Metadata } from 'next'
import Link from 'next/link'
import { Bullets, LegalDocument, LegalTable, Note } from '@/components/sections/legal'
import { commitments, company } from '@/content/legal'
import { telHref } from '@/content/site'

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy',
  description: `How cancellations, refunds, failed payments and duplicate payments are handled for ${company.brand} subscriptions, installation fees and hardware.`,
}

export default function RefundPolicyPage() {
  return (
    <LegalDocument
      title="Refund & Cancellation Policy"
      path="/refund-policy"
      summary={`How cancellations and refunds work for ${company.brand} subscriptions, installation and hardware.`}
      intro={
        <>
          <p>
            This policy explains how you can cancel {company.brand} and when payments made to <strong>{company.legalName}</strong> are refunded. It forms part of our{' '}
            <Link href="/terms-conditions">Terms & Conditions</Link>.
          </p>
          <Note>
            In short: subscriptions are prepaid and are not refunded once the term has started, but you are never charged automatically and can simply not renew. Failed,
            duplicate or excess payments are always refunded to the original payment method within {commitments.refundDays} of approval.
          </Note>
        </>
      }
      sections={[
        {
          id: 'cancellation', title: 'Cancelling your subscription',
          body: (
            <Bullets items={[
              'Subscriptions do not renew automatically. To cancel, simply do not pay for the next term; nothing further is charged.',
              <>You can also ask us to close your account at any time by emailing <a href={`mailto:${company.email}`}>{company.email}</a> from your registered email address.</>,
              'After cancellation you keep access until the end of the term you have paid for. Your data is then retained or deleted as described in our Privacy Policy.',
              'Orders for hardware or onboarding can be cancelled free of charge before the hardware is dispatched or onboarding has started.',
            ]} />
          ),
        },
        {
          id: 'eligibility', title: 'What is refundable',
          body: (
            <LegalTable
              head={['Payment', 'Refund']}
              rows={[
                ['Failed payment where money was debited', 'Full refund. Usually reversed automatically by the bank or gateway; otherwise refunded by us after reconciliation.'],
                ['Duplicate or excess payment', `Full refund of the extra amount, if reported within ${commitments.duplicatePaymentReportDays} days of payment.`],
                ['Payment for a service we could not activate or deliver', 'Full refund.'],
                ['Subscription fees for a term that has started', 'Not refundable, including for unused days or months, except as required by law or approved by us on review.'],
                ['Installation and onboarding fee', 'Refundable in full if cancelled before onboarding starts; not refundable once installation or onboarding has started.'],
                ['Hardware supplied by us', `Refund or replacement if it arrives damaged, defective or different from the order and is reported within ${commitments.hardwareDamageReportHours} hours of delivery. Other faults are handled under the manufacturer's warranty.`],
              ]}
            />
          ),
        },
        {
          id: 'service-issues', title: 'If something goes wrong with the Services',
          body: (
            <p>
              If a serious problem caused by us prevents you from using the Services and we cannot fix it within a reasonable time, contact us. We review such cases individually and
              may extend your subscription or refund a proportionate amount for the affected period.
            </p>
          ),
        },
        {
          id: 'how-to-request', title: 'How to request a refund',
          body: (
            <>
              <p>Email <a href={`mailto:${company.email}`}>{company.email}</a> or call <a href={telHref(company.phone)}>{company.phone}</a> with:</p>
              <Bullets items={['Your business name and registered mobile number or email', 'The invoice number, or the payment date, amount and transaction / UTR reference', 'The reason for the request, with photos for damaged hardware']} />
              <p>We acknowledge requests within {commitments.grievanceAckHours} hours and confirm whether a refund is approved within 7 working days.</p>
            </>
          ),
        },
        {
          id: 'processing', title: 'How refunds are paid',
          body: (
            <Bullets items={[
              `Approved refunds are made to the original payment method (UPI, card, net banking or wallet) through our payment gateway within ${commitments.refundDays} of approval.`,
              'Your bank or card issuer may take a few more days to show the credit in your account.',
              'Refunds are made in Indian Rupees for the amount received by us. Charges levied by your bank are outside our control.',
              'If GST was charged, we issue a credit note for the refunded amount.',
            ]} />
          ),
        },
        {
          id: 'chargebacks', title: 'Chargebacks',
          body: <p>Please contact us before raising a dispute with your bank. If a chargeback is raised for a valid payment, we may suspend the account until it is resolved.</p>,
        },
      ]}
    />
  )
}
