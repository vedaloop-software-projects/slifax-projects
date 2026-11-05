import { isIP, Socket } from 'node:net'
import nodemailer, { type SendMailOptions } from 'nodemailer'
import addressparser from 'nodemailer/lib/addressparser/index.js'
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js'
import type { WebsiteEnquiry, WebsiteEnquiryEmailDelivery } from './contracts.ts'

type Mailbox = { name: string; address: string }
type DeliveryAddress = string | { address: string }
type DeliveryResult = { accepted: DeliveryAddress[]; rejected: DeliveryAddress[]; pending?: DeliveryAddress[] }
export interface WebsiteEnquiryMailTransport {
  sendMail(message: SendMailOptions): Promise<DeliveryResult>
  close(): void
}
export type WebsiteEnquiryTransportFactory = (options: SMTPTransport.Options) => WebsiteEnquiryMailTransport

type Configuration = { options: SMTPTransport.Options; from: Mailbox; recipients: Mailbox[]; adminUrl?: string }
const deadlineMs = 45_000
const headerControl = /[\u0000-\u001f\u007f]/
const emailPattern = /^[A-Z0-9!#$%&'*+/=?^_`{|}~.-]+@[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?)+$/i
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)

const validEmail = (value: string) => value.length <= 254 && emailPattern.test(value) && !value.startsWith('.') && !value.includes('..') && !value.includes('.@')
const mailbox = (value: string): Mailbox | null => {
  if (!value || headerControl.test(value)) return null
  const addresses = addressparser(value, { flatten: true })
  return addresses.length === 1 && validEmail(addresses[0]!.address) ? addresses[0]! : null
}

function configuration(environment: NodeJS.ProcessEnv): Configuration | null {
  const host = environment.SUPPORT_SMTP_HOST?.trim()
  const user = environment.SUPPORT_SMTP_USER?.trim()
  const pass = environment.SUPPORT_SMTP_APP_PASSWORD?.replace(/\s/g, '')
  const port = Number(environment.SUPPORT_SMTP_PORT?.trim() || 465)
  const secure = environment.SUPPORT_SMTP_SECURE?.trim().toLowerCase() || 'true'
  const from = mailbox(environment.ENQUIRY_EMAIL_FROM?.trim() || environment.SUPPORT_EMAIL_FROM?.trim() || user || '')
  const to = environment.ENQUIRY_EMAIL_TO?.trim() || environment.SUPPORT_EMAIL_TO?.trim() || ''
  const recipients = to.split(',').map(value => value.trim()).filter(Boolean).map(mailbox)
  const validHost = host && (isIP(host) || (host.length <= 253 && host.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))))
  if (!validHost || !user || headerControl.test(user) || !pass || !Number.isInteger(port) || port < 1 || port > 65_535 || !['true', 'false'].includes(secure) || !from || !recipients.length || recipients.some(value => !value)) return null

  let adminUrl: string | undefined
  const adminBase = environment.ENQUIRY_ADMIN_URL?.trim()
  if (adminBase) {
    try {
      const url = new URL(adminBase)
      const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      if (headerControl.test(adminBase) || url.username || url.password || url.search || !(url.protocol === 'https:' || (url.protocol === 'http:' && local))) return null
      url.hash = '/website-enquiries'
      adminUrl = url.toString()
    } catch { return null }
  }

  const uniqueRecipients = [...new Map((recipients as Mailbox[]).map(value => [value.address.toLowerCase(), value])).values()]
  return {
    options: {
      host, port, secure: secure === 'true', requireTLS: secure === 'false', auth: { user, pass },
      connectionTimeout: 15_000, greetingTimeout: 10_000, socketTimeout: 20_000, dnsTimeout: 10_000,
      logger: false, debug: false,
    },
    from, recipients: uniqueRecipients, adminUrl,
  }
}

export const createWebsiteEnquirySmtpTransport: WebsiteEnquiryTransportFactory = options => {
  // Nodemailer's SMTP close() alone does not cancel an in-flight send. Owning its
  // supported, initially unconnected socket also lets the deadline end TLS/SMTP.
  const socket = new Socket()
  const transport = nodemailer.createTransport({ ...options, socket })
  return {
    sendMail: message => transport.sendMail(message),
    close() { socket.destroy(); transport.close() },
  }
}

