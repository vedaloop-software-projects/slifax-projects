// Same-origin requests use the two explicit backend rewrites in next.config.ts.
// A public URL can override this when the website and API are hosted separately.
export const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, '') || '/api'

export type BusinessType = { id: number; name: string }

export type EnquiryInput = {
  type: 'quote' | 'contact'
  selectedPlan: 'Standard' | 'Premium' | 'Help me choose' | null
  submissionId: string
  businessName: string
  contactPersonName: string
  mobile: string
  email: string
  businessTypeId: number | null
  city: string | null
  subject: string
  message: string
}

export async function businessTypes(): Promise<BusinessType[]> {
  const response = await fetch(`${apiBaseUrl}/registrationBusinessTypes`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10_000) })
  if (!response.ok) return []
  const body = (await response.json()) as { data?: BusinessType[] }
  return Array.isArray(body.data) ? body.data : []
}

/** Persists a website enquiry for the authenticated super-admin inbox. */
export async function sendEnquiry(input: EnquiryInput): Promise<string> {
  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}/website-enquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(20_000),
    })
  } catch {
    throw new Error('We could not confirm your submission. Please try again; retrying the same request will not create a duplicate.')
  }
  const body = (await response.json().catch(() => ({}))) as { success?: boolean; message?: string; errors?: string }
  if (!response.ok) throw new Error(body.errors || 'Something went wrong. Please try again, or call or email us.')
  if (!body.success) throw new Error('We could not confirm your submission. Please try again.')
  return body.message || 'Thank you! Our team will contact you shortly.'
}
