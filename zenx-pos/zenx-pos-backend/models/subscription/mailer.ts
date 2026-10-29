import nodemailer from 'nodemailer'
import type { InvoiceMailer } from './contracts.ts'

// Uses INVOICE_SMTP_* when set, otherwise the support mailbox (SUPPORT_SMTP_*).
export class SmtpInvoiceMailer implements InvoiceMailer {
  readonly configured: boolean
  private readonly from: string
  private readonly transport?: ReturnType<typeof nodemailer.createTransport>
  constructor(environment = process.env) {
    const pick = (name: string) => environment[`INVOICE_${name}`]?.trim() || environment[`SUPPORT_${name}`]?.trim() || ''
    const host = pick('SMTP_HOST'), user = pick('SMTP_USER'), pass = pick('SMTP_APP_PASSWORD').replace(/\s/g, '')
    this.from = pick('EMAIL_FROM') || user
    this.configured = Boolean(host && user && pass && this.from)
    if (this.configured) this.transport = nodemailer.createTransport({ host, port: Number(pick('SMTP_PORT') || 465), secure: pick('SMTP_SECURE') !== 'false', auth: { user, pass } })
  }
  async send(message: Parameters<InvoiceMailer['send']>[0]) {
    if (!this.transport) throw new Error('Invoice email is not configured.')
    await this.transport.sendMail({ from: this.from, to: message.to, subject: message.subject, text: message.text, html: message.html, attachments: [{ filename: message.attachment.filename, content: message.attachment.content, contentType: 'application/pdf' }] })
  }
}
