import type { Prisma, PrismaClient } from '@prisma/client'
import type { CampaignContent, CampaignRow, CreateCampaignInput, Month, OutboundRow, PaymentResult, TemplateInput, WhatsAppStore } from './contracts.ts'
import { advances, DEFAULT_PRICE_PAISE, planSend } from './plan.ts'

type Tx = Prisma.TransactionClient
// Statuses that count against the monthly quota (handed over or about to be).
const ACTIVE = ['queued', 'sending', 'accepted', 'sent', 'delivered', 'read']

const campaignRow = (row: { id: bigint; template_name: string; recipient_count: number; free_count: number; paid_count: number; price_paise: number; amount_paise: bigint; payment_mode: string; order_id: string | null; status: string; sent_count: number; failed_count: number; refunded_paise: bigint; created_at: Date; paid_at: Date | null; completed_at: Date | null }): CampaignRow => ({
  id: row.id, templateName: row.template_name, recipientCount: row.recipient_count, freeCount: row.free_count, paidCount: row.paid_count,
  pricePaise: row.price_paise, amountPaise: Number(row.amount_paise), paymentMode: row.payment_mode, orderId: row.order_id, status: row.status,
  sentCount: row.sent_count, failedCount: row.failed_count, refundedPaise: Number(row.refunded_paise), createdAt: row.created_at, paidAt: row.paid_at, completedAt: row.completed_at,
})

export class PrismaWhatsAppStore implements WhatsAppStore {
  private readonly prisma: PrismaClient
  constructor(prisma: PrismaClient) { this.prisma = prisma }

  private lockClient(tx: Tx, clientId: bigint) { return tx.$queryRaw`SELECT id FROM users WHERE id = ${clientId} FOR UPDATE` }

  async settings(clientId: bigint) {
    const row = await this.prisma.users.findFirst({ where: { id: clientId, trash: 0 }, select: { whatsapp_enabled: true, whatsapp_monthly_quota: true, whatsapp_price_paise: true, whatsapp_wallet_paise: true, business_name: true, contact_person: true, email: true, mobile: true, time_zone: true } })
    return row ? { enabled: row.whatsapp_enabled === 1, monthlyQuota: row.whatsapp_monthly_quota, pricePaise: row.whatsapp_price_paise, walletPaise: Number(row.whatsapp_wallet_paise), businessName: row.business_name, contactPerson: row.contact_person || null, email: row.email || null, mobile: row.mobile, timeZone: row.time_zone } : null
  }

  async defaultPricePaise() {
    const row = await this.prisma.platformSettings.findUnique({ where: { setting_key: 'whatsapp_price_paise' }, select: { setting_value: true } })
    const value = Number(row?.setting_value)
    return Number.isInteger(value) && value > 0 ? value : DEFAULT_PRICE_PAISE
  }

  private async countFree(db: Tx | PrismaClient, clientId: bigint, month: Month, holdSince: Date) {
    const [active, held] = await Promise.all([
      db.whatsappMessages.count({ where: { client_id: clientId, charge: 'free', status: { in: ACTIVE }, created_at: { gte: month.gte, lt: month.lt } } }),
      db.whatsappMessages.count({ where: { client_id: clientId, charge: 'free', status: 'awaiting_payment', created_at: { gte: holdSince > month.gte ? holdSince : month.gte, lt: month.lt } } }),
    ])
    return active + held
  }

  freeUsed(clientId: bigint, month: Month, holdSince: Date) { return this.countFree(this.prisma, clientId, month, holdSince) }

  async templates(activeOnly: boolean) {
    const rows = await this.prisma.whatsappTemplates.findMany({ where: activeOnly ? { status: 1 } : {}, orderBy: [{ sort_order: 'asc' }, { id: 'asc' }] })
    return rows.map(row => ({ id: row.id, name: row.name, category: row.category, body: row.body, providerTemplate: row.provider_template, language: row.language, status: row.status, sortOrder: row.sort_order, updatedAt: row.updated_at }))
  }

  async template(id: bigint) {
    const row = await this.prisma.whatsappTemplates.findUnique({ where: { id } })
    return row ? { id: row.id, name: row.name, category: row.category, body: row.body, providerTemplate: row.provider_template, language: row.language, status: row.status, sortOrder: row.sort_order, updatedAt: row.updated_at } : null
  }

