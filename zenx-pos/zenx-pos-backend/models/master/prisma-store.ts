import type { PrismaClient } from '@prisma/client'
import type { Account } from '../auth/contracts.ts'
import type { CategoryInput, ListFilters, MasterStore, NamedMasterInput, PaymentModeInput, SalesManFilters, SalesManInput, SimpleMasterInput, SubCategoryFilters, SubCategoryInput, TableFilters, TableInput, TaxInput } from './contracts.ts'

function audit(account: Account, type: string, description: string, now: Date) {
  return { client_id: account.client.id, user_id: account.user.id, type, description, created_at: now, updated_at: now }
}

export class PrismaMasterStore implements MasterStore {
  private readonly prisma: PrismaClient
  constructor(prisma: PrismaClient) { this.prisma = prisma }

  async listFeatures() {
    const [features, subFeatures] = await Promise.all([
      this.prisma.features.findMany({ where: { status: 1, trash: 0 }, orderBy: { priority: 'asc' } }),
      this.prisma.subFeatures.findMany({ where: { status: 1, trash: 0 }, orderBy: { priority: 'asc' } }),
    ])
    return features.map((feature) => ({
      id: feature.id, feature: feature.feature,
      subFeatures: subFeatures.filter((sub) => sub.feature_id === feature.id).map((sub) => ({ id: sub.id, featureId: sub.feature_id, subFeature: sub.sub_feature })),
    }))
  }

  async listCategories(clientId: bigint, filters: ListFilters) {
    const where = {
      client_id: clientId, trash: 0,
      ...(filters.status === undefined ? {} : { status: filters.status }),
      ...(filters.search ? { OR: [{ category_code: { contains: filters.search } }, { category_name: { contains: filters.search } }] } : {}),
    }
    const [total, rows] = await Promise.all([
      this.prisma.categories.count({ where }),
      this.prisma.categories.findMany({ where, orderBy: { id: 'desc' }, skip: (filters.page - 1) * filters.perPage, take: filters.perPage }),
    ])
    return { total, rows: rows.map((row) => ({ id: row.id, code: row.category_code, name: row.category_name, printerPath: row.printer_path, status: row.status })) }
  }

  async getCategory(clientId: bigint, id: bigint) {
    const row = await this.prisma.categories.findFirst({ where: { id, client_id: clientId, trash: 0 } })
    return row ? { id: row.id, code: row.category_code, name: row.category_name, printerPath: row.printer_path, status: row.status } : null
  }

  async createCategory(account: Account, value: CategoryInput) {
    return this.prisma.$transaction(async (transaction) => {
      const duplicate = await transaction.categories.findFirst({ where: {
        client_id: account.client.id, trash: 0, OR: [{ category_code: value.code }, { category_name: value.name }],
      } })
      if (duplicate?.category_code === value.code) return 'code_duplicate' as const
      if (duplicate) return 'name_duplicate' as const
      const now = new Date()
      await transaction.categories.create({ data: {
        client_id: account.client.id, category_code: value.code, category_name: value.name, printer_path: value.printerPath,
        status: value.status, trash: 0, created_by: Number(account.user.id), created_at: now,
      } })
      await transaction.audits.create({ data: audit(account, 'add', `${value.name} category added`, now) })
      return 'saved' as const
    })
  }

