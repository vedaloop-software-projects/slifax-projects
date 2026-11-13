import type { PaymentMode, Plan, Quote } from './plan.ts'

export type WhatsAppSettings = {
  enabled: boolean; monthlyQuota: number; pricePaise: number | null; walletPaise: number
  businessName: string; contactPerson: string | null; email: string | null; mobile: string
  // The store's IANA zone (null = Asia/Kolkata); the monthly quota follows its calendar.
  timeZone: string | null
}

export type Template = { id: bigint; name: string; category: string; body: string; providerTemplate: string; language: string; status: number; sortOrder: number; updatedAt: Date | null }
export type TemplateInput = { name: string; category: string; body: string; providerTemplate: string; language: string; status: number; sortOrder: number }

export type Recipient = { customerId: bigint | null; name: string; mobile: string; body: string }

// Snapshot kept on the campaign so later template edits never change what is sent.
export type CampaignContent = { providerTemplate: string; language: string; keys: string[]; values: Record<string, string> }

export type Month = { gte: Date; lt: Date }

export type CreateCampaignInput = {
  clientId: bigint; userId: bigint; templateId: bigint; templateName: string; content: CampaignContent
  recipients: Recipient[]; month: Month; holdSince: Date; defaultPricePaise: number
  mode: PaymentMode; expectedAmountPaise: number; orderId: string | null
}

export type CampaignRow = {
  id: bigint; templateName: string; recipientCount: number; freeCount: number; paidCount: number; pricePaise: number
  amountPaise: number; paymentMode: string; orderId: string | null; status: string; sentCount: number; failedCount: number
  refundedPaise: number; createdAt: Date; paidAt: Date | null; completedAt: Date | null
}

export type MessageRow = { id: bigint; customerName: string | null; mobile: string; body: string; charge: string; status: string; error: string | null; sentAt: Date | null }

// A message ready for the provider.
export type OutboundRow = { id: bigint; campaignId: bigint; clientId: bigint; mobile: string; customerName: string | null; attempts: number; content: CampaignContent }

export type WalletRow = { id: bigint; type: string; amountPaise: number; balanceAfterPaise: number; campaignId: bigint | null; orderId: string | null; note: string | null; createdAt: Date }

export type PaymentResult =
  | { status: 'missing' | 'amount_mismatch' }
  | { status: 'credited' | 'already'; walletPaise: number }
  | { status: 'queued' | 'already'; campaignId: bigint }

export interface WhatsAppStore {
  settings(clientId: bigint): Promise<WhatsAppSettings | null>
  defaultPricePaise(): Promise<number>
  // Free messages used this month: sent or on their way, plus those held by unpaid checkouts started after `holdSince`.
  freeUsed(clientId: bigint, month: Month, holdSince: Date): Promise<number>
  templates(activeOnly: boolean): Promise<Template[]>
  template(id: bigint): Promise<Template | null>
  customers(clientId: bigint, ids: bigint[]): Promise<Array<{ id: bigint; name: string | null; mobile: string | null }>>

  // Locks the client row, decides free/paid/wallet with planSend, then writes the campaign,
  // its messages and any wallet debit in one transaction.
  createCampaign(input: CreateCampaignInput): Promise<{ plan: Plan; campaignId: bigint | null }>
  cancelCampaign(clientId: bigint, campaignId: bigint): Promise<void>
  expireUnpaid(before: Date): Promise<number>

  recordCheckout(input: { clientId: bigint; userId: bigint; orderId: string; amountPaise: number; redirectUrl: string }): Promise<void>
  completeTopup(input: { clientId: bigint; userId: bigint; orderId: string; amountPaise: number }): Promise<PaymentResult>
  completeCampaignPayment(input: { clientId: bigint; orderId: string; amountPaise: number }): Promise<PaymentResult>

  // Dispatcher: claims queued messages (queued → sending) so each is handed to the provider once.
  claimQueued(limit: number): Promise<OutboundRow[]>
  markAccepted(id: bigint, providerId: string, status: string): Promise<void>
  markRetry(id: bigint, error: string): Promise<void>
  // Failed: refunds a paid message to the wallet.
  markFailed(id: bigint, error: string): Promise<void>
  // Delivery report from the provider webhook.
  applyProviderStatus(providerId: string, status: string, error: string | null): Promise<void>
  // Messages stuck in `sending` after a crash are failed (and refunded) rather than risk a double send.
  failStuck(before: Date): Promise<number>
  completeCampaigns(): Promise<number>

  campaigns(clientId: bigint, page: number, perPage: number): Promise<{ rows: CampaignRow[]; total: number }>
  campaign(clientId: bigint, id: bigint): Promise<{ campaign: CampaignRow; messages: MessageRow[] } | null>
  walletTransactions(clientId: bigint, page: number, perPage: number): Promise<{ rows: WalletRow[]; total: number }>

  // Super admin.
  saveTemplate(id: bigint | null, input: TemplateInput, adminId: bigint): Promise<bigint>
  setClientSettings(clientId: bigint, input: { enabled: boolean; monthlyQuota: number; pricePaise: number | null }, adminId: bigint): Promise<boolean>
  adjustWallet(clientId: bigint, amountPaise: number, note: string, adminId: bigint): Promise<number | null>
}

export type { Quote }