  async customers(clientId: bigint, ids: bigint[]) {
    if (!ids.length) return []
    const rows = await this.prisma.customers.findMany({ where: { client_id: clientId, id: { in: ids }, trash: 0 }, select: { id: true, customer_name: true, mobile: true } })
    return rows.map(row => ({ id: row.id, name: row.customer_name, mobile: row.mobile }))
  }

  async createCampaign(input: CreateCampaignInput) {
    return this.prisma.$transaction(async tx => {
      await this.lockClient(tx, input.clientId)
      const client = await tx.users.findFirst({ where: { id: input.clientId, trash: 0 }, select: { whatsapp_monthly_quota: true, whatsapp_price_paise: true, whatsapp_wallet_paise: true } })
      if (!client) throw new Error('Client not found.')
      const freeUsed = await this.countFree(tx, input.clientId, input.month, input.holdSince)
      const plan = planSend({ recipients: input.recipients.length, quota: client.whatsapp_monthly_quota, freeUsed, pricePaise: client.whatsapp_price_paise ?? input.defaultPricePaise, walletPaise: Number(client.whatsapp_wallet_paise), mode: input.mode, expectedAmountPaise: input.expectedAmountPaise })
      if (!plan.ok) return { plan, campaignId: null }
      const now = new Date()
      const campaign = await tx.whatsappCampaigns.create({ data: {
        client_id: input.clientId, user_id: input.userId, template_id: input.templateId, template_name: input.templateName, variables: input.content as unknown as Prisma.InputJsonValue,
        recipient_count: plan.quote.recipients, free_count: plan.quote.free, paid_count: plan.quote.paid, price_paise: plan.quote.pricePaise, amount_paise: BigInt(plan.quote.amountPaise),
        payment_mode: plan.paymentMode, order_id: plan.paymentMode === 'online' ? input.orderId : null, status: plan.status, created_at: now, updated_at: now,
      }, select: { id: true } })
      const status = plan.status === 'queued' ? 'queued' : 'awaiting_payment'
      await tx.whatsappMessages.createMany({ data: input.recipients.map((recipient, index) => ({
        campaign_id: campaign.id, client_id: input.clientId, customer_id: recipient.customerId, customer_name: recipient.name, mobile: recipient.mobile, body: recipient.body,
        charge: index < plan.quote.free ? 'free' : 'paid', status, created_at: now, updated_at: now,
      })) })
      if (plan.walletDebitPaise > 0) {
        const balance = Number(client.whatsapp_wallet_paise) - plan.walletDebitPaise
        await tx.users.update({ where: { id: input.clientId }, data: { whatsapp_wallet_paise: BigInt(balance) } })
        await tx.whatsappWalletTransactions.create({ data: { client_id: input.clientId, type: 'send', amount_paise: BigInt(-plan.walletDebitPaise), balance_after_paise: BigInt(balance), campaign_id: campaign.id, note: `${plan.quote.paid} message${plan.quote.paid === 1 ? '' : 's'} × ₹${(plan.quote.pricePaise / 100).toFixed(2)}`, created_by: input.userId, created_at: now } })
      }
      return { plan, campaignId: campaign.id }
    })
  }

  async cancelCampaign(clientId: bigint, campaignId: bigint) {
    const now = new Date()
    await this.prisma.$transaction([
      this.prisma.whatsappCampaigns.updateMany({ where: { id: campaignId, client_id: clientId, status: 'pending_payment' }, data: { status: 'expired', updated_at: now } }),
      this.prisma.whatsappMessages.updateMany({ where: { campaign_id: campaignId, client_id: clientId, status: 'awaiting_payment' }, data: { status: 'cancelled', updated_at: now } }),
    ])
  }

  async expireUnpaid(before: Date) {
    const stale = await this.prisma.whatsappCampaigns.findMany({ where: { status: 'pending_payment', created_at: { lt: before } }, select: { id: true, client_id: true }, take: 200 })
    for (const campaign of stale) await this.cancelCampaign(campaign.client_id, campaign.id)
    return stale.length
  }

