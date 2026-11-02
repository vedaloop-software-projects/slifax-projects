import type { Metadata } from 'next'
import { IndustryPage } from '@/components/sections/industry-page'
import { restaurant } from '@/content/industries'

export const metadata: Metadata = {
  title: 'Restaurant & Cafe POS',
  description: 'Table management, KOT, kitchen display and split billing for restaurants, cafes, bakeries, QSRs and cloud kitchens.',
}

export default function Page() {
  return <IndustryPage industry={restaurant} />
}
