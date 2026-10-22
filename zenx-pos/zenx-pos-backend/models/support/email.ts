import nodemailer from 'nodemailer'
import type { SupportEmailDelivery, SupportIncident } from './contracts.ts'

const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)

export class SmtpSupportEmailDelivery implements SupportEmailDelivery {
  readonly configured: boolean
  private readonly recipients: string[]
  private readonly from: string
  private readonly transport?: ReturnType<typeof nodemailer.createTransport>
  constructor(environment = process.env) {
    const host = environment.SUPPORT_SMTP_HOST?.trim(), user = environment.SUPPORT_SMTP_USER?.trim(), pass = environment.SUPPORT_SMTP_APP_PASSWORD?.replace(/\s/g, '')
    this.recipients = (environment.SUPPORT_EMAIL_TO ?? '').split(',').map(value => value.trim()).filter(Boolean)
    this.from = environment.SUPPORT_EMAIL_FROM?.trim() || user || ''
    this.configured = Boolean(host && user && pass && this.from && this.recipients.length)
    if (this.configured) this.transport = nodemailer.createTransport({ host, port: Number(environment.SUPPORT_SMTP_PORT ?? 465), secure: environment.SUPPORT_SMTP_SECURE !== 'false', auth: { user, pass } })
  }
  async send(incident: SupportIncident) {
    if (!this.transport) return
    const rows = [
      ['Incident', `#${incident.id}`], ['Priority', incident.priority], ['Source', incident.source], ['Category', incident.category],
      ['Tenant', incident.clientId?.toString() ?? 'Platform'], ['Endpoint', [incident.method, incident.path].filter(Boolean).join(' ') || 'N/A'],
      ['HTTP status', incident.statusCode ?? 'N/A'], ['Request ID', incident.requestId ?? 'N/A'], ['Occurred', incident.lastSeenAt.toISOString()],
    ].map(([label, value]) => `<tr><th style="text-align:left;padding:7px;background:#f4f6f8">${escape(label)}</th><td style="padding:7px">${escape(value)}</td></tr>`).join('')
    await this.transport.sendMail({
      from: this.from, to: this.recipients.join(','), subject: `[${incident.priority}] ZenxPOS ${incident.title} (#${incident.id})`,
      text: `${incident.priority} ${incident.title}\n\n${incident.description}\n\nRecommended action: ${incident.resolutionSteps ?? 'Review and assign the incident.'}\nRequest ID: ${incident.requestId ?? 'N/A'}`,
      html: `<div style="font-family:Arial,sans-serif;color:#172033"><h2 style="color:${incident.priority === 'P1' ? '#b42318' : '#b54708'}">${escape(incident.priority)} support incident</h2><h3>${escape(incident.title)}</h3><table style="border-collapse:collapse;width:100%;max-width:720px" border="1" cellpadding="0">${rows}</table><h4>Description</h4><p>${escape(incident.description)}</p><h4>Recommended action</h4><p>${escape(incident.resolutionSteps ?? 'Review and assign the incident.')}</p></div>`,
    })
  }
}
