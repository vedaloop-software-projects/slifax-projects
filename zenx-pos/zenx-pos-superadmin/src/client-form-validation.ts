export type ClientFieldErrors = Record<string, string>

export const clientFieldLabels: Record<string, string> = {
  business_name: 'Business name', business_type_id: 'Business type', contact_person_name: 'Contact person',
  email: 'Email', mobile: 'Mobile', alternate_mobile: 'Alternate mobile', state_id: 'State', city: 'City',
  pincode: 'Pincode', max_users: 'Users allowed', website_url: 'Website', address: 'Address', logo: 'Business logo',
  gst_number: 'GST number', gst_code: 'GST state code', pan_number: 'PAN', fssai_number: 'FSSAI number', license_number: 'Trade licence',
  amount: 'Installation amount', discount_type: 'Installation discount type', discount_value: 'Installation discount value', gst: 'Installation GST %',
  start_date: 'Start date', end_date: 'End date', subscription_duration: 'Subscription duration',
  subscription_amount: 'Subscription amount', subscription_discount_type: 'Subscription discount type', subscription_discount_value: 'Subscription discount value', subscription_gst: 'Subscription GST %',
  status: 'Status', password: 'Admin password', features: 'Feature access', sub_features: 'Feature access',
}
for (const prefix of ['installation', 'subscription']) {
  for (const [field, label] of Object.entries({ paid_amount: 'paid amount', payment_mode: 'payment mode', reference_number: 'reference', payment_date: 'payment date' })) {
    clientFieldLabels[`${prefix}_${field}`] = `${prefix === 'installation' ? 'Installation' : 'Subscription'} ${label}`
  }
}

export const clientPasswordHelp = 'Use 10-128 characters with uppercase, lowercase, a number and a special character.'

export function validateClientForm(values: Record<string, unknown>, creating: boolean, nativeErrors: ClientFieldErrors = {}): ClientFieldErrors {
  const errors = { ...nativeErrors }
  const password = String(values.password ?? '')
  if (creating && !password) errors.password = 'Enter an admin password. ' + clientPasswordHelp
  else if (password && (password.length < 10 || password.length > 128 || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/.test(password))) errors.password = clientPasswordHelp
  const mobile = String(values.mobile ?? '').trim(), alternate = String(values.alternate_mobile ?? '').trim()
  if (alternate && alternate === mobile) errors.alternate_mobile = 'Use a different number, or leave Alternate mobile blank.'
  const from = String(values.start_date ?? ''), to = String(values.end_date ?? '')
  if (from && to && to <= from) errors.end_date = 'End date must be after Start date.'
  return errors
}

export function clientNativeError(name: string, validity: Pick<ValidityState, 'valueMissing' | 'patternMismatch' | 'typeMismatch'>, fallback: string): string {
  if (name === 'password') return clientPasswordHelp
  const label = clientFieldLabels[name] ?? name.replaceAll('_', ' ')
  if (validity.valueMissing) return `Enter or select ${label.toLowerCase()}.`
  if (name === 'mobile' || name === 'alternate_mobile') return 'Enter a 10-digit Indian mobile number starting with 6, 7, 8 or 9.'
  if (name === 'pincode') return 'Enter a six-digit pincode, or leave this optional field blank.'
  if (name === 'max_users') return 'Enter the number of users allowed (1 or more), or leave it blank for unlimited.'
  if (name === 'email' && validity.typeMismatch) return 'Enter a valid email address.'
  if (name === 'website_url' && validity.typeMismatch) return 'Enter a complete URL such as https://example.com, or leave it blank.'
  return fallback || `Check ${label.toLowerCase()}.`
}

// Payment rows sent to the API omit unpaid entries; map their indexes back to the visible inputs.
export function mapClientFieldErrors(errors: ClientFieldErrors, paymentPrefixes: string[]): ClientFieldErrors {
  return Object.fromEntries(Object.entries(errors).map(([key, message]) => {
    const match = /^initial_payments\.(\d+)\.(paid_amount|payment_mode|reference_number|payment_date)$/.exec(key)
    return [match && paymentPrefixes[Number(match[1])] ? `${paymentPrefixes[Number(match[1])]}_${match[2]}` : key, message]
  }))
}
