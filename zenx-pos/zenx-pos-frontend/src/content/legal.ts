// Facts the legal pages depend on. Payment gateways (Cashfree, Razorpay) check that the
// legal name matches the business's KYC, and Indian law (IT Rules 2011, DPDP Act 2023,
// Consumer Protection (E-Commerce) Rules 2020) requires a named grievance officer.
// TODO(legal): confirm every value below, then have the policies reviewed by a lawyer.
import { site } from './site'

export const company = {
  legalName: 'Slifax', // TODO(legal): exact registered name, e.g. "Slifax Technologies Private Limited"
  brand: 'ZenxPOS',
  appName: 'ZenxPOS',
  androidPackage: 'com.retail.zenxpos',
  address: site.address,
  email: site.email,
  phone: site.phones[0]!,
  website: 'www.zenxpos.com',
  jurisdiction: 'Hyderabad, Telangana',
  grievanceOfficer: {
    name: 'Grievance Officer', // TODO(legal): the officer's full name
    designation: 'Grievance Officer, ZenxPOS',
    email: site.email,
    phone: site.phones[0]!,
  },
  effectiveDate: 'November 2, 2026',
}

// Commitments stated in the refund, delivery and deletion policies; change them here.
export const commitments = {
  graceDays: 7, // matches the default renewal_grace_days platform setting
  refundDays: '5–7 working days',
  duplicatePaymentReportDays: 30,
  activationHours: 48,
  hardwareDispatchDays: '3–7 working days',
  hardwareDamageReportHours: 48,
  deletionDays: 30,
  backupPurgeDays: 90,
  grievanceAckHours: 48,
  grievanceResolveDays: 30,
}

export const policies = [
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms & Conditions', href: '/terms-conditions' },
  { label: 'Refund & Cancellation Policy', href: '/refund-policy' },
  { label: 'Shipping & Delivery Policy', href: '/shipping-policy' },
  { label: 'Account & Data Deletion', href: '/delete-account' },
]
