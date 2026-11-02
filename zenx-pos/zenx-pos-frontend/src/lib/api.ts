// ZenxPOS backend, e.g. https://retail-api.zenxpos.com/api. The backend must list this
// website's origin in CORS_ALLOWED_ORIGINS for browser requests to succeed.
export const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? ''

export type BusinessType = { id: number; name: string }

export type EnquiryInput = {
  businessName: string
  contactPersonName: string
  mobile: string
  email: string
  businessTypeId: number | null
  city: string | null
  notes: string | null
}

export async function businessTypes(): Promise<BusinessType[]> {
  if (!apiBaseUrl) return []
  const response = await fetch(`${apiBaseUrl}/registrationBusinessTypes`, { headers: { Accept: 'application/json' } })
  if (!response.ok) return []
  const body = (await response.json()) as { data?: BusinessType[] }
  return Array.isArray(body.data) ? body.data : []
}

/** Sends the enquiry as a registration request; it appears under Registrations in super admin. */
export async function sendEnquiry(input: EnquiryInput): Promise<string> {
  if (!apiBaseUrl) throw new Error('The enquiry form is not connected yet. Please call or email us instead.')
  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}/registerBusiness`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(input),
    })
  } catch {
    throw new Error('We could not reach our server. Please check your connection, or call or email us instead.')
  }
  const body = (await response.json().catch(() => ({}))) as { message?: string; errors?: string }
  if (!response.ok) throw new Error(body.errors || 'Something went wrong. Please try again, or call or email us.')
  return body.message || 'Thank you! Our team will contact you shortly.'
}
