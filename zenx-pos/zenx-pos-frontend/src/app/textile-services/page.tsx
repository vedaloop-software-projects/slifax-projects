import type { Metadata } from 'next'
import { IndustryPage } from '@/components/sections/industry-page'
import { textile } from '@/content/industries'

export const metadata: Metadata = {
  title: 'Textile POS Services',
  description: 'Size and colour matrices, barcode labels and fast billing for clothing stores, boutiques, lifestyle and footwear stores.',
}

export default function Page() {
  return <IndustryPage industry={textile} />
}