  async recordCheckout(input: { clientId: bigint; userId: bigint; orderId: string; amountPaise: number; redirectUrl: string }) {
    const provider = await this.prisma.integrationProviders.findUnique({ where: { code: 'cashfree' }, select: { id: true } })
    if (!provider) throw new Error('Integration provider is unavailable.')
    const now = new Date()
    await this.prisma.paymentGatewayTransactions.create({ data: { client_id: input.clientId, provider_id: provider.id, merchant_reference: input.orderId, external_order_id: input.orderId, amount_in_paise: BigInt(input.amountPaise), currency: 'INR', status: 'created', redirect_url: input.redirectUrl, created_by: input.userId, created_at: now, updated_at: now } })
  }

  // The payment row is claimed (created → paid) inside the transaction, so a repeated
  // verify never credits or queues twice.
  private async claimPayment(tx: Tx, clientId: bigint, orderId: string, amountPaise: number): Promise<'missing' | 'amount_mismatch' | 'already' | 'claimed'> {
    const provider = await tx.integrationProviders.findUnique({ where: { code: 'cashfree' }, select: { id: true } })
    if (!provider) return 'missing'
    const row = await tx.paymentGatewayTransactions.findUnique({ where: { client_id_provider_id_merchant_reference: { client_id: clientId, provider_id: provider.id, merchant_reference: orderId } } })
    if (!row) return 'missing'
    if (Number(row.amount_in_paise) !== amountPaise) return 'amount_mismatch'
    const claimed = await tx.paymentGatewayTransactions.updateMany({ where: { id: row.id, status: { not: 'paid' } }, data: { status: 'paid', updated_at: new Date() } })
    return claimed.count === 1 ? 'claimed' : 'already'
  }

  async completeTopup(input: { clientId: bigint; userId: bigint; orderId: string; amountPaise: number }): Promise<PaymentResult> {
    return this.prisma.$transaction(async tx => {
      const claim = await this.claimPayment(tx, input.clientId, input.orderId, input.amountPaise)
      if (claim === 'missing' || claim === 'amount_mismatch') return { status: claim }
      await this.lockClient(tx, input.clientId)
      const client = await tx.users.findUniqueOrThrow({ where: { id: input.clientId }, select: { whatsapp_wallet_paise: true } })
      if (claim === 'already') return { status: 'already', walletPaise: Number(client.whatsapp_wallet_paise) }
      const balance = Number(client.whatsapp_wallet_paise) + input.amountPaise
      const now = new Date()
      await tx.users.update({ where: { id: input.clientId }, data: { whatsapp_wallet_paise: BigInt(balance) } })
      await tx.whatsappWalletTransactions.create({ data: { client_id: input.clientId, type: 'topup', amount_paise: BigInt(input.amountPaise), balance_after_paise: BigInt(balance), order_id: input.orderId, note: 'Cashfree top-up', created_by: input.userId, created_at: now } })
      return { status: 'credited', walletPaise: balance }
    })
  }

  async completeCampaignPayment(input: { clientId: bigint; orderId: string; amountPaise: number }): Promise<PaymentResult> {
    return this.prisma.$transaction(async tx => {
      const campaign = await tx.whatsappCampaigns.findFirst({ where: { client_id: input.clientId, order_id: input.orderId }, select: { id: true } })
      if (!campaign) return { status: 'missing' }
      const claim = await this.claimPayment(tx, input.clientId, input.orderId, input.amountPaise)
      if (claim === 'missing' || claim === 'amount_mismatch') return { status: claim }
      if (claim === 'already') return { status: 'already', campaignId: campaign.id }
      const now = new Date()
      // Paid after the 30-minute hold expired: the payment still goes through and the messages are sent.
      await tx.whatsappCampaigns.update({ where: { id: campaign.id }, data: { status: 'queued', paid_at: now, updated_at: now } })
      await tx.whatsappMessages.updateMany({ where: { campaign_id: campaign.id, status: { in: ['awaiting_payment', 'cancelled'] } }, data: { status: 'queued', updated_at: now } })
      return { status: 'queued', campaignId: campaign.id }
    })
  }

