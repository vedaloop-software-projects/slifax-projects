export type SubscriptionClient = {
  businessName: string; contactPerson: string; email: string; mobile: string; address: string; city: string; pincode: number | null; gstNumber: string | null
  duration: number; subscriptionFinalAmount: number; subscriptionGst: number; installationFinalAmount: number; installationGst: number
}
// One client_payments row is one invoice. type 1 = installation, 2 = subscription.
export type SubscriptionPayment = { id: bigint; type: number; amount: number; mode: number; reference: string | null; paidOn: Date | null; duration: number }
export interface SubscriptionStore {
  client(clientId: bigint): Promise<SubscriptionClient | null>
  payments(clientId: bigint): Promise<SubscriptionPayment[]>
}
export type InvoiceAttachment = { filename: string; content: Buffer }
export interface InvoiceMailer {
  readonly configured: boolean
  send(message: { to: string; subject: string; text: string; html: string; attachment: InvoiceAttachment }): Promise<void>
}
