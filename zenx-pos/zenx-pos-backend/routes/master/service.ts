import { z } from 'zod'
import type { Account, AuthStore, PermissionRow } from '../../models/auth/contracts.ts'
import type { CategoryInput, MasterStore, SimpleMasterInput, SubCategoryInput, WriteResult } from '../../models/master/contracts.ts'
import { ApiError } from '../auth/service.ts'

const id = z.number().int().positive().safe()
const status = z.union([z.literal(0), z.literal(1)])
const nullableText = (limit: number) => z.union([z.string().trim().max(limit), z.null()])
const categorySchema = z.object({
  categoryCode: z.string().trim().min(1).max(100), categoryName: z.string().trim().min(1).max(100),
  printerPath: nullableText(255), status,
})
const categoryUpdateSchema = categorySchema.extend({ id })
const listSchema = z.object({ searchStr: nullableText(100), status: status.nullable(), page: id.nullable() })
const byIdSchema = z.object({ id })
const subCategorySchema = z.object({
  categoryId: id, subCategoryCode: z.string().trim().min(1).max(100),
  subCategoryName: z.string().trim().min(1).max(100), status,
})
const subCategoryUpdateSchema = subCategorySchema.extend({ id })
const subListSchema = listSchema.extend({ categoryId: id.nullable() })
const brandSchema = z.object({ brandCode: z.string().trim().min(1).max(100), brandName: z.string().trim().min(1).max(100), status })
const brandUpdateSchema = brandSchema.extend({ id })
const colourSchema = z.object({ colourCode: z.string().trim().min(1).max(100), colourName: z.string().trim().min(1).max(100), status })
const colourUpdateSchema = colourSchema.extend({ id })
const sizeSchema = z.object({ sizeCode: z.string().trim().min(1).max(100), sizeName: z.string().trim().min(1).max(100), status })
const sizeUpdateSchema = sizeSchema.extend({ id })
const unitTypeSchema = z.object({ unitTypeCode: z.string().trim().min(1).max(100), unitTypeName: z.string().trim().min(1).max(100), status })
const unitTypeUpdateSchema = unitTypeSchema.extend({ id })
const teamSchema = z.object({ teamName: z.string().trim().min(1).max(100), teamCode: z.string().trim().min(1).max(100), status })
const teamUpdateSchema = teamSchema.extend({ id })
// Legacy accepted any `required` value here; billing reuses the key for numeric IDs,
// so the shared input normalizer may already have turned numeric names into numbers.
const paymentModeName = z.union([z.string(), z.number().finite().transform(String)]).pipe(z.string().trim().min(1).max(100))
const paymentModeSchema = z.object({ paymentMode: paymentModeName, allowChange: status, status })
const paymentModeUpdateSchema = paymentModeSchema.extend({ id })
const taxSchema = z.object({ taxCode: z.string().trim().min(1).max(100), taxName: z.string().trim().min(1).max(100), taxPercent: z.number().int().min(0).max(100), status })
const taxUpdateSchema = taxSchema.extend({ id })
const salesManSchema = z.object({ teamId: id.nullable(), smCode: z.string().trim().min(1).max(100), smName: z.string().trim().min(1).max(100), commissionPercent: z.number().min(1).max(100).nullable(), status })
const salesManUpdateSchema = salesManSchema.extend({ id })
const salesManListSchema = listSchema.extend({ teamId: id.nullable() })
const floorSchema = z.object({ floorCode: z.string().trim().min(1).max(100), floorName: z.string().trim().min(1).max(100), status })
const floorUpdateSchema = floorSchema.extend({ id })
const tableTypeSchema = z.object({ tableType: z.string().trim().min(1).max(100), status })
const tableTypeUpdateSchema = tableTypeSchema.extend({ id })
const tableSchema = z.object({ floorId: id, tableTypeId: id, tableCode: z.string().trim().min(1).max(50), tableName: z.string().trim().min(1).max(100), capacity: z.number().int().positive(), acNonAc: z.union([z.literal(1), z.literal(2)]), tableUnderMaintenance: status, status })
const tableUpdateSchema = tableSchema.extend({ id })
const tableListSchema = listSchema.extend({ floorId: id.nullable() })
const roleSchema = z.object({ roleTitle: z.string().trim().min(1).max(255), status })
const roleUpdateSchema = roleSchema.extend({ id })

function safeId(value: bigint) {
  const result = Number(value)
  if (!Number.isSafeInteger(result)) throw new Error('Database ID exceeds the legacy JSON number range.')
  return result
}

function normalized(value: string) { return value.toLowerCase().replace(/[^a-z0-9]/g, '') }
function granted(row: PermissionRow, action: 'view' | 'add' | 'edit') { return row[action] === 1 }