function message(enquiry: WebsiteEnquiry, config: Configuration): SendMailOptions {
  if (!validEmail(enquiry.email) || headerControl.test(enquiry.email) || !uuidPattern.test(enquiry.submissionId)) throw new Error('Invalid website enquiry email data')
  const type = enquiry.type === 'quote' ? 'Quote request' : 'Contact enquiry'
  const reference = `ZENX-${enquiry.id.toString()}`
  const fields: Array<[string, string]> = [
    ['Reference', reference], ['Submission ID', enquiry.submissionId], ['Enquiry type', type],
    ['Selected plan', enquiry.selectedPlan ?? 'Not specified'], ['Business name', enquiry.businessName],
    ['Contact person', enquiry.contactPersonName], ['Mobile', enquiry.mobile], ['Email', enquiry.email],
    ['City', enquiry.city ?? 'Not specified'], ['Business type', enquiry.businessTypeName ?? 'Not specified'],
    ['Business type ID', enquiry.businessTypeId?.toString() ?? 'Not specified'],
    ['Received (UTC)', enquiry.createdAt.toISOString()], ['Subject', enquiry.subject], ['Message', enquiry.message],
  ]
  const text = [
    'ZenxPOS — new website enquiry', '', ...fields.map(([label, value]) => `${label}: ${value}`),
    ...(config.adminUrl ? ['', `Open the enquiry inbox: ${config.adminUrl}`] : []),
    '', 'Reply to this email to contact the person who submitted this enquiry.',
  ].join('\n')
  const rows = fields.map(([label, value]) => `<tr><th scope="row" style="padding:12px 16px;border-bottom:1px solid #dce8ed;text-align:left;vertical-align:top;font-size:13px;color:#49616d;width:150px">${escapeHtml(label)}</th><td style="padding:12px 16px;border-bottom:1px solid #dce8ed;color:#10212b;white-space:pre-wrap;word-break:break-word">${escapeHtml(value)}</td></tr>`).join('')
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#edf4f7;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6"><div style="max-width:680px;margin:24px auto;background:#fff;border:1px solid #dce8ed;border-radius:16px;overflow:hidden"><div style="padding:28px 32px;background:#081922;border-top:5px solid #42dfff"><p style="margin:0 0 8px;color:#42dfff;font-size:13px;letter-spacing:2px;font-weight:bold">ZENXPOS</p><h1 style="margin:0;color:#f5fbff;font-size:25px">New ${escapeHtml(type.toLowerCase())}</h1><p style="margin:8px 0 0;color:#c0d4df">A website visitor is ready to talk. Reference ${escapeHtml(reference)}.</p></div><div style="padding:16px"><table style="width:100%;border-collapse:collapse">${rows}</table></div>${config.adminUrl ? `<p style="margin:8px 32px 24px"><a href="${escapeHtml(config.adminUrl)}" style="display:inline-block;background:#42dfff;color:#081922;padding:12px 18px;border-radius:8px;font-weight:bold;text-decoration:none">Open enquiry inbox</a></p>` : ''}<p style="margin:0;padding:20px 32px;background:#f3f8fa;color:#49616d;font-size:12px">Reply to this email to contact the person who submitted this enquiry.</p></div></body></html>`
  const domain = config.from.address.slice(config.from.address.lastIndexOf('@') + 1).toLowerCase()
  return {
    from: config.from, to: config.recipients, replyTo: { address: enquiry.email, name: '' },
    subject: `[ZenxPOS] ${type} #${enquiry.id.toString()}`,
    messageId: `<website-enquiry.${enquiry.submissionId.toLowerCase()}@${domain}>`,
    date: enquiry.createdAt, text, html,
    disableFileAccess: true, disableUrlAccess: true,
  }
}

export class SmtpWebsiteEnquiryEmailDelivery implements WebsiteEnquiryEmailDelivery {
  readonly configured: boolean
  private readonly config: Configuration | null
  private readonly factory: WebsiteEnquiryTransportFactory

  constructor(environment: NodeJS.ProcessEnv = process.env, factory: WebsiteEnquiryTransportFactory = createWebsiteEnquirySmtpTransport) {
    this.config = configuration(environment)
    this.configured = Boolean(this.config)
    this.factory = factory
  }

  async send(enquiry: WebsiteEnquiry): Promise<void> {
    if (!this.config) throw new Error('Website enquiry email is not configured')
    const mail = message(enquiry, this.config)
    const transport = this.factory(this.config.options)
    let closed = false
    const close = () => {
      if (closed) return
      closed = true
      try { transport.close() } catch { /* Cleanup must not hide the delivery result. */ }
    }
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        close()
        reject(new Error('Website enquiry email delivery timed out'))
      }, deadlineMs)
    })
    try {
      const result = await Promise.race([transport.sendMail(mail), timeout])
      const accepted = new Set(result.accepted.map(value => (typeof value === 'string' ? value : value.address).toLowerCase()))
      if (result.rejected.length || result.pending?.length || this.config.recipients.some(value => !accepted.has(value.address.toLowerCase()))) throw new Error('Website enquiry email was not accepted by every recipient')
    } finally {
      clearTimeout(timer)
      close()
    }
  }
}
