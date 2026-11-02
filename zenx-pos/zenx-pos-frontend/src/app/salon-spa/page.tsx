import type { Metadata } from 'next'
import { IndustryPage } from '@/components/sections/industry-page'
import { salon } from '@/content/industries'

export const metadata: Metadata = {
  title: 'Salon & Spa POS',
  description: 'Appointments, staff commissions, packages and retail sales for salons, spas, beauty parlours and tattoo studios.',
}

export default function Page() {
  return <IndustryPage industry={salon} />
}
