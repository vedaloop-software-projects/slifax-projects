import type { PrismaClient } from '@prisma/client'
import type { ProductSearchStore } from './contracts.ts'
import { lookupCandidates } from '../product/codes.ts'

export class PrismaProductSearchStore implements ProductSearchStore {
  private readonly prisma: PrismaClient
  constructor(prisma: PrismaClient) { this.prisma = prisma }

  async search(clientId: bigint, rawTerm: string, limit: number) {
    const term = rawTerm.trim()
    const exactTerms = lookupCandidates(term)
    const activeVariant = { client_id: clientId, status: 1, trash: 0 }
    const [exactVariants, exactProduct] = await Promise.all([
      this.prisma.productVariants.findMany({
        where: { ...activeVariant, OR: exactTerms.flatMap(value => [{ variant_code: value }, { ean_code: value }]) },
        orderBy: { id: 'asc' },
        take: limit + 1,
      }),
      this.prisma.products.findFirst({
        where: { client_id: clientId, product_code: { in: exactTerms }, status: 1, trash: 0 },
        select: { id: true },
      }),
    ])

    let variants = exactVariants
    let truncated = exactVariants.length > limit
    if (exactProduct) {
      variants = await this.prisma.productVariants.findMany({ where: { ...activeVariant, product_id: exactProduct.id }, orderBy: [{ priority: 'asc' }, { id: 'asc' }], take: limit + 1 })
      truncated ||= variants.length > limit
    } else if (!exactVariants.length) {
      const variantMatches = await this.prisma.productVariants.findMany({
        where: { ...activeVariant, OR: [{ variant_code: { contains: term } }, { ean_code: { contains: term } }, { pack_size: { contains: term } }] },
        select: { product_id: true },
        take: limit + 1,
      })
      const matchingProductIds = [...new Set(variantMatches.map(row => row.product_id))]
      const products = await this.prisma.products.findMany({
        where: { client_id: clientId, status: 1, trash: 0, OR: [{ product_code: { contains: term } }, { product_short_name: { contains: term } }, { product_full_name: { contains: term } }, ...(matchingProductIds.length ? [{ id: { in: matchingProductIds } }] : [])] },
        select: { id: true }, orderBy: { id: 'desc' }, take: limit + 1,
      })
      truncated ||= products.length > limit || variantMatches.length > limit
      variants = await this.prisma.productVariants.findMany({ where: { ...activeVariant, product_id: { in: products.slice(0, limit).map(row => row.id) } }, orderBy: [{ product_id: 'asc' }, { priority: 'asc' }, { id: 'asc' }], take: limit + 1 })
      truncated ||= variants.length > limit
    }

    variants = variants.slice(0, limit)
    const productIds = [...new Set(variants.map(row => row.product_id))]
    const products = await this.prisma.products.findMany({ where: { client_id: clientId, id: { in: productIds }, status: 1, trash: 0 } })
    const [categories, subCategories, brands, units, taxes, sizes, colours, controls] = await Promise.all([
      this.prisma.categories.findMany({ where: { client_id: clientId, id: { in: [...new Set(products.map(row => row.category_id))] }, trash: 0 } }),
      this.prisma.subCategories.findMany({ where: { client_id: clientId, id: { in: products.flatMap(row => row.sub_category_id ? [row.sub_category_id] : []) }, trash: 0 } }),
      this.prisma.brands.findMany({ where: { client_id: clientId, id: { in: products.flatMap(row => row.brand_id ? [row.brand_id] : []) }, trash: 0 } }),
      this.prisma.unitTypes.findMany({ where: { client_id: clientId, id: { in: products.flatMap(row => row.unit_type_id ? [row.unit_type_id] : []) }, trash: 0 } }),
      this.prisma.taxes.findMany({ where: { client_id: clientId, id: { in: [...new Set(products.map(row => row.tax_id))] }, trash: 0 } }),
      this.prisma.sizes.findMany({ where: { client_id: clientId, id: { in: variants.flatMap(row => row.size_id ? [row.size_id] : []) }, trash: 0 } }),
      this.prisma.colours.findMany({ where: { client_id: clientId, id: { in: variants.flatMap(row => row.colour_id ? [row.colour_id] : []) }, trash: 0 } }),
      this.prisma.productControls.findMany({ where: { client_id: clientId, product_id: { in: productIds } } }),
    ])
    const map = <T extends { id: bigint }>(rows: T[]) => new Map(rows.map(row => [row.id, row]))
    const productMap = map(products), categoryMap = map(categories), subCategoryMap = map(subCategories), brandMap = map(brands), unitMap = map(units), taxMap = map(taxes), sizeMap = map(sizes), colourMap = map(colours), controlMap = new Map(controls.map(row => [row.product_id, row]))
    const rows = variants.flatMap(variant => {
      const product = productMap.get(variant.product_id), control = product ? controlMap.get(product.id) : undefined
      if (!product || !control) return []
      return [{ productId: product.id, productCode: product.product_code, productShortName: product.product_short_name, productFullName: product.product_full_name, variantCode: variant.variant_code, eanCode: variant.ean_code, categoryId: product.category_id, categoryName: categoryMap.get(product.category_id)?.category_name ?? null, subCategoryId: product.sub_category_id, subCategoryName: product.sub_category_id ? subCategoryMap.get(product.sub_category_id)?.sub_category_name ?? null : null, brandId: product.brand_id, brandName: product.brand_id ? brandMap.get(product.brand_id)?.brand_name ?? null : null, unitTypeId: product.unit_type_id, unitTypeName: product.unit_type_id ? unitMap.get(product.unit_type_id)?.unit_type_name ?? null : null, qoh: product.qoh, hsnCode: product.hsn_code, taxId: product.tax_id, taxName: taxMap.get(product.tax_id)?.tax_name ?? null, taxPercent: taxMap.get(product.tax_id)?.tax_percent ?? null, productImage: product.product_image, productStatus: product.status, variantId: variant.id, packSize: variant.pack_size, sizeId: variant.size_id, sizeName: variant.size_id ? sizeMap.get(variant.size_id)?.size_name ?? null : null, colourId: variant.colour_id, colourName: variant.colour_id ? colourMap.get(variant.colour_id)?.colour_name ?? null : null, basicCost: variant.basic_cost, costPrice: variant.cost_price, mrp: variant.mrp, salePrice: variant.sale_price, wholeSalePrice: variant.whole_sale_price, dineInPrice: variant.dine_in_price, takeAwayPrice: variant.take_away_price, salonDuration: variant.salon_duration, variantQty: variant.variant_qty, priority: variant.priority, variantStatus: variant.status, allowWeighingScale: control.allow_weighing_scale, allowDecimals: control.allow_decimals, allowDiscount: control.allow_discount, allowPriceOverride: control.allow_price_override, kotRequired: control.kot_required, kit: control.kit }]
    })
    return { rows, truncated }
  }
}
