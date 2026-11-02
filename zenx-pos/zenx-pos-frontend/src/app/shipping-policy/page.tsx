import type { Metadata } from 'next'
import Link from 'next/link'
import { Bullets, LegalDocument, Note } from '@/components/sections/legal'
import { commitments, company } from '@/content/legal'

export const metadata: Metadata = {
  title: 'Shipping & Delivery Policy',
  description: `How and when ${company.brand} software subscriptions are activated and how POS hardware is delivered.`,
}

export default function ShippingPolicyPage() {
  return (
    <LegalDocument
      title="Shipping & Delivery Policy"
      path="/shipping-policy"
      summary={`How ${company.brand} software is activated and how hardware is delivered.`}
      intro={
        <>
          <p>{company.brand} is software delivered online. No physical goods are shipped for a subscription. This policy explains when your software is activated and, if you buy POS hardware from <strong>{company.legalName}</strong>, how it is delivered.</p>
          <Note>Software is delivered electronically: you get access through the {company.appName} Android app, web and desktop software using the login we send to your registered mobile number and email.</Note>
        </>
      }
      sections={[
        {
          id: 'software', title: 'Software activation',
          body: (
            <Bullets items={[
              `New accounts are set up and login details are shared within ${commitments.activationHours} hours of the first payment being confirmed, or on the onboarding date agreed with you.`,
              'Renewals take effect as soon as the payment gateway confirms your payment; access is restored automatically.',
              'Invoices are available in the app immediately and can be emailed to you.',
              'The Android app is downloaded from Google Play; there is no shipping charge for software.',
            ]} />
          ),
        },
        {
          id: 'onboarding', title: 'Installation and onboarding',
          body: <p>Where your plan includes installation, training or data setup, we agree a schedule with you. It may be done remotely or at your premises within our service areas. We will tell you in advance if a visit is needed.</p>,
        },
        {
          id: 'hardware', title: 'Hardware delivery',
          body: (
            <Bullets items={[
              'Hardware is delivered only within India, to the business address on your order.',
              `Orders are dispatched within ${commitments.hardwareDispatchDays} after payment confirmation, subject to stock. Delivery time depends on your location and the courier; we share tracking details when available.`,
              'Delivery charges, if any, are shown in your quotation before you pay.',
              `Check the package on delivery. Report damaged, missing or incorrect items within ${commitments.hardwareDamageReportHours} hours, with photos, so we can arrange a replacement or refund.`,
              'If a delivery is delayed beyond the date we gave you, we will keep you informed. You may cancel an undispatched order for a full refund.',
            ]} />
          ),
        },
        {
          id: 'questions', title: 'Questions',
          body: <p>For any delivery or activation questions, contact us using the details below or through our <Link href="/contact-us">Contact Us</Link> page. Refunds for undelivered services or hardware follow our <Link href="/refund-policy">Refund & Cancellation Policy</Link>.</p>,
        },
      ]}
    />
  )
}