export class MasterService {
  private readonly store: MasterStore
  private readonly authStore: AuthStore
  private readonly perPage: number
  constructor(store: MasterStore, authStore: AuthStore, perPage = 25) {
    if (!Number.isInteger(perPage) || perPage < 1 || perPage > 100) throw new Error('MASTER_PAGE_SIZE must be between 1 and 100.')
    this.store = store
    this.authStore = authStore
    this.perPage = perPage
  }

  private async authorize(account: Account, action: 'view' | 'add' | 'edit', resource: 'category' | 'subcategory' | 'brand' | 'colour' | 'size' | 'unittype' | 'team' | 'paymentmode' | 'tax' | 'salesman' | 'floor' | 'tabletype' | 'table' | 'role') {
    const rows = await this.authStore.listPermissions(account.client.id, account.user.roleId)
    const stems = { category: ['categor'], subcategory: ['subcategor', 'categor'], brand: ['brand'], colour: ['colour', 'color'], size: ['size'], unittype: ['unittype', 'unit'], team: ['team'], paymentmode: ['paymentmode', 'payment'], tax: ['tax'], salesman: ['salesman', 'sales'], floor: ['floor'], tabletype: ['tabletype'], table: ['table'], role: ['role', 'accesslevel'] }[resource]
    const allowed = rows.some((row) => {
      if (!granted(row, action)) return false
      const label = normalized(row.subFeature ?? row.feature)
      const featureOnlyMaster = row.subFeature === null && normalized(row.feature).includes('master')
      return featureOnlyMaster || stems.some((stem) => label.includes(stem))
    })
    if (!allowed) throw new ApiError(403, 'You do not have permission to perform this action.')
  }

  async features() {
    return (await this.store.listFeatures()).map((feature) => ({
      featureId: safeId(feature.id), feature: feature.feature,
      subFeatures: feature.subFeatures.map((sub) => ({ subFeatureId: safeId(sub.id), featureId: safeId(sub.featureId), subFeature: sub.subFeature })),
    }))
  }

  private categoryValue(input: z.infer<typeof categorySchema>): CategoryInput {
    return { code: input.categoryCode, name: input.categoryName, printerPath: input.printerPath || null, status: input.status }
  }

  private subCategoryValue(input: z.infer<typeof subCategorySchema>): SubCategoryInput {
    return { categoryId: BigInt(input.categoryId), code: input.subCategoryCode, name: input.subCategoryName, status: input.status }
  }

  private writeError(result: WriteResult, subject: 'Category' | 'Sub category' | 'Brand' | 'Colour' | 'Size' | 'Unit Type' | 'Team' | 'Floor') {
    if (result === 'saved') return
    if (result === 'missing') throw new ApiError(422, `${subject} not found.`)
    if (result === 'parent_missing') throw new ApiError(422, 'Category not found.')
    if (result === 'code_duplicate') throw new ApiError(400, `${subject} code already exists.`)
    throw new ApiError(400, `${subject} name already exists.`)
  }

  async addCategory(account: Account, input: unknown) {
    await this.authorize(account, 'add', 'category')
    const parsed = categorySchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid category details.')
    this.writeError(await this.store.createCategory(account, this.categoryValue(parsed.data)), 'Category')
  }

  async updateCategory(account: Account, input: unknown) {
    await this.authorize(account, 'edit', 'category')
    const parsed = categoryUpdateSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid category details.')
    this.writeError(await this.store.updateCategory(account, BigInt(parsed.data.id), this.categoryValue(parsed.data)), 'Category')
  }

  async category(account: Account, input: unknown) {
    await this.authorize(account, 'view', 'category')
    const parsed = byIdSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid category ID.')
    const row = await this.store.getCategory(account.client.id, BigInt(parsed.data.id))
    if (!row) throw new ApiError(404, 'Category not found.')
    return { id: safeId(row.id), categoryCode: row.code, categoryName: row.name, printerPath: row.printerPath, status: row.status }
  }

  async categories(account: Account, input: unknown) {
    await this.authorize(account, 'view', 'category')
    const parsed = listSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid category filters.')
    const page = parsed.data.page ?? 1
    const result = await this.store.listCategories(account.client.id, {
      page, perPage: this.perPage, ...(parsed.data.searchStr ? { search: parsed.data.searchStr } : {}),
      ...(parsed.data.status === null ? {} : { status: parsed.data.status }),
    })
    return {
      categories: result.rows.map((row) => ({ id: safeId(row.id), categoryCode: row.code, categoryName: row.name, printerPath: row.printerPath, status: row.status })),
      pagination: { currentPage: page, lastPage: Math.max(1, Math.ceil(result.total / this.perPage)), perPage: this.perPage, totalRecords: result.total },
    }
  }

