import type { Account } from '../../models/auth/contracts.ts'
import type { PlatformSettingsStore } from '../../models/platform/contracts.ts'
import type { InvoiceMailer, SubscriptionClient, SubscriptionPayment, SubscriptionStore } from '../../models/subscription/contracts.ts'
import { renderInvoicePdf, type InvoiceDocument } from '../../models/subscription/invoice-pdf.ts'
import type { LetterheadStore } from '../../models/documents/contracts.ts'
import { DEFAULT_LETTERHEAD } from '../../models/documents/letterhead.ts'
import { ApiError, contractState } from '../auth/service.ts'

const PLANS: Record<number, { label: string; months: number }> = { 1: { label: 'Quarterly', months: 3 }, 2: { label: 'Half-yearly', months: 6 }, 3: { label: 'Yearly', months: 12 } }
const EMAIL_WINDOW_MS = 10 * 60_000, EMAILS_PER_WINDOW = 5
const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
const displayDate = (value: Date | string | null | undefined) => {
  if (!value) return null
  const iso = typeof value === 'string' ? value : value.toISOString()
  const [year, month, day] = iso.slice(0, 10).split('-')
  return `${day}-${month}-${year}`
}
const invoiceNumber = (payment: SubscriptionPayment) => `${payment.type === 1 ? 'INS' : 'REN'}-${payment.id}`
const paymentMode = (payment: SubscriptionPayment) => payment.mode === 1 ? 'Cash' : 'Bank / UPI / Online'
const maskEmail = (email: string) => { const [name = '', domain = ''] = email.split('@'); return `${name.slice(0, 2)}${'*'.repeat(Math.max(1, name.length - 2))}@${domain}` }
const safeId = (value: bigint) => { const result = Number(value); if (!Number.isSafeInteger(result)) throw new Error('Database ID exceeds the JSON number range.'); return result }

export class SubscriptionService {
  private readonly store: SubscriptionStore
  private readonly mailer: InvoiceMailer
  private readonly settings: PlatformSettingsStore | undefined
  private readonly letterheads: LetterheadStore
  private readonly now: () => Date
  private readonly emailLog = new Map<string, number[]>()
  constructor(store: SubscriptionStore, mailer: InvoiceMailer, letterheads: LetterheadStore, settings?: PlatformSettingsStore, now = () => new Date()) {
    this.store = store; this.mailer = mailer; this.letterheads = letterheads; this.settings = settings; this.now = now
  }

  private async letterhead() {
    return (await this.letterheads.get())?.design ?? DEFAULT_LETTERHEAD
  }

  // Billing details belong to the business owner, like user management.
  private authorize(account: Account) {
    if (account.user.isAdmin !== 1) throw new ApiError(403, 'Only the primary admin can view subscription details and invoices.')
  }

  private async client(account: Account) {
    const client = await this.store.client(account.client.id)
    if (!client) throw new ApiError(404, 'Client not found.')
    return client
  }

  private recipient(account: Account, client: SubscriptionClient) {
    return (account.user.email || client.email || '').trim().toLowerCase()
  }

  async details(account: Account) {
    this.authorize(account)
    const [client, payments, graceDays] = await Promise.all([this.client(account), this.store.payments(account.client.id), this.settings?.renewalGraceDays() ?? Promise.resolve(0)])
    const contract = contractState(account, this.now(), graceDays)
    const today = Date.parse(this.now().toISOString().slice(0, 10)), end = account.client.endDate ? Date.parse(account.client.endDate.toISOString().slice(0, 10)) : null
    const daysLeft = end === null ? null : Math.round((end - today) / 86_400_000)
    const status = !contract.active ? 'expired' : contract.inGrace ? 'grace' : daysLeft !== null && daysLeft <= 30 ? 'expiring' : 'active'
    const installationPaid = money(payments.filter(row => row.type === 1).reduce((sum, row) => sum + row.amount, 0))
    const recipient = this.recipient(account, client)
    return {
      businessName: client.businessName,
      plan: { duration: client.duration, label: PLANS[client.duration]?.label ?? 'Custom', months: PLANS[client.duration]?.months ?? null, amount: money(client.subscriptionFinalAmount), gstPercent: client.subscriptionGst },
      startDate: displayDate(account.client.startDate), endDate: displayDate(account.client.endDate), daysLeft, status,
      graceEndsOn: contract.inGrace ? displayDate(contract.graceEndsOn) : null, graceDaysLeft: contract.graceDaysLeft,
      installation: { amount: money(client.installationFinalAmount), paid: installationPaid, balance: Math.max(0, money(client.installationFinalAmount - installationPaid)) },
      subscriptionPaid: money(payments.filter(row => row.type === 2).reduce((sum, row) => sum + row.amount, 0)),
      invoices: payments.map(row => ({ id: safeId(row.id), invoiceNumber: invoiceNumber(row), type: row.type === 1 ? 'installation' : 'subscription',
        title: row.type === 1 ? 'Software installation' : `${PLANS[row.duration]?.label ?? 'Subscription'} subscription`, date: displayDate(row.paidOn), amount: money(row.amount), paymentMode: paymentMode(row), reference: row.reference })),
      email: { available: this.mailer.configured && Boolean(recipient), to: recipient ? maskEmail(recipient) : null },
    }
  }

