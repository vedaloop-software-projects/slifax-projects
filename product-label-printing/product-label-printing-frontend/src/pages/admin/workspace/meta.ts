import type { ClientMasters, MasterType } from '../../../api'

/** zenx-pos names: Master::addCategory uses categoryCode / categoryName, and so on. */
export const MASTER_META: Record<MasterType, { label: string; key: string; list: keyof ClientMasters }> = {
  category: { label: 'Category', key: 'category', list: 'categories' },
  subCategory: { label: 'Sub category', key: 'subCategory', list: 'subCategories' },
  brand: { label: 'Brand', key: 'brand', list: 'brands' },
  unitType: { label: 'Unit', key: 'unitType', list: 'unitTypes' },
  tax: { label: 'Tax / GST', key: 'tax', list: 'taxes' },
  size: { label: 'Size', key: 'size', list: 'sizes' },
  colour: { label: 'Colour', key: 'colour', list: 'colours' },
}