  async addSubCategory(account: Account, input: unknown) {
    await this.authorize(account, 'add', 'subcategory')
    const parsed = subCategorySchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid sub category details.')
    this.writeError(await this.store.createSubCategory(account, this.subCategoryValue(parsed.data)), 'Sub category')
  }

  async updateSubCategory(account: Account, input: unknown) {
    await this.authorize(account, 'edit', 'subcategory')
    const parsed = subCategoryUpdateSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid sub category details.')
    this.writeError(await this.store.updateSubCategory(account, BigInt(parsed.data.id), this.subCategoryValue(parsed.data)), 'Sub category')
  }

  async subCategory(account: Account, input: unknown) {
    await this.authorize(account, 'view', 'subcategory')
    const parsed = byIdSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid sub category ID.')
    const row = await this.store.getSubCategory(account.client.id, BigInt(parsed.data.id))
    if (!row) throw new ApiError(404, 'Sub category not found.')
    return { id: safeId(row.id), subCategoryName: row.name, subCategoryCode: row.code, categoryId: safeId(row.categoryId), categoryName: row.categoryName, categoryCode: row.categoryCode, status: row.status }
  }

  async subCategories(account: Account, input: unknown) {
    await this.authorize(account, 'view', 'subcategory')
    const parsed = subListSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid sub category filters.')
    const page = parsed.data.page ?? 1
    const result = await this.store.listSubCategories(account.client.id, {
      page, perPage: this.perPage, ...(parsed.data.searchStr ? { search: parsed.data.searchStr } : {}),
      ...(parsed.data.status === null ? {} : { status: parsed.data.status }),
      ...(parsed.data.categoryId === null ? {} : { categoryId: BigInt(parsed.data.categoryId) }),
    })
    return {
      subCategories: result.rows.map((row) => ({ id: safeId(row.id), categoryId: safeId(row.categoryId), categoryName: row.categoryName, subCategoryCode: row.code, subCategoryName: row.name, status: row.status })),
      pagination: { currentPage: page, lastPage: Math.max(1, Math.ceil(result.total / this.perPage)), perPage: this.perPage, totalRecords: result.total },
    }
  }

  private simpleValue(code: string, name: string, valueStatus: number): SimpleMasterInput {
    return { code, name, status: valueStatus }
  }

  async addBrand(account: Account, input: unknown) {
    await this.authorize(account, 'add', 'brand')
    const parsed = brandSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid brand details.')
    this.writeError(await this.store.createBrand(account, this.simpleValue(parsed.data.brandCode, parsed.data.brandName, parsed.data.status)), 'Brand')
  }

  async updateBrand(account: Account, input: unknown) {
    await this.authorize(account, 'edit', 'brand')
    const parsed = brandUpdateSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid brand details.')
    this.writeError(await this.store.updateBrand(account, BigInt(parsed.data.id), this.simpleValue(parsed.data.brandCode, parsed.data.brandName, parsed.data.status)), 'Brand')
  }

  async brand(account: Account, input: unknown) {
    await this.authorize(account, 'view', 'brand')
    const parsed = byIdSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid brand ID.')
    const row = await this.store.getBrand(account.client.id, BigInt(parsed.data.id))
    if (!row) throw new ApiError(404, 'Brand details not found.')
    return { id: safeId(row.id), brandCode: row.code, brandName: row.name, status: row.status }
  }

  async brands(account: Account, input: unknown) {
    await this.authorize(account, 'view', 'brand')
    const parsed = listSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid brand filters.')
    const page = parsed.data.page ?? 1
    const result = await this.store.listBrands(account.client.id, {
      page, perPage: this.perPage, ...(parsed.data.searchStr ? { search: parsed.data.searchStr } : {}),
      ...(parsed.data.status === null ? {} : { status: parsed.data.status }),
    })
    return {
      brands: result.rows.map((row) => ({ id: safeId(row.id), brandCode: row.code, brandName: row.name, status: row.status })),
      pagination: { currentPage: page, lastPage: Math.max(1, Math.ceil(result.total / this.perPage)), perPage: this.perPage, totalRecords: result.total },
    }
  }

  async addColour(account: Account, input: unknown) {
    await this.authorize(account, 'add', 'colour')
    const parsed = colourSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid colour details.')
    this.writeError(await this.store.createColour(account, this.simpleValue(parsed.data.colourCode, parsed.data.colourName, parsed.data.status)), 'Colour')
  }