  async claimQueued(limit: number) {
    const candidates = await this.prisma.whatsappMessages.findMany({ where: { status: 'queued' }, orderBy: { id: 'asc' }, take: limit, select: { id: true, campaign_id: true, client_id: true, mobile: true, customer_name: true, attempts: true } })
    const claimed: typeof candidates = []
    for (const row of candidates) {
      const result = await this.prisma.whatsappMessages.updateMany({ where: { id: row.id, status: 'queued' }, data: { status: 'sending', updated_at: new Date() } })
      if (result.count === 1) claimed.push(row)
    }
    const campaigns = await this.prisma.whatsappCampaigns.findMany({ where: { id: { in: [...new Set(claimed.map(row => row.campaign_id))] } }, select: { id: true, variables: true } })
    const content = new Map(campaigns.map(campaign => [campaign.id, campaign.variables as unknown as CampaignContent]))
    return claimed.map((row): OutboundRow => ({ id: row.id, campaignId: row.campaign_id, clientId: row.client_id, mobile: row.mobile, customerName: row.customer_name, attempts: row.attempts, content: content.get(row.campaign_id)! }))
  }

  async markAccepted(id: bigint, providerId: string, status: string) {
    const now = new Date()
    await this.prisma.$transaction(async tx => {
      const updated = await tx.whatsappMessages.updateMany({ where: { id, status: 'sending' }, data: { status: advances('accepted', status) ? status : 'accepted', provider_message_id: providerId.slice(0, 191), error: null, sent_at: now, updated_at: now } })
      if (updated.count !== 1) return
      const message = await tx.whatsappMessages.findUniqueOrThrow({ where: { id }, select: { campaign_id: true } })
      await tx.whatsappCampaigns.update({ where: { id: message.campaign_id }, data: { sent_count: { increment: 1 }, updated_at: now } })
    })
  }

  async markRetry(id: bigint, error: string) {
    await this.prisma.whatsappMessages.updateMany({ where: { id, status: 'sending' }, data: { status: 'queued', attempts: { increment: 1 }, error: error.slice(0, 255), updated_at: new Date() } })
  }

  private async fail(tx: Tx, id: bigint, error: string) {
    const message = await tx.whatsappMessages.findUnique({ where: { id }, select: { status: true, charge: true, campaign_id: true, client_id: true } })
    if (!message || !advances(message.status, 'failed')) return
    const now = new Date()
    const updated = await tx.whatsappMessages.updateMany({ where: { id, status: message.status }, data: { status: 'failed', error: error.slice(0, 255), updated_at: now } })
    if (updated.count !== 1) return
    const wasCounted = message.status !== 'queued' && message.status !== 'sending'
    const campaign = await tx.whatsappCampaigns.update({ where: { id: message.campaign_id }, data: { failed_count: { increment: 1 }, ...(wasCounted ? { sent_count: { decrement: 1 } } : {}), updated_at: now }, select: { price_paise: true } })
    // A free message simply stops counting against the quota; a paid one goes back to the wallet.
    if (message.charge !== 'paid') return
    await this.lockClient(tx, message.client_id)
    const client = await tx.users.findUniqueOrThrow({ where: { id: message.client_id }, select: { whatsapp_wallet_paise: true } })
    const balance = Number(client.whatsapp_wallet_paise) + campaign.price_paise
    await tx.users.update({ where: { id: message.client_id }, data: { whatsapp_wallet_paise: BigInt(balance) } })
    await tx.whatsappCampaigns.update({ where: { id: message.campaign_id }, data: { refunded_paise: { increment: BigInt(campaign.price_paise) } } })
    await tx.whatsappWalletTransactions.create({ data: { client_id: message.client_id, type: 'refund', amount_paise: BigInt(campaign.price_paise), balance_after_paise: BigInt(balance), campaign_id: message.campaign_id, note: 'Message not delivered', created_at: now } })
  }

  markFailed(id: bigint, error: string) { return this.prisma.$transaction(tx => this.fail(tx, id, error)) }

  async applyProviderStatus(providerId: string, status: string, error: string | null) {
    const message = await this.prisma.whatsappMessages.findFirst({ where: { provider_message_id: providerId }, select: { id: true, status: true } })
    if (!message) return
    if (status === 'failed') { await this.markFailed(message.id, error || 'WhatsApp could not deliver this message.'); return }
    if (!advances(message.status, status)) return
    await this.prisma.whatsappMessages.updateMany({ where: { id: message.id, status: message.status }, data: { status, updated_at: new Date() } })
  }

  // With an idempotency key per message, re-sending a message that may already have reached the
  // provider is safe: the provider returns the first one instead of sending again.
  async failStuck(before: Date) {
    const result = await this.prisma.whatsappMessages.updateMany({ where: { status: 'sending', updated_at: { lt: before } }, data: { status: 'queued', updated_at: new Date() } })
    return result.count
  }