  async updateCategory(account: Account, id: bigint, value: CategoryInput) {
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.categories.findFirst({ where: { id, client_id: account.client.id, trash: 0 } })
      if (!current) return 'missing' as const
      const duplicate = await transaction.categories.findFirst({ where: {
        client_id: account.client.id, trash: 0, id: { not: id }, OR: [{ category_code: value.code }, { category_name: value.name }],
      } })
      if (duplicate?.category_code === value.code) return 'code_duplicate' as const
      if (duplicate) return 'name_duplicate' as const
      const now = new Date()
      await transaction.categories.update({ where: { id }, data: {
        category_code: value.code, category_name: value.name, printer_path: value.printerPath,
        status: value.status, updated_by: Number(account.user.id), updated_at: now,
      } })
      await transaction.audits.create({ data: audit(account, 'edit', `${value.name} category edited`, now) })
      return 'saved' as const
    })
  }

  async listSubCategories(clientId: bigint, filters: SubCategoryFilters) {
    const where = {
      client_id: clientId, trash: 0,
      ...(filters.categoryId === undefined ? {} : { category_id: filters.categoryId }),
      ...(filters.status === undefined ? {} : { status: filters.status }),
      ...(filters.search ? { OR: [{ sub_category_code: { contains: filters.search } }, { sub_category_name: { contains: filters.search } }] } : {}),
    }
    const [total, rows] = await Promise.all([
      this.prisma.subCategories.count({ where }),
      this.prisma.subCategories.findMany({ where, orderBy: { id: 'desc' }, skip: (filters.page - 1) * filters.perPage, take: filters.perPage }),
    ])
    const categoryIds = [...new Set(rows.map((row) => row.category_id))]
    const categories = await this.prisma.categories.findMany({ where: { id: { in: categoryIds }, client_id: clientId, trash: 0 } })
    const categoryMap = new Map(categories.map((category) => [category.id, category]))
    return { total, rows: rows.flatMap((row) => {
      const category = categoryMap.get(row.category_id)
      return category ? [{ id: row.id, categoryId: row.category_id, categoryName: category.category_name, categoryCode: category.category_code, code: row.sub_category_code, name: row.sub_category_name, status: row.status }] : []
    }) }
  }

  async getSubCategory(clientId: bigint, id: bigint) {
    const row = await this.prisma.subCategories.findFirst({ where: { id, client_id: clientId, trash: 0 } })
    if (!row) return null
    const category = await this.prisma.categories.findFirst({ where: { id: row.category_id, client_id: clientId, trash: 0 } })
    return category ? { id: row.id, categoryId: row.category_id, categoryName: category.category_name, categoryCode: category.category_code, code: row.sub_category_code, name: row.sub_category_name, status: row.status } : null
  }

  async createSubCategory(account: Account, value: SubCategoryInput) {
    return this.prisma.$transaction(async (transaction) => {
      const parent = await transaction.categories.findFirst({ where: { id: value.categoryId, client_id: account.client.id, trash: 0 } })
      if (!parent) return 'parent_missing' as const
      const duplicate = await transaction.subCategories.findFirst({ where: {
        client_id: account.client.id, category_id: value.categoryId, trash: 0,
        OR: [{ sub_category_code: value.code }, { sub_category_name: value.name }],
      } })
      if (duplicate?.sub_category_code === value.code) return 'code_duplicate' as const
      if (duplicate) return 'name_duplicate' as const
      const now = new Date()
      await transaction.subCategories.create({ data: {
        client_id: account.client.id, category_id: value.categoryId, sub_category_code: value.code,
        sub_category_name: value.name, status: value.status, trash: 0, created_by: Number(account.user.id), created_at: now,
      } })
      await transaction.audits.create({ data: audit(account, 'add', `${value.name} sub category added`, now) })
      return 'saved' as const
    })
  }

  async updateSubCategory(account: Account, id: bigint, value: SubCategoryInput) {
    return this.prisma.$transaction(async (transaction) => {
      const [current, parent] = await Promise.all([
        transaction.subCategories.findFirst({ where: { id, client_id: account.client.id, trash: 0 } }),
        transaction.categories.findFirst({ where: { id: value.categoryId, client_id: account.client.id, trash: 0 } }),
      ])
      if (!current) return 'missing' as const
      if (!parent) return 'parent_missing' as const
      const duplicate = await transaction.subCategories.findFirst({ where: {
        client_id: account.client.id, category_id: value.categoryId, trash: 0, id: { not: id },
        OR: [{ sub_category_code: value.code }, { sub_category_name: value.name }],
      } })
      if (duplicate?.sub_category_code === value.code) return 'code_duplicate' as const
      if (duplicate) return 'name_duplicate' as const
      const now = new Date()
      await transaction.subCategories.update({ where: { id }, data: {
        category_id: value.categoryId, sub_category_code: value.code, sub_category_name: value.name,
        status: value.status, updated_by: Number(account.user.id), updated_at: now,
      } })
      await transaction.audits.create({ data: audit(account, 'edit', `${value.name} sub category edited`, now) })
      return 'saved' as const
    })
  }

  async listBrands(clientId: bigint, filters: ListFilters) {
    const where = {
      client_id: clientId, trash: 0,
      ...(filters.status === undefined ? {} : { status: filters.status }),
      ...(filters.search ? { OR: [{ brand_code: { contains: filters.search } }, { brand_name: { contains: filters.search } }] } : {}),
    }
    const [total, rows] = await Promise.all([
      this.prisma.brands.count({ where }),
      this.prisma.brands.findMany({ where, orderBy: { id: 'desc' }, skip: (filters.page - 1) * filters.perPage, take: filters.perPage }),
    ])
    return { total, rows: rows.map((row) => ({ id: row.id, code: row.brand_code, name: row.brand_name, status: row.status })) }
  }

  async getBrand(clientId: bigint, id: bigint) {
    const row = await this.prisma.brands.findFirst({ where: { id, client_id: clientId, trash: 0 } })
    return row ? { id: row.id, code: row.brand_code, name: row.brand_name, status: row.status } : null
  }

  async createBrand(account: Account, value: SimpleMasterInput) {
    return this.prisma.$transaction(async (transaction) => {
      const duplicate = await transaction.brands.findFirst({ where: {
        client_id: account.client.id, trash: 0, OR: [{ brand_code: value.code }, { brand_name: value.name }],
      } })
      if (duplicate?.brand_code === value.code) return 'code_duplicate' as const
      if (duplicate) return 'name_duplicate' as const
      const now = new Date()
      await transaction.brands.create({ data: {
        client_id: account.client.id, brand_code: value.code, brand_name: value.name, status: value.status,
        trash: 0, created_by: Number(account.user.id), created_at: now,
      } })
      await transaction.audits.create({ data: audit(account, 'add', `${value.name} brand added`, now) })
      return 'saved' as const
    })
  }

  async updateBrand(account: Account, id: bigint, value: SimpleMasterInput) {
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.brands.findFirst({ where: { id, client_id: account.client.id, trash: 0 } })
      if (!current) return 'missing' as const
      const duplicate = await transaction.brands.findFirst({ where: {
        client_id: account.client.id, trash: 0, id: { not: id }, OR: [{ brand_code: value.code }, { brand_name: value.name }],
      } })
      if (duplicate?.brand_code === value.code) return 'code_duplicate' as const
      if (duplicate) return 'name_duplicate' as const
      const now = new Date()
      await transaction.brands.update({ where: { id }, data: {
        brand_code: value.code, brand_name: value.name, status: value.status,
        updated_by: Number(account.user.id), updated_at: now,
      } })
      await transaction.audits.create({ data: audit(account, 'edit', `${value.name} brand edited`, now) })
      return 'saved' as const
    })
  }

  async listColours(clientId: bigint, filters: ListFilters) {
    const where = {
      client_id: clientId, trash: 0,
      ...(filters.status === undefined ? {} : { status: filters.status }),
      ...(filters.search ? { OR: [{ colour_code: { contains: filters.search } }, { colour_name: { contains: filters.search } }] } : {}),
    }
    const [total, rows] = await Promise.all([
      this.prisma.colours.count({ where }),
      this.prisma.colours.findMany({ where, orderBy: { id: 'desc' }, skip: (filters.page - 1) * filters.perPage, take: filters.perPage }),
    ])
    return { total, rows: rows.map((row) => ({ id: row.id, code: row.colour_code, name: row.colour_name, status: row.status })) }
  }

  async getColour(clientId: bigint, id: bigint) {
    const row = await this.prisma.colours.findFirst({ where: { id, client_id: clientId, trash: 0 } })
    return row ? { id: row.id, code: row.colour_code, name: row.colour_name, status: row.status } : null
  }

  async createColour(account: Account, value: SimpleMasterInput) {
    return this.prisma.$transaction(async (transaction) => {
      const duplicate = await transaction.colours.findFirst({ where: {
        client_id: account.client.id, trash: 0, OR: [{ colour_code: value.code }, { colour_name: value.name }],
      } })
      if (duplicate?.colour_code === value.code) return 'code_duplicate' as const
      if (duplicate) return 'name_duplicate' as const
      const now = new Date()
      await transaction.colours.create({ data: {
        client_id: account.client.id, colour_code: value.code, colour_name: value.name, status: value.status,
        trash: 0, created_by: Number(account.user.id), created_at: now,
      } })
      await transaction.audits.create({ data: audit(account, 'add', `${value.name} colour added`, now) })
      return 'saved' as const
    })
  }

  async updateColour(account: Account, id: bigint, value: SimpleMasterInput) {
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.colours.findFirst({ where: { id, client_id: account.client.id, trash: 0 } })
      if (!current) return 'missing' as const
      const duplicate = await transaction.colours.findFirst({ where: {
        client_id: account.client.id, trash: 0, id: { not: id }, OR: [{ colour_code: value.code }, { colour_name: value.name }],
      } })
      if (duplicate?.colour_code === value.code) return 'code_duplicate' as const
      if (duplicate) return 'name_duplicate' as const
      const now = new Date()
      await transaction.colours.update({ where: { id }, data: {
        colour_code: value.code, colour_name: value.name, status: value.status,
        updated_by: Number(account.user.id), updated_at: now,
      } })
      await transaction.audits.create({ data: audit(account, 'edit', `${value.name} colour edited`, now) })
      return 'saved' as const
    })
  }

  async listSizes(clientId: bigint, filters: ListFilters) {
    const where = {
      client_id: clientId, trash: 0,
      ...(filters.status === undefined ? {} : { status: filters.status }),
      ...(filters.search ? { OR: [{ size_code: { contains: filters.search } }, { size_name: { contains: filters.search } }] } : {}),
    }
    const [total, rows] = await Promise.all([
      this.prisma.sizes.count({ where }),
      this.prisma.sizes.findMany({ where, orderBy: { id: 'desc' }, skip: (filters.page - 1) * filters.perPage, take: filters.perPage }),
    ])
    return { total, rows: rows.map((row) => ({ id: row.id, code: row.size_code, name: row.size_name, status: row.status })) }
  }

  async getSize(clientId: bigint, id: bigint) {
    const row = await this.prisma.sizes.findFirst({ where: { id, client_id: clientId, trash: 0 } })
    return row ? { id: row.id, code: row.size_code, name: row.size_name, status: row.status } : null
  }

  async createSize(account: Account, value: SimpleMasterInput) {
    return this.prisma.$transaction(async (transaction) => {
      const duplicate = await transaction.sizes.findFirst({ where: {
        client_id: account.client.id, trash: 0, OR: [{ size_code: value.code }, { size_name: value.name }],
      } })
      if (duplicate?.size_code === value.code) return 'code_duplicate' as const
      if (duplicate) return 'name_duplicate' as const
      const now = new Date()
      await transaction.sizes.create({ data: {
        client_id: account.client.id, size_code: value.code, size_name: value.name, status: value.status,
        trash: 0, created_by: Number(account.user.id), created_at: now,
      } })
      await transaction.audits.create({ data: audit(account, 'add', `${value.name} size added`, now) })
      return 'saved' as const
    })
  }

  async updateSize(account: Account, id: bigint, value: SimpleMasterInput) {
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.sizes.findFirst({ where: { id, client_id: account.client.id, trash: 0 } })
      if (!current) return 'missing' as const
      const duplicate = await transaction.sizes.findFirst({ where: {
        client_id: account.client.id, trash: 0, id: { not: id }, OR: [{ size_code: value.code }, { size_name: value.name }],
      } })
      if (duplicate?.size_code === value.code) return 'code_duplicate' as const
      if (duplicate) return 'name_duplicate' as const
      const now = new Date()
      await transaction.sizes.update({ where: { id }, data: {
        size_code: value.code, size_name: value.name, status: value.status,
        updated_by: Number(account.user.id), updated_at: now,
      } })
      await transaction.audits.create({ data: audit(account, 'edit', `${value.name} size edited`, now) })
      return 'saved' as const
    })
  }

  async listUnitTypes(clientId: bigint, filters: ListFilters) {
    const where = {
      client_id: clientId, trash: 0,
      ...(filters.status === undefined ? {} : { status: filters.status }),
      ...(filters.search ? { OR: [{ unit_type_code: { contains: filters.search } }, { unit_type_name: { contains: filters.search } }] } : {}),
    }
    const [total, rows] = await Promise.all([
      this.prisma.unitTypes.count({ where }),
      this.prisma.unitTypes.findMany({ where, orderBy: { id: 'desc' }, skip: (filters.page - 1) * filters.perPage, take: filters.perPage }),
    ])
    return { total, rows: rows.map((row) => ({ id: row.id, code: row.unit_type_code, name: row.unit_type_name, status: row.status })) }
  }

  async getUnitType(clientId: bigint, id: bigint) {
    const row = await this.prisma.unitTypes.findFirst({ where: { id, client_id: clientId, trash: 0 } })
    return row ? { id: row.id, code: row.unit_type_code, name: row.unit_type_name, status: row.status } : null
  }

  async createUnitType(account: Account, value: SimpleMasterInput) {
    return this.prisma.$transaction(async (transaction) => {
      const duplicate = await transaction.unitTypes.findFirst({ where: {
        client_id: account.client.id, trash: 0, OR: [{ unit_type_code: value.code }, { unit_type_name: value.name }],
      } })
      if (duplicate?.unit_type_code === value.code) return 'code_duplicate' as const
      if (duplicate) return 'name_duplicate' as const
      const now = new Date()
      await transaction.unitTypes.create({ data: {
        client_id: account.client.id, unit_type_code: value.code, unit_type_name: value.name, status: value.status,
        trash: 0, created_by: Number(account.user.id), created_at: now,
      } })
      await transaction.audits.create({ data: audit(account, 'add', `${value.name} unit type added`, now) })
      return 'saved' as const
    })
  }

  async updateUnitType(account: Account, id: bigint, value: SimpleMasterInput) {
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.unitTypes.findFirst({ where: { id, client_id: account.client.id, trash: 0 } })
      if (!current) return 'missing' as const
      const duplicate = await transaction.unitTypes.findFirst({ where: {
        client_id: account.client.id, trash: 0, id: { not: id }, OR: [{ unit_type_code: value.code }, { unit_type_name: value.name }],
      } })
      if (duplicate?.unit_type_code === value.code) return 'code_duplicate' as const
      if (duplicate) return 'name_duplicate' as const
      const now = new Date()
      await transaction.unitTypes.update({ where: { id }, data: {
        unit_type_code: value.code, unit_type_name: value.name, status: value.status,
        updated_by: Number(account.user.id), updated_at: now,
      } })
      await transaction.audits.create({ data: audit(account, 'edit', `${value.name} Unit Type edited`, now) })
      return 'saved' as const
    })
  }

  async listTeams(clientId: bigint, filters: ListFilters) {
    const where = { client_id: clientId, trash: 0, ...(filters.status === undefined ? {} : { status: filters.status }), ...(filters.search ? { OR: [{ team_code: { contains: filters.search } }, { team_name: { contains: filters.search } }] } : {}) }
    const [total, rows] = await Promise.all([
      this.prisma.teams.count({ where }), this.prisma.teams.findMany({ where, orderBy: { id: 'desc' }, skip: (filters.page - 1) * filters.perPage, take: filters.perPage }),
    ])
    return { total, rows: rows.map((row) => ({ id: row.id, code: row.team_code, name: row.team_name, status: row.status })) }
  }

  async getTeam(clientId: bigint, id: bigint) {
    const row = await this.prisma.teams.findFirst({ where: { id, client_id: clientId, trash: 0 } })
    return row ? { id: row.id, code: row.team_code, name: row.team_name, status: row.status } : null
  }

  async createTeam(account: Account, value: SimpleMasterInput) {
    return this.prisma.$transaction(async (transaction) => {
      const duplicate = await transaction.teams.findFirst({ where: { client_id: account.client.id, trash: 0, OR: [{ team_code: value.code }, { team_name: value.name }] } })
      if (duplicate?.team_code === value.code) return 'code_duplicate' as const
      if (duplicate) return 'name_duplicate' as const
      const now = new Date()
      await transaction.teams.create({ data: { client_id: account.client.id, team_code: value.code, team_name: value.name, status: value.status, trash: 0, created_by: Number(account.user.id), created_at: now } })
      await transaction.audits.create({ data: audit(account, 'add', `${value.name} team added`, now) })
      return 'saved' as const
    })
  }

  async updateTeam(account: Account, id: bigint, value: SimpleMasterInput) {
    return this.prisma.$transaction(async (transaction) => {
      if (!await transaction.teams.findFirst({ where: { id, client_id: account.client.id, trash: 0 } })) return 'missing' as const
      const duplicate = await transaction.teams.findFirst({ where: { client_id: account.client.id, trash: 0, id: { not: id }, OR: [{ team_code: value.code }, { team_name: value.name }] } })
      if (duplicate?.team_code === value.code) return 'code_duplicate' as const
      if (duplicate) return 'name_duplicate' as const
      const now = new Date()
      await transaction.teams.update({ where: { id }, data: { team_code: value.code, team_name: value.name, status: value.status, updated_by: Number(account.user.id), updated_at: now } })
      await transaction.audits.create({ data: audit(account, 'edit', `${value.name} Team edited`, now) })
      return 'saved' as const
    })
  }

  async listPaymentModes(clientId: bigint, filters: ListFilters) {
    const where = { client_id: clientId, trash: 0, ...(filters.status === undefined ? {} : { status: filters.status }), ...(filters.search ? { payment_mode: { contains: filters.search } } : {}) }
    const [total, rows] = await Promise.all([
      this.prisma.paymentModes.count({ where }), this.prisma.paymentModes.findMany({ where, orderBy: { id: 'desc' }, skip: (filters.page - 1) * filters.perPage, take: filters.perPage }),
    ])
    return { total, rows: rows.map((row) => ({ id: row.id, name: row.payment_mode, allowChange: row.allow_change, status: row.status })) }
  }

  async getPaymentMode(clientId: bigint, id: bigint) {
    const row = await this.prisma.paymentModes.findFirst({ where: { id, client_id: clientId, trash: 0 } })
    return row ? { id: row.id, name: row.payment_mode, allowChange: row.allow_change, status: row.status } : null
  }

  async createPaymentMode(account: Account, value: PaymentModeInput) {
    return this.prisma.$transaction(async (transaction) => {
      const duplicate = await transaction.paymentModes.findFirst({ where: { client_id: account.client.id, trash: 0, payment_mode: value.name } })
      if (duplicate) return 'name_duplicate' as const
      const now = new Date()
      await transaction.paymentModes.create({ data: { client_id: account.client.id, payment_mode: value.name, allow_change: value.allowChange, status: value.status, trash: 0, created_by: Number(account.user.id), created_at: now } })
      await transaction.audits.create({ data: audit(account, 'add', `${value.name} payment mode added`, now) })
      return 'saved' as const
    })
  }

  async updatePaymentMode(account: Account, id: bigint, value: PaymentModeInput) {
    return this.prisma.$transaction(async (transaction) => {
      if (!await transaction.paymentModes.findFirst({ where: { id, client_id: account.client.id, trash: 0 } })) return 'missing' as const
      if (await transaction.paymentModes.findFirst({ where: { client_id: account.client.id, trash: 0, id: { not: id }, payment_mode: value.name } })) return 'name_duplicate' as const
      const now = new Date()
      await transaction.paymentModes.update({ where: { id }, data: { payment_mode: value.name, allow_change: value.allowChange, status: value.status, updated_by: Number(account.user.id), updated_at: now } })
      await transaction.audits.create({ data: audit(account, 'edit', `${value.name} payment mode edited`, now) })
      return 'saved' as const
    })
  }

  async listTaxes(clientId: bigint, filters: ListFilters) {
    const where = { client_id: clientId, trash: 0, ...(filters.status === undefined ? {} : { status: filters.status }), ...(filters.search ? { OR: [{ tax_code: { contains: filters.search } }, { tax_name: { contains: filters.search } }] } : {}) }
    const [total, rows] = await Promise.all([this.prisma.taxes.count({ where }), this.prisma.taxes.findMany({ where, orderBy: { id: 'desc' }, skip: (filters.page - 1) * filters.perPage, take: filters.perPage })])
    return { total, rows: rows.map((row) => ({ id: row.id, code: row.tax_code, name: row.tax_name, percent: row.tax_percent, status: row.status })) }
  }

  async getTax(clientId: bigint, id: bigint) {
    const row = await this.prisma.taxes.findFirst({ where: { id, client_id: clientId, trash: 0 } })
    return row ? { id: row.id, code: row.tax_code, name: row.tax_name, percent: row.tax_percent, status: row.status } : null
  }

  async createTax(account: Account, value: TaxInput) {
    return this.prisma.$transaction(async (transaction) => {
      // Serialize tenant tax writes so simultaneous requests cannot create the same rate.
      await transaction.$queryRaw`SELECT id FROM users WHERE id = ${account.client.id} FOR UPDATE`
      const duplicate = await transaction.taxes.findFirst({ where: { client_id: account.client.id, trash: 0, OR: [{ tax_code: value.code }, { tax_name: value.name }, { tax_percent: value.percent }] } })
      if (duplicate?.tax_code === value.code) return 'code_duplicate' as const
      if (duplicate?.tax_name === value.name) return 'name_duplicate' as const
      if (duplicate) return 'percent_duplicate' as const
      const now = new Date()
      await transaction.taxes.create({ data: { client_id: account.client.id, tax_code: value.code, tax_name: value.name, tax_percent: value.percent, status: value.status, trash: 0, created_by: Number(account.user.id), created_at: now } })
      await transaction.audits.create({ data: audit(account, 'add', `${value.name} tax added`, now) })
      return 'saved' as const
    })
  }

  async updateTax(account: Account, id: bigint, value: TaxInput) {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT id FROM users WHERE id = ${account.client.id} FOR UPDATE`
      if (!await transaction.taxes.findFirst({ where: { id, client_id: account.client.id, trash: 0 } })) return 'missing' as const
      const duplicate = await transaction.taxes.findFirst({ where: { client_id: account.client.id, trash: 0, id: { not: id }, OR: [{ tax_code: value.code }, { tax_name: value.name }, { tax_percent: value.percent }] } })
      if (duplicate?.tax_code === value.code) return 'code_duplicate' as const
      if (duplicate?.tax_name === value.name) return 'name_duplicate' as const
      if (duplicate) return 'percent_duplicate' as const
      const now = new Date()
      await transaction.taxes.update({ where: { id }, data: { tax_code: value.code, tax_name: value.name, tax_percent: value.percent, status: value.status, updated_by: Number(account.user.id), updated_at: now } })
      await transaction.audits.create({ data: audit(account, 'edit', `${value.name} tax edited`, now) })
      return 'saved' as const
    })
  }

  async listSalesMans(clientId: bigint, filters: SalesManFilters) {
    const where = { client_id: clientId, trash: 0, ...(filters.teamId === undefined ? {} : { team_id: filters.teamId }), ...(filters.status === undefined ? {} : { status: filters.status }), ...(filters.search ? { OR: [{ sm_code: { contains: filters.search } }, { sm_name: { contains: filters.search } }] } : {}) }
    const [total, rows] = await Promise.all([this.prisma.salesMans.count({ where }), this.prisma.salesMans.findMany({ where, orderBy: { id: 'desc' }, skip: (filters.page - 1) * filters.perPage, take: filters.perPage })])
    const teamIds = [...new Set(rows.flatMap((row) => row.team_id === null ? [] : [row.team_id]))]
    const teams = await this.prisma.teams.findMany({ where: { id: { in: teamIds }, client_id: clientId, trash: 0 } })
    const names = new Map(teams.map((team) => [team.id, team.team_name]))
    return { total, rows: rows.map((row) => ({ id: row.id, teamId: row.team_id, teamName: row.team_id === null ? '' : names.get(row.team_id) ?? '', code: row.sm_code, name: row.sm_name, commissionPercent: row.commission_percent?.toString() ?? null, status: row.status })) }
  }

  async getSalesMan(clientId: bigint, id: bigint) {
    const row = await this.prisma.salesMans.findFirst({ where: { id, client_id: clientId, trash: 0 } })
    if (!row) return null
    const team = row.team_id === null ? null : await this.prisma.teams.findFirst({ where: { id: row.team_id, client_id: clientId, trash: 0 } })
    if (row.team_id !== null && !team) return null
    return { id: row.id, teamId: row.team_id, teamName: team?.team_name ?? '', code: row.sm_code, name: row.sm_name, commissionPercent: row.commission_percent?.toString() ?? null, status: row.status }
  }

  async createSalesMan(account: Account, value: SalesManInput) {
    return this.prisma.$transaction(async (transaction) => {
      if (value.teamId !== null && !await transaction.teams.findFirst({ where: { id: value.teamId, client_id: account.client.id, status: 1, trash: 0 } })) return 'parent_missing' as const
      if (await transaction.salesMans.findFirst({ where: { client_id: account.client.id, trash: 0, sm_code: value.code } })) return 'code_duplicate' as const
      const now = new Date()
      await transaction.salesMans.create({ data: { client_id: account.client.id, team_id: value.teamId, sm_code: value.code, sm_name: value.name, commission_percent: value.commissionPercent, status: value.status, trash: 0, created_by: Number(account.user.id), created_at: now } })
      await transaction.audits.create({ data: audit(account, 'add', `${value.code} sales man added`, now) })
      return 'saved' as const
    })
  }

  async updateSalesMan(account: Account, id: bigint, value: SalesManInput) {
    return this.prisma.$transaction(async (transaction) => {
      if (!await transaction.salesMans.findFirst({ where: { id, client_id: account.client.id, trash: 0 } })) return 'missing' as const
      if (value.teamId !== null && !await transaction.teams.findFirst({ where: { id: value.teamId, client_id: account.client.id, status: 1, trash: 0 } })) return 'parent_missing' as const
      if (await transaction.salesMans.findFirst({ where: { client_id: account.client.id, trash: 0, id: { not: id }, sm_code: value.code } })) return 'code_duplicate' as const
      const now = new Date()
      await transaction.salesMans.update({ where: { id }, data: { team_id: value.teamId, sm_code: value.code, sm_name: value.name, commission_percent: value.commissionPercent, status: value.status, updated_by: Number(account.user.id), updated_at: now } })
      await transaction.audits.create({ data: audit(account, 'edit', `${value.code} sales man updated`, now) })
      return 'saved' as const
    })
  }

  async listFloors(clientId: bigint, filters: ListFilters) {
    const where = { client_id: clientId, trash: 0, ...(filters.status === undefined ? {} : { status: filters.status }), ...(filters.search ? { OR: [{ floor_code: { contains: filters.search } }, { floor_name: { contains: filters.search } }] } : {}) }
    const [total, rows] = await Promise.all([this.prisma.floors.count({ where }), this.prisma.floors.findMany({ where, orderBy: { id: 'desc' }, skip: (filters.page - 1) * filters.perPage, take: filters.perPage })])
    return { total, rows: rows.map((row) => ({ id: row.id, code: row.floor_code, name: row.floor_name, status: row.status })) }
  }

  async getFloor(clientId: bigint, id: bigint) {
    const row = await this.prisma.floors.findFirst({ where: { id, client_id: clientId, trash: 0 } })
    return row ? { id: row.id, code: row.floor_code, name: row.floor_name, status: row.status } : null
  }

  async createFloor(account: Account, value: SimpleMasterInput) {
    return this.prisma.$transaction(async (transaction) => {
      const duplicate = await transaction.floors.findFirst({ where: { client_id: account.client.id, trash: 0, OR: [{ floor_code: value.code }, { floor_name: value.name }] } })
      if (duplicate?.floor_code === value.code) return 'code_duplicate' as const
      if (duplicate) return 'name_duplicate' as const
      const now = new Date(); await transaction.floors.create({ data: { client_id: account.client.id, floor_code: value.code, floor_name: value.name, status: value.status, trash: 0, created_by: Number(account.user.id), created_at: now } })
      await transaction.audits.create({ data: audit(account, 'add', `${value.name} floor added`, now) }); return 'saved' as const
    })
  }

  async updateFloor(account: Account, id: bigint, value: SimpleMasterInput) {
    return this.prisma.$transaction(async (transaction) => {
      if (!await transaction.floors.findFirst({ where: { id, client_id: account.client.id, trash: 0 } })) return 'missing' as const
      const duplicate = await transaction.floors.findFirst({ where: { client_id: account.client.id, trash: 0, id: { not: id }, OR: [{ floor_code: value.code }, { floor_name: value.name }] } })
      if (duplicate?.floor_code === value.code) return 'code_duplicate' as const
      if (duplicate) return 'name_duplicate' as const
      const now = new Date(); await transaction.floors.update({ where: { id }, data: { floor_code: value.code, floor_name: value.name, status: value.status, updated_by: Number(account.user.id), updated_at: now } })
      await transaction.audits.create({ data: audit(account, 'edit', `${value.name} floor edited`, now) }); return 'saved' as const
    })
  }

  async listTableTypes(clientId: bigint, filters: ListFilters) {
    const where = { client_id: clientId, trash: 0, ...(filters.status === undefined ? {} : { status: filters.status }), ...(filters.search ? { table_type: { contains: filters.search } } : {}) }
    const [total, rows] = await Promise.all([this.prisma.tableTypes.count({ where }), this.prisma.tableTypes.findMany({ where, orderBy: { id: 'desc' }, skip: (filters.page - 1) * filters.perPage, take: filters.perPage })])
    return { total, rows: rows.map((row) => ({ id: row.id, name: row.table_type, status: row.status })) }
  }

  async getTableType(clientId: bigint, id: bigint) {
    const row = await this.prisma.tableTypes.findFirst({ where: { id, client_id: clientId, trash: 0 } })
    return row ? { id: row.id, name: row.table_type, status: row.status } : null
  }

  async createTableType(account: Account, value: NamedMasterInput) {
    return this.prisma.$transaction(async (transaction) => {
      if (await transaction.tableTypes.findFirst({ where: { client_id: account.client.id, trash: 0, table_type: value.name } })) return 'name_duplicate' as const
      const now = new Date(); await transaction.tableTypes.create({ data: { client_id: account.client.id, table_type: value.name, status: value.status, trash: 0, created_by: Number(account.user.id), created_at: now } })
      await transaction.audits.create({ data: audit(account, 'add', `${value.name} table type added`, now) }); return 'saved' as const
    })
  }

  async updateTableType(account: Account, id: bigint, value: NamedMasterInput) {
    return this.prisma.$transaction(async (transaction) => {
      if (!await transaction.tableTypes.findFirst({ where: { id, client_id: account.client.id, trash: 0 } })) return 'missing' as const
      if (await transaction.tableTypes.findFirst({ where: { client_id: account.client.id, trash: 0, id: { not: id }, table_type: value.name } })) return 'name_duplicate' as const
      const now = new Date(); await transaction.tableTypes.update({ where: { id }, data: { table_type: value.name, status: value.status, updated_by: Number(account.user.id), updated_at: now } })
      await transaction.audits.create({ data: audit(account, 'edit', `${value.name} table type edited`, now) }); return 'saved' as const
    })
  }

  async listTables(clientId: bigint, filters: TableFilters) {
    const where = { client_id: clientId, trash: 0, ...(filters.floorId === undefined ? {} : { floor_id: filters.floorId }), ...(filters.status === undefined ? {} : { status: filters.status }), ...(filters.search ? { OR: [{ table_code: { contains: filters.search } }, { table_name: { contains: filters.search } }] } : {}) }
    const [total, rows] = await Promise.all([this.prisma.tables.count({ where }), this.prisma.tables.findMany({ where, orderBy: { id: 'desc' }, skip: (filters.page - 1) * filters.perPage, take: filters.perPage })])
    const floorIds = [...new Set(rows.map((row) => row.floor_id))], typeIds = [...new Set(rows.map((row) => row.table_type_id))]
    const [floors, types] = await Promise.all([this.prisma.floors.findMany({ where: { id: { in: floorIds }, client_id: clientId, trash: 0 } }), this.prisma.tableTypes.findMany({ where: { id: { in: typeIds }, client_id: clientId, trash: 0 } })])
    const floorMap = new Map(floors.map((row) => [row.id, row.floor_name])), typeMap = new Map(types.map((row) => [row.id, row.table_type]))
    return { total, rows: rows.flatMap((row) => { const floorName = floorMap.get(row.floor_id), tableType = typeMap.get(row.table_type_id); return floorName && tableType ? [{ id: row.id, floorId: row.floor_id, floorName, tableTypeId: row.table_type_id, tableType, code: row.table_code, name: row.table_name, capacity: row.capacity, acNonAc: row.ac_non_ac, underMaintenance: row.table_under_maintenance, status: row.status }] : [] }) }
  }

  async getTable(clientId: bigint, id: bigint) {
    const row = await this.prisma.tables.findFirst({ where: { id, client_id: clientId, trash: 0 } }); if (!row) return null
    const [floor, type] = await Promise.all([this.prisma.floors.findFirst({ where: { id: row.floor_id, client_id: clientId, trash: 0 } }), this.prisma.tableTypes.findFirst({ where: { id: row.table_type_id, client_id: clientId, trash: 0 } })]); if (!floor || !type) return null
    return { id: row.id, floorId: row.floor_id, floorName: floor.floor_name, tableTypeId: row.table_type_id, tableType: type.table_type, code: row.table_code, name: row.table_name, capacity: row.capacity, acNonAc: row.ac_non_ac, underMaintenance: row.table_under_maintenance, status: row.status }
  }

  async createTable(account: Account, value: TableInput) { return this.writeTable(account, undefined, value) }
  async updateTable(account: Account, id: bigint, value: TableInput) { return this.writeTable(account, id, value) }

  private async writeTable(account: Account, id: bigint | undefined, value: TableInput) {
    return this.prisma.$transaction(async (transaction) => {
      if (id !== undefined && !await transaction.tables.findFirst({ where: { id, client_id: account.client.id, trash: 0 } })) return 'missing' as const
      if (!await transaction.floors.findFirst({ where: { id: value.floorId, client_id: account.client.id, status: 1, trash: 0 } })) return 'floor_missing' as const
      if (!await transaction.tableTypes.findFirst({ where: { id: value.tableTypeId, client_id: account.client.id, status: 1, trash: 0 } })) return 'table_type_missing' as const
      const duplicate = await transaction.tables.findFirst({ where: { client_id: account.client.id, floor_id: value.floorId, trash: 0, ...(id === undefined ? {} : { id: { not: id } }), OR: [{ table_code: value.code }, { table_name: value.name }] } })
      if (duplicate?.table_code === value.code) return 'code_duplicate' as const
      if (duplicate) return 'name_duplicate' as const
      const now = new Date(), data = { floor_id: value.floorId, table_type_id: value.tableTypeId, table_code: value.code, table_name: value.name, capacity: value.capacity, ac_non_ac: value.acNonAc, table_under_maintenance: value.underMaintenance, status: value.status }
      if (id === undefined) await transaction.tables.create({ data: { client_id: account.client.id, ...data, trash: 0, created_by: Number(account.user.id), created_at: now } })
      else await transaction.tables.update({ where: { id }, data: { ...data, updated_by: Number(account.user.id), updated_at: now } })
      await transaction.audits.create({ data: audit(account, id === undefined ? 'add' : 'edit', `${value.name} table ${id === undefined ? 'added' : 'updated'}`, now) }); return 'saved' as const
    })
  }

  async listRoles(clientId: bigint, filters: ListFilters) {
    const where = { client_id: clientId, trash: 0, ...(filters.status === undefined ? {} : { status: filters.status }), ...(filters.search ? { role_title: { contains: filters.search } } : {}) }
    const [total, rows] = await Promise.all([this.prisma.clientRoles.count({ where }), this.prisma.clientRoles.findMany({ where, orderBy: { id: 'desc' }, skip: (filters.page - 1) * filters.perPage, take: filters.perPage })])
    return { total, rows: rows.flatMap((row) => row.role_title === null ? [] : [{ id: row.id, name: row.role_title, status: row.status }]) }
  }

  async getRole(clientId: bigint, id: bigint) {
    const row = await this.prisma.clientRoles.findFirst({ where: { id, client_id: clientId, trash: 0 } })
    return row?.role_title ? { id: row.id, name: row.role_title, status: row.status } : null
  }

  async createRole(account: Account, value: NamedMasterInput) {
    return this.prisma.$transaction(async (transaction) => {
      if (await transaction.clientRoles.findFirst({ where: { client_id: account.client.id, trash: 0, role_title: value.name } })) return 'name_duplicate' as const
      const now = new Date(); await transaction.clientRoles.create({ data: { client_id: account.client.id, role_title: value.name, status: value.status, trash: 0, created_by: Number(account.user.id), created_at: now } })
      await transaction.audits.create({ data: audit(account, 'add', `${value.name} role added`, now) }); return 'saved' as const
    })
  }

  async updateRole(account: Account, id: bigint, value: NamedMasterInput) {
    return this.prisma.$transaction(async (transaction) => {
      if (!await transaction.clientRoles.findFirst({ where: { id, client_id: account.client.id, trash: 0 } })) return 'missing' as const
      if (await transaction.clientRoles.findFirst({ where: { client_id: account.client.id, trash: 0, id: { not: id }, role_title: value.name } })) return 'name_duplicate' as const
      const now = new Date(); await transaction.clientRoles.update({ where: { id }, data: { role_title: value.name, status: value.status, updated_by: Number(account.user.id), updated_at: now } })
      await transaction.audits.create({ data: audit(account, 'edit', `${value.name} role edited`, now) }); return 'saved' as const
    })
  }
}