  async updateColour(account: Account, input: unknown) {
    await this.authorize(account, 'edit', 'colour')
    const parsed = colourUpdateSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid colour details.')
    this.writeError(await this.store.updateColour(account, BigInt(parsed.data.id), this.simpleValue(parsed.data.colourCode, parsed.data.colourName, parsed.data.status)), 'Colour')
  }

  async colour(account: Account, input: unknown) {
    await this.authorize(account, 'view', 'colour')
    const parsed = byIdSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid colour ID.')
    const row = await this.store.getColour(account.client.id, BigInt(parsed.data.id))
    if (!row) throw new ApiError(404, 'Colour details not found.')
    return { id: safeId(row.id), colourCode: row.code, colourName: row.name, status: row.status }
  }

  async colours(account: Account, input: unknown) {
    await this.authorize(account, 'view', 'colour')
    const parsed = listSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid colour filters.')
    const page = parsed.data.page ?? 1
    const result = await this.store.listColours(account.client.id, {
      page, perPage: this.perPage, ...(parsed.data.searchStr ? { search: parsed.data.searchStr } : {}),
      ...(parsed.data.status === null ? {} : { status: parsed.data.status }),
    })
    return {
      colours: result.rows.map((row) => ({ id: safeId(row.id), colourCode: row.code, colourName: row.name, status: row.status })),
      pagination: { currentPage: page, lastPage: Math.max(1, Math.ceil(result.total / this.perPage)), perPage: this.perPage, totalRecords: result.total },
    }
  }

  async addSize(account: Account, input: unknown) {
    await this.authorize(account, 'add', 'size')
    const parsed = sizeSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid size details.')
    this.writeError(await this.store.createSize(account, this.simpleValue(parsed.data.sizeCode, parsed.data.sizeName, parsed.data.status)), 'Size')
  }

  async updateSize(account: Account, input: unknown) {
    await this.authorize(account, 'edit', 'size')
    const parsed = sizeUpdateSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid size details.')
    this.writeError(await this.store.updateSize(account, BigInt(parsed.data.id), this.simpleValue(parsed.data.sizeCode, parsed.data.sizeName, parsed.data.status)), 'Size')
  }

  async size(account: Account, input: unknown) {
    await this.authorize(account, 'view', 'size')
    const parsed = byIdSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid size ID.')
    const row = await this.store.getSize(account.client.id, BigInt(parsed.data.id))
    if (!row) throw new ApiError(404, 'Size details not found.')
    return { id: safeId(row.id), sizeCode: row.code, sizeName: row.name, status: row.status }
  }

  async sizes(account: Account, input: unknown) {
    await this.authorize(account, 'view', 'size')
    const parsed = listSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid size filters.')
    const page = parsed.data.page ?? 1
    const result = await this.store.listSizes(account.client.id, {
      page, perPage: this.perPage, ...(parsed.data.searchStr ? { search: parsed.data.searchStr } : {}),
      ...(parsed.data.status === null ? {} : { status: parsed.data.status }),
    })
    return {
      sizes: result.rows.map((row) => ({ id: safeId(row.id), sizeCode: row.code, sizeName: row.name, status: row.status })),
      pagination: { currentPage: page, lastPage: Math.max(1, Math.ceil(result.total / this.perPage)), perPage: this.perPage, totalRecords: result.total },
    }
  }

  async addUnitType(account: Account, input: unknown) {
    await this.authorize(account, 'add', 'unittype')
    const parsed = unitTypeSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid unit type details.')
    this.writeError(await this.store.createUnitType(account, this.simpleValue(parsed.data.unitTypeCode, parsed.data.unitTypeName, parsed.data.status)), 'Unit Type')
  }

  async updateUnitType(account: Account, input: unknown) {
    await this.authorize(account, 'edit', 'unittype')
    const parsed = unitTypeUpdateSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid unit type details.')
    this.writeError(await this.store.updateUnitType(account, BigInt(parsed.data.id), this.simpleValue(parsed.data.unitTypeCode, parsed.data.unitTypeName, parsed.data.status)), 'Unit Type')
  }

  async unitType(account: Account, input: unknown) {
    await this.authorize(account, 'view', 'unittype')
    const parsed = byIdSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid unit type ID.')
    const row = await this.store.getUnitType(account.client.id, BigInt(parsed.data.id))
    if (!row) throw new ApiError(404, 'Unit Type details not found.')
    return { id: safeId(row.id), unitTypeCode: row.code, unitTypeName: row.name, status: row.status }
  }

