import type { Metadata } from 'next'
import Link from 'next/link'
import { Bullets, LegalDocument, LegalTable, Note } from '@/components/sections/legal'
import { commitments, company } from '@/content/legal'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `How ${company.brand} collects, uses, shares, stores and deletes personal and business data across its website, Android app and POS software.`,
}

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      path="/privacy-policy"
      summary={`How ${company.brand} collects, uses, shares, protects and deletes your data.`}
      intro={
        <>
          <p>
            This Privacy Policy explains how <strong>{company.legalName}</strong> (&quot;{company.brand}&quot;, &quot;we&quot;, &quot;us&quot;), the developer and operator of
            the {company.brand} point-of-sale software, collects, uses, shares, stores and deletes information when you use our website ({company.website}), the{' '}
            <strong>{company.appName}</strong> Android app (package <code>{company.androidPackage}</code>), our web and desktop software, and related services (together, the &quot;Services&quot;).
          </p>
          <p>
            It is published in accordance with the Information Technology Act, 2000, the Information Technology (Reasonable Security Practices and Procedures and Sensitive
            Personal Data or Information) Rules, 2011, and the Digital Personal Data Protection Act, 2023. By using the Services you agree to this policy. If you do not agree,
            please do not use the Services.
          </p>
          <Note>
            Business data you enter into {company.brand} (products, sales, customers, suppliers, staff and reports) belongs to your business. We process it only to provide the
            Services to you, and we never sell it.
          </Note>
        </>
      }
      sections={[
        {
          id: 'who-we-are', title: 'Who this policy covers',
          body: (
            <>
              <p><strong>Our customers (&quot;merchants&quot;)</strong> are businesses that subscribe to {company.brand}, and the owners and staff who sign in to it. For their account and usage data, we decide how the data is used.</p>
              <p>
                <strong>Our merchants&apos; customers and suppliers.</strong> When a merchant records a customer&apos;s or supplier&apos;s details (for example a name or mobile number on a bill),
                the merchant decides why that data is collected and is responsible for informing those people. We process that data only on the merchant&apos;s instructions, to provide the Services.
                Requests about such data should go to the merchant first; we will help the merchant respond.
              </p>
            </>
          ),
        },
        {
          id: 'information-we-collect', title: 'Information we collect',
          body: (
            <>
              <p>We collect only what is needed to run the Services:</p>
              <LegalTable
                head={['Data', 'Examples', 'Source']}
                rows={[
                  ['Account details', 'Name, mobile number, email address, role, password (stored only as a one-way hash)', 'You or your business administrator'],
                  ['Business profile', 'Business name, address, city, state, GST number, PAN, FSSAI and trade licence numbers, UPI ID, logo', 'You'],
                  ['Business records', 'Products, stock, bills, refunds, payments received, expenses, customers, suppliers, salesmen, reports', 'You and your staff, while using the Services'],
                  ['Subscription and billing', 'Plan, contract dates, amounts paid, invoices, payment status and payment reference IDs', 'You and our payment gateway'],
                  ['Device and security data', 'Device identifier, device model, operating system, app version, timezone, IP address, approximate city derived from the IP address, sign-in and sign-out times, audit logs of actions in your account', 'Collected automatically when you use the Services'],
                  ['Enquiries', 'Name, business name, mobile, email, city and message sent through our website forms', 'You'],
                  ['Support communications', 'Emails, calls and support tickets', 'You'],
                ]}
              />
              <p>
                We do <strong>not</strong> collect your card numbers, UPI PINs or bank passwords. Payments are entered on the payment gateway&apos;s secure pages and handled by the gateway.
                We do not use advertising or analytics SDKs, and we do not sell or rent personal data.
              </p>
            </>
          ),
        },
        {
          id: 'app-permissions', title: 'Android app permissions',
          body: (
            <>
              <p>The {company.appName} app asks only for permissions needed for POS features. You can refuse or withdraw any permission in Android settings; the related feature will stop working.</p>
              <LegalTable
                head={['Permission', 'Why we need it']}
                rows={[
                  ['Camera', 'To scan product barcodes and to take a photo for your business logo. Camera images are processed on the device; only a logo you choose to upload is sent to our servers.'],
                  ['Bluetooth (scan / connect)', 'To find and connect to Bluetooth receipt printers, barcode scanners and weighing scales.'],
                  ['Location', 'Android requires this permission to search for nearby Bluetooth devices on some versions. The app does not read or store your GPS location.'],
                  ['Storage / files', 'To save reports, invoices and exports you choose to download or share, and to pick a logo image.'],
                  ['Network access', 'To connect to our servers and keep your data in sync.'],
                ]}
              />
            </>
          ),
        },
        {
          id: 'how-we-use', title: 'How we use information',
          body: (
            <Bullets items={[
              <><strong>To provide the Services</strong> — create and manage accounts, run billing, inventory, reports and integrations, print and share invoices.</>,
              <><strong>Security</strong> — verify sign-ins, limit the number of devices per user, alert you about sign-ins from new devices (using device and approximate location), prevent fraud and misuse, and keep audit logs.</>,
              <><strong>Subscriptions and payments</strong> — process renewals, issue GST invoices and receipts, and keep accounting records.</>,
              <><strong>Support</strong> — answer questions, troubleshoot problems and onboard your team.</>,
              <><strong>Service communications</strong> — renewal reminders, invoices, security alerts, OTPs and important changes to the Services.</>,
              <><strong>Improvement</strong> — understand how features are used (from our own server logs) to fix issues and improve performance.</>,
              <><strong>Legal compliance</strong> — meet tax, accounting and legal obligations and respond to lawful requests.</>,
            ]} />
          ),
        },
        {
          id: 'legal-basis', title: 'Consent and legitimate uses',
          body: (
            <p>
              We process personal data with your consent, which you give when you register, sign in or submit a form, and for legitimate uses permitted by law, such as performing
              the contract with your business, complying with tax and legal obligations, and keeping the Services secure. You may withdraw consent at any time by writing to our
              Grievance Officer; withdrawal does not affect processing already done, and some Services cannot be provided without the data they need.
            </p>
          ),
        },
        {
          id: 'sharing', title: 'How we share information',
          body: (
            <>
              <p>We share data only with the service providers we need to run the Services, under contracts that require them to protect it and use it only for us:</p>
              <LegalTable
                head={['Recipient', 'Purpose']}
                rows={[
                  ['Payment gateways (currently Cashfree Payments)', 'Collect subscription payments. The gateway receives your name, email, mobile and the amount, and processes card, UPI and net-banking details under its own PCI-DSS-certified systems.'],
                  ['Payment providers you connect (for example Pine Labs, PhonePe, Paytm)', 'When your business enables a payment integration, bill amounts and references are sent to that provider under your merchant account.'],
                  ['Cloud hosting and database providers', 'Store and run the Services and their backups.'],
                  ['Email and SMS/OTP delivery providers', 'Send invoices, OTPs, alerts and service messages.'],
                  ['IP geolocation provider (ipinfo.io)', 'Convert an IP address into an approximate city for sign-in alerts.'],
                  ['Google Play', 'Distribute the Android app and deliver app updates.'],
                ]}
              />
              <p>We may also disclose data when required by law, court order or a government authority; to protect the rights, safety or property of our users, the public or us; or to a successor in a merger, acquisition or sale of assets, who must honour this policy.</p>
              <p>Our providers may store or process data outside India. Where they do, we use providers that apply security safeguards at least as strong as this policy, as permitted by Indian law.</p>
            </>
          ),
        },
        {
          id: 'security', title: 'How we protect information',
          body: (
            <Bullets items={[
              'All data is encrypted in transit using HTTPS (TLS).',
              'Passwords are stored as salted one-way hashes; we cannot see your password.',
              'Payment-integration credentials are encrypted at rest (AES-256-GCM) and never shown back through our apps.',
              'Role-based access controls limit what each staff account can see and do, the number of devices signed in to an account is limited, and sign-in sessions can be ended remotely.',
              'Access to production systems is restricted to authorised personnel, and actions in your account are recorded in audit logs.',
              'Database backups help us recover from data loss.',
            ]} />
          ),
        },
        {
          id: 'retention', title: 'How long we keep information',
          body: (
            <>
              <Bullets items={[
                'Account and business data are kept while your subscription is active.',
                `After your subscription ends, we keep your data for a ${commitments.graceDays}-day grace period and a further reasonable period so that you can renew or export it, unless you ask us to delete it sooner.`,
                `When you ask us to delete your account, we delete or anonymise your data within ${commitments.deletionDays} days of verifying the request; copies in backups are removed within ${commitments.backupPurgeDays} days.`,
                'Invoices, payment records and other data we must keep under tax, accounting or other laws (for example GST and the Companies Act) are retained for the period those laws require, generally up to 8 years, and are then deleted.',
                'Website enquiries are kept for up to 2 years unless they become a customer relationship.',
              ]} />
              <p>See <Link href="/delete-account">Account & Data Deletion</Link> for how to request deletion.</p>
            </>
          ),
        },
        {
          id: 'your-rights', title: 'Your rights',
          body: (
            <>
              <p>Subject to applicable law, you have the right to:</p>
              <Bullets items={[
                <><strong>Access</strong> a summary of your personal data and how it is processed.</>,
                <><strong>Correct and update</strong> inaccurate or incomplete data. Most details can be edited directly in the app.</>,
                <><strong>Erase</strong> your data when it is no longer needed, except where we must keep it by law.</>,
                <><strong>Export</strong> your business data in a commonly used format.</>,
                <><strong>Withdraw consent</strong> for processing based on consent.</>,
                <><strong>Grievance redressal</strong> through our Grievance Officer, and, if you are not satisfied, a complaint to the Data Protection Board of India.</>,
                <><strong>Nominate</strong> another person to exercise these rights in the event of your death or incapacity.</>,
              ]} />
              <p>To use these rights, email <a href={`mailto:${company.grievanceOfficer.email}`}>{company.grievanceOfficer.email}</a> from your registered email address. We may need to verify your identity before acting on a request.</p>
            </>
          ),
        },
        {
          id: 'cookies', title: 'Cookies and local storage',
          body: (
            <p>
              Our website does not use advertising or analytics cookies. The {company.appName} app and our web software store your sign-in session and preferences on your device
              so that you stay signed in; signing out removes the session. You can clear this data at any time through your device or browser settings.
            </p>
          ),
        },
        {
          id: 'children', title: "Children's privacy",
          body: <p>The Services are meant for businesses and are not directed at anyone under 18. We do not knowingly collect personal data from children. If you believe a child has given us personal data, contact us and we will delete it.</p>,
        },
        {
          id: 'third-party-links', title: 'Third-party services and links',
          body: <p>The Services may link to or integrate with third-party services such as payment gateways and messaging providers. Their own privacy policies govern how they handle data; we encourage you to read them.</p>,
        },
        {
          id: 'changes', title: 'Changes to this policy',
          body: <p>We may update this policy as the Services or the law change. We will post the new version on this page with a new &quot;Last updated&quot; date and, for significant changes, notify you in the app or by email before they take effect.</p>,
        },
      ]}
    />
  )
}
