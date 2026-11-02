import type { Metadata } from 'next'
import { IndustryPage } from '@/components/sections/industry-page'
import { retail } from '@/content/industries'

export const metadata: Metadata = {
  title: 'Retail POS Services',
  description: 'Billing, inventory and promotions for supermarkets, departmental stores, electronics, pet shops and other retail businesses.',
}

export default function Page() {
  return <IndustryPage industry={retail} />
}