  async unitTypes(account: Account, input: unknown) {
    await this.authorize(account, 'view', 'unittype')
    const parsed = listSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid unit type filters.')
    const page = parsed.data.page ?? 1
    const result = await this.store.listUnitTypes(account.client.id, {
      page, perPage: this.perPage, ...(parsed.data.searchStr ? { search: parsed.data.searchStr } : {}),
      ...(parsed.data.status === null ? {} : { status: parsed.data.status }),
    })
    return {
      unitTypes: result.rows.map((row) => ({ id: safeId(row.id), unitTypeCode: row.code, unitTypeName: row.name, status: row.status })),
      pagination: { currentPage: page, lastPage: Math.max(1, Math.ceil(result.total / this.perPage)), perPage: this.perPage, totalRecords: result.total },
    }
  }

  async addTeam(account: Account, input: unknown) {
    await this.authorize(account, 'add', 'team')
    const parsed = teamSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid team details.')
    this.writeError(await this.store.createTeam(account, this.simpleValue(parsed.data.teamCode, parsed.data.teamName, parsed.data.status)), 'Team')
  }

  async updateTeam(account: Account, input: unknown) {
    await this.authorize(account, 'edit', 'team')
    const parsed = teamUpdateSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid team details.')
    this.writeError(await this.store.updateTeam(account, BigInt(parsed.data.id), this.simpleValue(parsed.data.teamCode, parsed.data.teamName, parsed.data.status)), 'Team')
  }

  async team(account: Account, input: unknown) {
    await this.authorize(account, 'view', 'team')
    const parsed = byIdSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid team ID.')
    const row = await this.store.getTeam(account.client.id, BigInt(parsed.data.id))
    if (!row) throw new ApiError(404, 'Team details not found.')
    return { id: safeId(row.id), teamName: row.name, teamCode: row.code, status: row.status }
  }

  async teams(account: Account, input: unknown) {
    await this.authorize(account, 'view', 'team')
    const parsed = listSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid team filters.')
    const page = parsed.data.page ?? 1
    const result = await this.store.listTeams(account.client.id, { page, perPage: this.perPage, ...(parsed.data.searchStr ? { search: parsed.data.searchStr } : {}), ...(parsed.data.status === null ? {} : { status: parsed.data.status }) })
    return { teams: result.rows.map((row) => ({ id: safeId(row.id), teamName: row.name, teamCode: row.code, status: row.status })), pagination: { currentPage: page, lastPage: Math.max(1, Math.ceil(result.total / this.perPage)), perPage: this.perPage, totalRecords: result.total } }
  }

  private paymentError(result: WriteResult) {
    if (result === 'saved') return
    if (result === 'missing') throw new ApiError(422, 'Payment mode not found.')
    throw new ApiError(400, 'Payment mode already exists.')
  }

  async addPaymentMode(account: Account, input: unknown) {
    await this.authorize(account, 'add', 'paymentmode')
    const parsed = paymentModeSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid payment mode details.')
    this.paymentError(await this.store.createPaymentMode(account, { name: parsed.data.paymentMode, allowChange: parsed.data.allowChange, status: parsed.data.status }))
  }

  async updatePaymentMode(account: Account, input: unknown) {
    await this.authorize(account, 'edit', 'paymentmode')
    const parsed = paymentModeUpdateSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid payment mode details.')
    this.paymentError(await this.store.updatePaymentMode(account, BigInt(parsed.data.id), { name: parsed.data.paymentMode, allowChange: parsed.data.allowChange, status: parsed.data.status }))
  }

  async paymentMode(account: Account, input: unknown) {
    await this.authorize(account, 'view', 'paymentmode')
    const parsed = byIdSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid payment mode ID.')
    const row = await this.store.getPaymentMode(account.client.id, BigInt(parsed.data.id))
    if (!row) throw new ApiError(404, 'Payment Mode details not found.')
    return { id: safeId(row.id), paymentMode: row.name, allowChange: row.allowChange, status: row.status }
  }

  async paymentModes(account: Account, input: unknown) {
    await this.authorize(account, 'view', 'paymentmode')
    const parsed = listSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid payment mode filters.')
    const page = parsed.data.page ?? 1
    const result = await this.store.listPaymentModes(account.client.id, { page, perPage: this.perPage, ...(parsed.data.searchStr ? { search: parsed.data.searchStr } : {}), ...(parsed.data.status === null ? {} : { status: parsed.data.status }) })
    return { paymentModes: result.rows.map((row) => ({ id: safeId(row.id), paymentMode: row.name, allowChange: row.allowChange, status: row.status })), pagination: { currentPage: page, lastPage: Math.max(1, Math.ceil(result.total / this.perPage)), perPage: this.perPage, totalRecords: result.total } }
  }