  async completeCampaigns() {
    const open = await this.prisma.whatsappCampaigns.findMany({ where: { status: 'queued' }, select: { id: true }, take: 200 })
    let done = 0
    for (const campaign of open) {
      const pending = await this.prisma.whatsappMessages.count({ where: { campaign_id: campaign.id, status: { in: ['queued', 'sending', 'awaiting_payment'] } } })
      if (pending) continue
      const now = new Date()
      done += (await this.prisma.whatsappCampaigns.updateMany({ where: { id: campaign.id, status: 'queued' }, data: { status: 'completed', completed_at: now, updated_at: now } })).count
    }
    return done
  }

  async campaigns(clientId: bigint, page: number, perPage: number) {
    const where = { client_id: clientId }
    const [rows, total] = await Promise.all([
      this.prisma.whatsappCampaigns.findMany({ where, orderBy: { id: 'desc' }, skip: (page - 1) * perPage, take: perPage }),
      this.prisma.whatsappCampaigns.count({ where }),
    ])
    return { rows: rows.map(campaignRow), total }
  }

  async campaign(clientId: bigint, id: bigint) {
    const row = await this.prisma.whatsappCampaigns.findFirst({ where: { id, client_id: clientId } })
    if (!row) return null
    const messages = await this.prisma.whatsappMessages.findMany({ where: { campaign_id: id, client_id: clientId }, orderBy: { id: 'asc' }, take: 1000 })
    return { campaign: campaignRow(row), messages: messages.map(message => ({ id: message.id, customerName: message.customer_name, mobile: message.mobile, body: message.body, charge: message.charge, status: message.status, error: message.error, sentAt: message.sent_at })) }
  }

  async walletTransactions(clientId: bigint, page: number, perPage: number) {
    const where = { client_id: clientId }
    const [rows, total] = await Promise.all([
      this.prisma.whatsappWalletTransactions.findMany({ where, orderBy: { id: 'desc' }, skip: (page - 1) * perPage, take: perPage }),
      this.prisma.whatsappWalletTransactions.count({ where }),
    ])
    return { rows: rows.map(row => ({ id: row.id, type: row.type, amountPaise: Number(row.amount_paise), balanceAfterPaise: Number(row.balance_after_paise), campaignId: row.campaign_id, orderId: row.order_id, note: row.note, createdAt: row.created_at })), total }
  }

  async saveTemplate(id: bigint | null, input: TemplateInput, adminId: bigint) {
    const now = new Date()
    const data = { name: input.name, category: input.category, body: input.body, provider_template: input.providerTemplate, language: input.language, status: input.status, sort_order: input.sortOrder, updated_by: adminId, updated_at: now }
    if (id) { await this.prisma.whatsappTemplates.update({ where: { id }, data }); return id }
    return (await this.prisma.whatsappTemplates.create({ data: { ...data, created_by: adminId, created_at: now }, select: { id: true } })).id
  }

  async setClientSettings(clientId: bigint, input: { enabled: boolean; monthlyQuota: number; pricePaise: number | null }, adminId: bigint) {
    const result = await this.prisma.users.updateMany({ where: { id: clientId, trash: 0 }, data: { whatsapp_enabled: input.enabled ? 1 : 0, whatsapp_monthly_quota: input.monthlyQuota, whatsapp_price_paise: input.pricePaise, updated_by: Number(adminId), updated_at: new Date() } })
    return result.count === 1
  }

  async adjustWallet(clientId: bigint, amountPaise: number, note: string, adminId: bigint) {
    return this.prisma.$transaction(async tx => {
      await this.lockClient(tx, clientId)
      const client = await tx.users.findFirst({ where: { id: clientId, trash: 0 }, select: { whatsapp_wallet_paise: true } })
      if (!client) return null
      const balance = Number(client.whatsapp_wallet_paise) + amountPaise
      if (balance < 0) return null
      const now = new Date()
      await tx.users.update({ where: { id: clientId }, data: { whatsapp_wallet_paise: BigInt(balance) } })
      await tx.whatsappWalletTransactions.create({ data: { client_id: clientId, type: 'adjustment', amount_paise: BigInt(amountPaise), balance_after_paise: BigInt(balance), note: note.slice(0, 255), created_by: adminId, created_at: now } })
      return balance
    })
  }
}
