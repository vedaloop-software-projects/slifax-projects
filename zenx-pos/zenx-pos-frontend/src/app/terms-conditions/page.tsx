import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckList } from '@/components/ui/check-list'
import { Bullets, LegalDocument, Note } from '@/components/sections/legal'
import { commitments, company } from '@/content/legal'

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: `The terms that govern use of the ${company.brand} software, Android app, website and related services, including subscriptions and payments.`,
}

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms & Conditions"
      path="/terms-conditions"
      summary={`The agreement between your business and ${company.legalName} for using ${company.brand}.`}
      intro={
        <>
          <p>
            These Terms & Conditions (&quot;Terms&quot;) are an agreement between <strong>{company.legalName}</strong> (&quot;{company.brand}&quot;, &quot;we&quot;, &quot;us&quot;), with its office at{' '}
            {company.address}, and the business or person (&quot;you&quot;, &quot;merchant&quot;) that registers for or uses the {company.brand} software, the {company.appName} Android app,
            our website and related services (the &quot;Services&quot;).
          </p>
          <Note>
            By registering, signing in, paying for or using the Services, you confirm that you have read and accept these Terms, our{' '}
            <Link href="/privacy-policy">Privacy Policy</Link> and our <Link href="/refund-policy">Refund & Cancellation Policy</Link>. If you accept on behalf of a business, you confirm
            that you are authorised to bind it. If you do not agree, do not use the Services.
          </Note>
        </>
      }
      sections={[
        {
          id: 'services', title: 'The Services',
          body: (
            <>
              <p>{company.brand} is cloud-based point-of-sale and business management software, available on Android, web and desktop. Depending on your plan, it includes:</p>
              <CheckList columns={2} items={['Billing, GST invoicing and refunds', 'Inventory and stock management', 'Purchases, transfers and stock adjustments', 'Customer and supplier management', 'Reports and analytics', 'KOT, tables and kitchen workflows', 'Multi-device and multi-user access', 'Hardware and payment integrations']} />
              <p>We may add, change or remove features to improve the Services. We will not materially reduce the core features of a plan you have already paid for during its current term.</p>
            </>
          ),
        },
        {
          id: 'eligibility', title: 'Eligibility and accounts',
          body: (
            <Bullets items={[
              'You must be at least 18 years old and use the Services for a lawful business purpose.',
              'Registration details, including business name, GST number and contact details, must be accurate and kept up to date.',
              'You are responsible for your users, their roles and permissions, and everything done through your accounts.',
              'Keep passwords and OTPs confidential. Each account may be signed in on a limited number of devices. Tell us immediately if you suspect unauthorised access.',
            ]} />
          ),
        },
        {
          id: 'fees', title: 'Plans, fees and taxes',
          body: (
            <>
              <Bullets items={[
                <>Prices are shown in Indian Rupees on our <Link href="/pricing">Pricing</Link> page or in the quotation we send you. Applicable taxes, including GST, are charged in addition and shown on your invoice.</>,
                'Fees usually include a one-time software installation and onboarding fee and a subscription fee for the plan term you choose (for example quarterly, half-yearly or yearly).',
                'Hardware, if purchased from us, is charged separately as quoted.',
                'Fees are payable in advance. We issue a GST invoice for every payment; invoices are available in the app and can be emailed to you.',
                'We may change our prices for future terms. New prices apply from your next renewal, and we will tell you before your renewal date.',
              ]} />
            </>
          ),
        },
        {
          id: 'payments', title: 'Payments',
          body: (
            <>
              <Bullets items={[
                <>Online payments are processed by our payment gateway partner (currently Cashfree Payments) using UPI, cards, net banking or wallets. Payment details are entered on the gateway&apos;s secure pages; we do not store card or bank credentials.</>,
                'Your payment is also subject to the terms of the gateway and your bank or card issuer.',
                'A payment is complete only when the gateway confirms it to us. If money is debited but the payment is not confirmed, it is handled as described in our Refund & Cancellation Policy.',
                'You must not make chargebacks or payment disputes for valid fees. Please contact us first; we will resolve genuine errors promptly.',
              ]} />
            </>
          ),
        },
        {
          id: 'renewal', title: 'Subscription term, renewal and expiry',
          body: (
            <Bullets items={[
              'Your subscription runs from its start date to its end date shown in the app.',
              'Renewals are not charged automatically: you renew by paying for the next term in the app or through a payment link we send. We remind you before your plan ends.',
              `After the end date, full access continues for a grace period of ${commitments.graceDays} days. If you have not renewed by the end of the grace period, the account is restricted to renewal, sign-out and data-access requests until you renew.`,
              'A successful renewal restores full access as soon as the payment is confirmed. Your data is kept during the grace period and as described in our Privacy Policy.',
            ]} />
          ),
        },
        {
          id: 'cancellation', title: 'Cancellation and refunds',
          body: (
            <p>
              You may stop using the Services at any time by not renewing, or by asking us to close your account. Fees already paid are refundable only as described in our{' '}
              <Link href="/refund-policy">Refund & Cancellation Policy</Link>, which forms part of these Terms.
            </p>
          ),
        },
        {
          id: 'your-responsibilities', title: 'Your responsibilities',
          body: (
            <>
              <p>You are responsible for:</p>
              <Bullets items={[
                'The accuracy of the prices, taxes, discounts and other settings you configure, and for the invoices and records you issue to your customers.',
                'Complying with laws that apply to your business, including GST, consumer protection and data protection laws.',
                'Having a lawful basis, and giving any required notice, before entering your customers’ or suppliers’ personal data.',
                'Keeping your devices, internet connection and hardware in working order, and keeping your own copies of records you are legally required to keep.',
              ]} />
              <p>You must <strong>not</strong>:</p>
              <Bullets items={[
                'Use the Services for any unlawful, fraudulent or harmful purpose, or to record false transactions.',
                'Upload malware, overload or interfere with the Services, or try to access accounts, data or systems you are not authorised to use.',
                'Copy, modify, resell, sublicense, decompile or reverse engineer the software, except as the law expressly allows.',
                'Share your credentials with people outside your business, or let more people or devices use an account than your plan allows.',
              ]} />
            </>
          ),
        },
        {
          id: 'data', title: 'Your data',
          body: (
            <>
              <p>
                All business data you enter (products, sales, customers, suppliers, finances) belongs to you. You grant us a limited right to host, process and back it up only to
                provide and support the Services. We handle personal data as described in our <Link href="/privacy-policy">Privacy Policy</Link>.
              </p>
              <p>You can export your reports at any time while your account is active. After your account ends, you may request an export within the retention period described in the Privacy Policy.</p>
            </>
          ),
        },
        {
          id: 'ip', title: 'Licence and intellectual property',
          body: (
            <p>
              While your subscription is active and you comply with these Terms, we grant you a limited, non-exclusive, non-transferable, revocable licence to use the Services for
              your business. The software, website, content, designs, logos and the {company.brand} brand belong to {company.legalName} or its licensors. No other rights are granted.
            </p>
          ),
        },
        {
          id: 'third-party', title: 'Integrations and hardware',
          body: (
            <Bullets items={[
              'Payment, messaging, accounting and other integrations are provided by third parties under their own terms. You may need your own account with them, and their fees are payable separately.',
              'We are not responsible for outages, errors, charges or settlements of third-party services, including payment providers you connect.',
              'Hardware supplied by us is covered by its manufacturer’s warranty. Hardware not supplied by us is supported on a best-effort basis.',
            ]} />
          ),
        },
        {
          id: 'availability', title: 'Availability and support',
          body: (
            <p>
              We work to keep the Services available and secure, but we do not guarantee uninterrupted or error-free operation. Planned maintenance is scheduled to minimise
              disruption. Support is available through the contact details on our website during business hours, and through the channels included in your plan.
            </p>
          ),
        },
        {
          id: 'warranty', title: 'Disclaimer',
          body: (
            <p>
              The Services are provided &quot;as is&quot; and &quot;as available&quot;. To the extent permitted by law, we disclaim all other warranties, express or implied, including fitness for a
              particular purpose. Reports and calculations are tools to assist you; you remain responsible for your business, tax and legal decisions.
            </p>
          ),
        },
        {
          id: 'liability', title: 'Limitation of liability',
          body: (
            <>
              <p>To the maximum extent permitted by law:</p>
              <Bullets items={[
                'We are not liable for indirect, incidental, special or consequential losses, including loss of profits, revenue, goodwill or data, or business interruption.',
                'Our total liability for any claim relating to the Services is limited to the fees you paid us for the Services in the 12 months before the event giving rise to the claim.',
                'Nothing in these Terms limits liability that cannot be limited under applicable law.',
              ]} />
            </>
          ),
        },
        {
          id: 'indemnity', title: 'Indemnity',
          body: <p>You agree to indemnify {company.legalName} against claims, penalties and costs arising from your breach of these Terms, your unlawful use of the Services, or data you enter without a lawful basis.</p>,
        },
        {
          id: 'suspension', title: 'Suspension and termination',
          body: (
            <>
              <p>We may suspend or terminate access, after notice where reasonably possible, if you do not pay fees when due, breach these Terms, use the Services unlawfully or fraudulently, or create a security risk.</p>
              <p>You may terminate at any time by not renewing or by asking us to close your account. On termination, your right to use the Services ends; sections that by their nature should survive (fees owed, data, liability, indemnity, governing law) continue to apply.</p>
            </>
          ),
        },
        {
          id: 'changes', title: 'Changes to these Terms',
          body: <p>We may update these Terms. We will post the new version here with a new date and, for significant changes, notify you in the app or by email at least 15 days before they apply. Continuing to use the Services after that means you accept the updated Terms.</p>,
        },
        {
          id: 'law', title: 'Governing law and disputes',
          body: (
            <>
              <p>These Terms are governed by the laws of India. Please contact our Grievance Officer first; we will try to resolve any dispute amicably within {commitments.grievanceResolveDays} days.</p>
              <p>Disputes that cannot be resolved amicably are subject to the exclusive jurisdiction of the courts at {company.jurisdiction}, India.</p>
            </>
          ),
        },
        {
          id: 'general', title: 'General',
          body: (
            <Bullets items={[
              'Force majeure: we are not responsible for delays or failures caused by events beyond our reasonable control, such as natural disasters, power or network failures, or government action.',
              'If any part of these Terms is found unenforceable, the rest remains in effect.',
              'These Terms, the policies they refer to, and any quotation or order form we agree with you, are the entire agreement about the Services.',
              'We may send notices to the email address or mobile number registered on your account.',
            ]} />
          ),
        },
      ]}
    />
  )
}