  private taxError(result: WriteResult) {
    if (result === 'saved') return
    if (result === 'missing') throw new ApiError(422, 'Tax not found.')
    if (result === 'code_duplicate') throw new ApiError(400, 'Tax code already exists.')
    if (result === 'name_duplicate') throw new ApiError(400, 'Tax name already exists.')
    throw new ApiError(400, 'Tax Percent already exists.')
  }

  async addTax(account: Account, input: unknown) {
    await this.authorize(account, 'add', 'tax'); const parsed = taxSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid tax details.')
    this.taxError(await this.store.createTax(account, { code: parsed.data.taxCode, name: parsed.data.taxName, percent: parsed.data.taxPercent, status: parsed.data.status }))
  }

  async updateTax(account: Account, input: unknown) {
    await this.authorize(account, 'edit', 'tax'); const parsed = taxUpdateSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid tax details.')
    this.taxError(await this.store.updateTax(account, BigInt(parsed.data.id), { code: parsed.data.taxCode, name: parsed.data.taxName, percent: parsed.data.taxPercent, status: parsed.data.status }))
  }

  async tax(account: Account, input: unknown) {
    await this.authorize(account, 'view', 'tax'); const parsed = byIdSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid tax ID.')
    const row = await this.store.getTax(account.client.id, BigInt(parsed.data.id)); if (!row) throw new ApiError(404, 'Tax details not found.')
    return { id: safeId(row.id), taxCode: row.code, taxName: row.name, taxPercent: row.percent, status: row.status }
  }

  async taxes(account: Account, input: unknown) {
    await this.authorize(account, 'view', 'tax'); const parsed = listSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid tax filters.')
    const page = parsed.data.page ?? 1; const result = await this.store.listTaxes(account.client.id, { page, perPage: this.perPage, ...(parsed.data.searchStr ? { search: parsed.data.searchStr } : {}), ...(parsed.data.status === null ? {} : { status: parsed.data.status }) })
    return { taxes: result.rows.map((row) => ({ id: safeId(row.id), taxCode: row.code, taxName: row.name, taxPercent: row.percent, status: row.status })), pagination: { currentPage: page, lastPage: Math.max(1, Math.ceil(result.total / this.perPage)), perPage: this.perPage, totalRecords: result.total } }
  }

  private salesManError(result: WriteResult) {
    if (result === 'saved') return
    if (result === 'missing') throw new ApiError(422, 'Sales man not found.')
    if (result === 'parent_missing') throw new ApiError(422, 'Team not found.')
    throw new ApiError(400, 'Sales man code already exists.')
  }

  async addSalesMan(account: Account, input: unknown) {
    await this.authorize(account, 'add', 'salesman'); const parsed = salesManSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid sales man details.')
    this.salesManError(await this.store.createSalesMan(account, { teamId: parsed.data.teamId === null ? null : BigInt(parsed.data.teamId), code: parsed.data.smCode, name: parsed.data.smName, commissionPercent: parsed.data.commissionPercent?.toString() ?? null, status: parsed.data.status }))
  }

  async updateSalesMan(account: Account, input: unknown) {
    await this.authorize(account, 'edit', 'salesman'); const parsed = salesManUpdateSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid sales man details.')
    this.salesManError(await this.store.updateSalesMan(account, BigInt(parsed.data.id), { teamId: parsed.data.teamId === null ? null : BigInt(parsed.data.teamId), code: parsed.data.smCode, name: parsed.data.smName, commissionPercent: parsed.data.commissionPercent?.toString() ?? null, status: parsed.data.status }))
  }

  async salesMan(account: Account, input: unknown) {
    await this.authorize(account, 'view', 'salesman'); const parsed = byIdSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid sales man ID.')
    const row = await this.store.getSalesMan(account.client.id, BigInt(parsed.data.id)); if (!row) throw new ApiError(404, 'Sales man details not found.')
    return { id: safeId(row.id), smCode: row.code, smName: row.name, commissionPercent: row.commissionPercent, teamId: row.teamId === null ? null : safeId(row.teamId), teamName: row.teamName, status: row.status }
  }

  async salesMans(account: Account, input: unknown) {
    await this.authorize(account, 'view', 'salesman'); const parsed = salesManListSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid sales man filters.')
    const page = parsed.data.page ?? 1; const result = await this.store.listSalesMans(account.client.id, { page, perPage: this.perPage, ...(parsed.data.searchStr ? { search: parsed.data.searchStr } : {}), ...(parsed.data.status === null ? {} : { status: parsed.data.status }), ...(parsed.data.teamId === null ? {} : { teamId: BigInt(parsed.data.teamId) }) })
    return { salesMans: result.rows.map((row) => ({ id: safeId(row.id), smCode: row.code, smName: row.name, commissionPercent: row.commissionPercent, teamId: row.teamId === null ? null : safeId(row.teamId), teamName: row.teamName, status: row.status })), pagination: { currentPage: page, lastPage: Math.max(1, Math.ceil(result.total / this.perPage)), perPage: this.perPage, totalRecords: result.total } }
  }

