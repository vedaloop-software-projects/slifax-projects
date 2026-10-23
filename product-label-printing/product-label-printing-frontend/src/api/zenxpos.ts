import type { Product, Role, User } from '../types'

export const PRODUCT_FILTERS = {
  searchStr: null, categoryId: null, subCategoryId: null, brandId: null,
  sizeId: null, colourId: null, taxId: null, status: null,
} as const

export const MASTER_FILTERS = { searchStr: null, status: 1 } as const

type BackendPermission = {
  subFeatures?: { add?: number; edit?: number }[]
}

type BackendLoginUser = {
  id: string | number
  token?: string | null
  name?: string | null
  email?: string | null
  mobile?: string | null
  roleTitle?: string | null
  clientId?: string | number | null
  businessName?: string | null
  address?: string | null
  city?: string | null
  logo?: string | null
  permissions?: BackendPermission[]
}

export type BackendProductRow = {
  id?: string | number
  productId?: string | number
  variantId?: string | number | null
  productCode?: string | null
  variantCode?: string | null
  eanCode?: string | null
  productShortName?: string | null
  productFullName?: string | null
  hsnCode?: string | null
  categoryName?: string | null
  brandName?: string | null
  mrp?: string | number | null
  salePrice?: string | number | null
  taxPercent?: string | number | null
  packSize?: string | null
  unitTypeName?: string | null
  status?: string | number | null
  createdAt?: string | null
  updatedAt?: string | null
  categoryId?: string | number | null
  subCategoryId?: string | number | null
  brandId?: string | number | null
  unitTypeId?: string | number | null
  taxId?: string | number | null
}

type BackendProductDetail = {
  productDetails?: BackendProductRow
  variants?: Array<{
    id?: string | number | null
    variantCode?: string | null
    eanCode?: string | null
    packSize?: string | null
    mrp?: string | number | null
    salePrice?: string | number | null
  }>
}

export function roleFromBackend(user: { roleTitle?: unknown; permissions?: BackendPermission[] }): Role {
  const title = String(user.roleTitle ?? '')
  const mayManage = (user.permissions ?? []).some((feature) =>
    (feature.subFeatures ?? []).some((item) => item.add === 1 || item.edit === 1),
  )
  return mayManage || /\b(admin|manager|owner)\b/i.test(title) ? 'ADMIN' : 'USER'
}

export function mapLoginUser(raw: BackendLoginUser): { token: string; user: User } {
  const token = String(raw?.token ?? '')
  if (!token) throw new Error('The server did not return a login token.')
  return {
    token,
    user: {
      id: String(raw.id), name: raw.name || raw.businessName || 'User', email: raw.email ?? '',
      mobile: raw.mobile ?? undefined, role: roleFromBackend(raw), roleTitle: raw.roleTitle ?? null,
      clientId: raw.clientId == null ? null : String(raw.clientId), businessName: raw.businessName ?? null,
      businessAddress: raw.address ?? null, city: raw.city ?? null, logo: raw.logo ?? null,
      active: true, password: '',
    },
  }
}

function numberOrNull(value: unknown) {
  return value === null || value === undefined || value === '' ? null : Number(value)
}

export function mapProductListRow(raw: BackendProductRow): Product {
  const productId = String(raw.productId ?? raw.id)
  return {
    id: `product_${productId}_variant_${raw.variantId ?? 'default'}`, globalId: `product_${productId}_variant_${raw.variantId ?? 'default'}`, backendProductId: Number(productId),
    variantId: numberOrNull(raw.variantId), productCode: raw.productCode ?? '', variantCode: raw.variantCode ?? raw.productCode ?? '', eanCode: raw.eanCode ?? null,
    pluCode: null, name: raw.productShortName || raw.productFullName || '',
    fullName: raw.productFullName || raw.productShortName || '', hsnCode: raw.hsnCode ?? '',
    category: raw.categoryName ?? '', brand: raw.brandName ?? '', mrp: Number(raw.mrp) || 0,
    salePrice: Number(raw.salePrice) || 0, taxPercent: Number(raw.taxPercent) || 0,
    unit: raw.packSize || raw.unitTypeName || '', packedDate: '', expiryRule: 'NONE',
    shelfLifeMonths: null, expiryDate: null, shopId: '',
    status: Number(raw.status) === 1 ? 'ACTIVE' : 'INACTIVE', createdAt: raw.createdAt ?? '',
    updatedAt: raw.updatedAt ?? '', categoryId: numberOrNull(raw.categoryId),
    subCategoryId: numberOrNull(raw.subCategoryId), brandId: numberOrNull(raw.brandId),
    unitTypeId: numberOrNull(raw.unitTypeId), taxId: numberOrNull(raw.taxId),
  }
}

export function mapProductDetail(raw: BackendProductDetail, preferredVariantId?: number | null): Product {
  const details = raw.productDetails ?? {}
  const variants = Array.isArray(raw.variants) ? raw.variants : []
  const variant = variants.find((item) => Number(item.id) === preferredVariantId) ?? variants[0] ?? {}
  return mapProductListRow({ ...details, productId: details.id, variantId: variant.id,
    variantCode: variant.variantCode, eanCode: variant.eanCode, packSize: variant.packSize, mrp: variant.mrp, salePrice: variant.salePrice })
}