  private async document(account: Account, id: bigint) {
    this.authorize(account)
    const [client, payments] = await Promise.all([this.client(account), this.store.payments(account.client.id)])
    const payment = payments.find(row => row.id === id)
    if (!payment) throw new ApiError(404, 'Invoice not found.')
    const gstPercent = payment.type === 1 ? client.installationGst : client.subscriptionGst
    const taxable = money(payment.amount / (1 + gstPercent / 100)), plan = PLANS[payment.duration]
    const invoice: InvoiceDocument = {
      number: invoiceNumber(payment), date: displayDate(payment.paidOn) ?? displayDate(this.now())!, generatedAt: displayDate(this.now())!,
      buyer: { name: client.businessName, contact: client.contactPerson, address: [client.address, client.city, client.pincode].filter(Boolean).join(', '), gstin: client.gstNumber, mobile: client.mobile, email: client.email },
      description: payment.type === 1 ? 'ZenxPOS software installation' : `ZenxPOS ${plan?.label.toLowerCase() ?? ''} subscription`.replace('  ', ' '),
      detail: payment.type === 1 ? 'One-time setup and licence' : plan ? `${plan.months} months of ZenxPOS service` : 'ZenxPOS service',
      taxable, gstPercent, gstAmount: money(payment.amount - taxable), total: money(payment.amount), paymentMode: paymentMode(payment), reference: payment.reference,
    }
    return { invoice, client, filename: `ZenxPOS-Invoice-${invoice.number}.pdf` }
  }

  async invoicePdf(account: Account, id: bigint) {
    const { invoice, filename } = await this.document(account, id)
    return { filename, content: await renderInvoicePdf(invoice, await this.letterhead()) }
  }

  async emailInvoice(account: Account, id: bigint) {
    const { invoice, client, filename } = await this.document(account, id)
    if (!this.mailer.configured) throw new ApiError(503, 'Invoice email is not set up yet. Download the invoice instead, or contact ZenxPOS support.')
    const to = this.recipient(account, client)
    if (!to) throw new ApiError(422, 'Add an email address to your account to receive invoices.')
    const key = account.user.id.toString(), now = this.now().getTime(), recent = (this.emailLog.get(key) ?? []).filter(time => now - time < EMAIL_WINDOW_MS)
    if (recent.length >= EMAILS_PER_WINDOW) throw new ApiError(429, 'Too many invoice emails. Please try again in a few minutes.')
    const letterhead = await this.letterhead(), content = await renderInvoicePdf(invoice, letterhead)
    await this.mailer.send({
      to, subject: `Your ${letterhead.company.name} invoice ${invoice.number}`, attachment: { filename, content },
      text: `Hello ${client.contactPerson || client.businessName},\n\nPlease find attached invoice ${invoice.number} dated ${invoice.date} for ${invoice.description}, amount INR ${invoice.total.toFixed(2)}.\n\nThank you for choosing ZenxPOS.`,
      html: `<div style="font-family:Arial,sans-serif;color:#172033"><p>Hello ${escapeHtml(client.contactPerson || client.businessName)},</p><p>Please find attached invoice <b>${invoice.number}</b> dated ${invoice.date} for ${escapeHtml(invoice.description)}, amount <b>&#8377;${invoice.total.toFixed(2)}</b>.</p><p>Thank you for choosing ZenxPOS.</p></div>`,
    })
    recent.push(now); this.emailLog.set(key, recent)
    return { sentTo: maskEmail(to), invoiceNumber: invoice.number }
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)
}