  async addFloor(account: Account, input: unknown) { await this.authorize(account, 'add', 'floor'); const p = floorSchema.safeParse(input); if (!p.success) throw new ApiError(422, 'Invalid floor details.'); this.writeError(await this.store.createFloor(account, this.simpleValue(p.data.floorCode, p.data.floorName, p.data.status)), 'Floor') }
  async updateFloor(account: Account, input: unknown) { await this.authorize(account, 'edit', 'floor'); const p = floorUpdateSchema.safeParse(input); if (!p.success) throw new ApiError(422, 'Invalid floor details.'); this.writeError(await this.store.updateFloor(account, BigInt(p.data.id), this.simpleValue(p.data.floorCode, p.data.floorName, p.data.status)), 'Floor') }
  async floor(account: Account, input: unknown) { await this.authorize(account, 'view', 'floor'); const p = byIdSchema.safeParse(input); if (!p.success) throw new ApiError(422, 'Invalid floor ID.'); const row = await this.store.getFloor(account.client.id, BigInt(p.data.id)); if (!row) throw new ApiError(404, 'Floor details not found.'); return { id: safeId(row.id), floorCode: row.code, floorName: row.name, status: row.status } }
  async floors(account: Account, input: unknown) { await this.authorize(account, 'view', 'floor'); const p = listSchema.safeParse(input); if (!p.success) throw new ApiError(422, 'Invalid floor filters.'); const page = p.data.page ?? 1, result = await this.store.listFloors(account.client.id, { page, perPage: this.perPage, ...(p.data.searchStr ? { search: p.data.searchStr } : {}), ...(p.data.status === null ? {} : { status: p.data.status }) }); return { floors: result.rows.map((row) => ({ id: safeId(row.id), floorCode: row.code, floorName: row.name, status: row.status })), pagination: { currentPage: page, lastPage: Math.max(1, Math.ceil(result.total / this.perPage)), perPage: this.perPage, totalRecords: result.total } } }

  private tableTypeError(result: WriteResult) { if (result === 'saved') return; if (result === 'missing') throw new ApiError(422, 'Table Type not found.'); throw new ApiError(400, 'Table Type already exists.') }
  async addTableType(account: Account, input: unknown) { await this.authorize(account, 'add', 'tabletype'); const p = tableTypeSchema.safeParse(input); if (!p.success) throw new ApiError(422, 'Invalid table type details.'); this.tableTypeError(await this.store.createTableType(account, { name: p.data.tableType, status: p.data.status })) }
  async updateTableType(account: Account, input: unknown) { await this.authorize(account, 'edit', 'tabletype'); const p = tableTypeUpdateSchema.safeParse(input); if (!p.success) throw new ApiError(422, 'Invalid table type details.'); this.tableTypeError(await this.store.updateTableType(account, BigInt(p.data.id), { name: p.data.tableType, status: p.data.status })) }
  async tableType(account: Account, input: unknown) { await this.authorize(account, 'view', 'tabletype'); const p = byIdSchema.safeParse(input); if (!p.success) throw new ApiError(422, 'Invalid table type ID.'); const row = await this.store.getTableType(account.client.id, BigInt(p.data.id)); if (!row) throw new ApiError(404, 'Table Type details not found.'); return { id: safeId(row.id), tableType: row.name, status: row.status } }
  async tableTypes(account: Account, input: unknown) { await this.authorize(account, 'view', 'tabletype'); const p = listSchema.safeParse(input); if (!p.success) throw new ApiError(422, 'Invalid table type filters.'); const page = p.data.page ?? 1, result = await this.store.listTableTypes(account.client.id, { page, perPage: this.perPage, ...(p.data.searchStr ? { search: p.data.searchStr } : {}), ...(p.data.status === null ? {} : { status: p.data.status }) }); return { tableTypes: result.rows.map((row) => ({ id: safeId(row.id), tableType: row.name, status: row.status })), pagination: { currentPage: page, lastPage: Math.max(1, Math.ceil(result.total / this.perPage)), perPage: this.perPage, totalRecords: result.total } } }

  private tableValue(value: z.infer<typeof tableSchema>) { return { floorId: BigInt(value.floorId), tableTypeId: BigInt(value.tableTypeId), code: value.tableCode, name: value.tableName, capacity: value.capacity, acNonAc: value.acNonAc, underMaintenance: value.tableUnderMaintenance, status: value.status } }
  private tableError(result: WriteResult) { if (result === 'saved') return; if (result === 'missing') throw new ApiError(422, 'Table not found.'); if (result === 'floor_missing') throw new ApiError(400, 'Invalid floor selected.'); if (result === 'table_type_missing') throw new ApiError(400, 'Invalid table type selected.'); if (result === 'code_duplicate') throw new ApiError(400, 'Table code already exists.'); throw new ApiError(400, 'Table name already exists.') }
  async addTable(account: Account, input: unknown) { await this.authorize(account, 'add', 'table'); const p = tableSchema.safeParse(input); if (!p.success) throw new ApiError(422, 'Invalid table details.'); this.tableError(await this.store.createTable(account, this.tableValue(p.data))) }
  async updateTable(account: Account, input: unknown) { await this.authorize(account, 'edit', 'table'); const p = tableUpdateSchema.safeParse(input); if (!p.success) throw new ApiError(422, 'Invalid table details.'); this.tableError(await this.store.updateTable(account, BigInt(p.data.id), this.tableValue(p.data))) }
  private tableResponse(row: Awaited<ReturnType<MasterStore['getTable']>> & {}) { if (!row) throw new Error('Missing table row'); return { id: safeId(row.id), floorId: safeId(row.floorId), floorName: row.floorName, tableTypeId: safeId(row.tableTypeId), tableType: row.tableType, tableCode: row.code, tableName: row.name, capacity: row.capacity, acNonAc: row.acNonAc, tableUnderMaintenance: row.underMaintenance, status: row.status } }
  async table(account: Account, input: unknown) { await this.authorize(account, 'view', 'table'); const p = byIdSchema.safeParse(input); if (!p.success) throw new ApiError(422, 'Invalid table ID.'); const row = await this.store.getTable(account.client.id, BigInt(p.data.id)); if (!row) throw new ApiError(404, 'Table not found.'); return this.tableResponse(row) }
  async tables(account: Account, input: unknown) { await this.authorize(account, 'view', 'table'); const p = tableListSchema.safeParse(input); if (!p.success) throw new ApiError(422, 'Invalid table filters.'); const page = p.data.page ?? 1, result = await this.store.listTables(account.client.id, { page, perPage: this.perPage, ...(p.data.searchStr ? { search: p.data.searchStr } : {}), ...(p.data.status === null ? {} : { status: p.data.status }), ...(p.data.floorId === null ? {} : { floorId: BigInt(p.data.floorId) }) }); return { tables: result.rows.map((row) => this.tableResponse(row)), pagination: { currentPage: page, lastPage: Math.max(1, Math.ceil(result.total / this.perPage)), perPage: this.perPage, totalRecords: result.total } } }

  private roleError(result: WriteResult) { if (result === 'saved') return; if (result === 'missing') throw new ApiError(422, 'Role not found.'); throw new ApiError(400, 'Role already exists.') }
  async addRole(account: Account, input: unknown) { await this.authorize(account, 'add', 'role'); const p = roleSchema.safeParse(input); if (!p.success) throw new ApiError(422, 'Invalid role details.'); this.roleError(await this.store.createRole(account, { name: p.data.roleTitle, status: p.data.status })) }
  async updateRole(account: Account, input: unknown) { await this.authorize(account, 'edit', 'role'); const p = roleUpdateSchema.safeParse(input); if (!p.success) throw new ApiError(422, 'Invalid role details.'); this.roleError(await this.store.updateRole(account, BigInt(p.data.id), { name: p.data.roleTitle, status: p.data.status })) }
  async role(account: Account, input: unknown) { await this.authorize(account, 'view', 'role'); const p = byIdSchema.safeParse(input); if (!p.success) throw new ApiError(422, 'Invalid role ID.'); const row = await this.store.getRole(account.client.id, BigInt(p.data.id)); if (!row) throw new ApiError(404, 'Role details not found.'); return { id: safeId(row.id), roleTitle: row.name, status: row.status } }
  async roles(account: Account, input: unknown) { await this.authorize(account, 'view', 'role'); const p = listSchema.safeParse(input); if (!p.success) throw new ApiError(422, 'Invalid role filters.'); const page = p.data.page ?? 1, result = await this.store.listRoles(account.client.id, { page, perPage: this.perPage, ...(p.data.searchStr ? { search: p.data.searchStr } : {}), ...(p.data.status === null ? {} : { status: p.data.status }) }); return { roles: result.rows.map((row) => ({ id: safeId(row.id), roleTitle: row.name, status: row.status })), pagination: { currentPage: page, lastPage: Math.max(1, Math.ceil(result.total / this.perPage)), perPage: this.perPage, totalRecords: result.total } } }
}
