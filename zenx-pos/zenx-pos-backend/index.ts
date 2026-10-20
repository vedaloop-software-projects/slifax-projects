import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { loadConfig } from './models/system/config.ts'
import { createApp } from './routes/system/app.ts'
import { loadDatabaseConfig } from './models/database/config.ts'
import { createDatabase } from './models/database/client.ts'
import { loadAuthConfig } from './models/auth/config.ts'
import { PrismaAuthStore } from './models/auth/prisma-store.ts'
import { AuthService } from './routes/auth/service.ts'
import { createAuthRouter } from './routes/auth/router.ts'
import { PrismaAccountStore } from './models/account/prisma-store.ts'
import { AccountService } from './routes/account/service.ts'
import { createAccountRouter } from './routes/account/router.ts'
import { DiskLogoStorage } from './models/account/logo-storage.ts'
import { loadResetConfig } from './models/reset/config.ts'
import { PrismaResetStore } from './models/reset/prisma-store.ts'
import { UnavailableOtpDelivery, WebhookOtpDelivery } from './models/reset/delivery.ts'
import { ResetService } from './routes/reset/service.ts'
import { createResetRouter } from './routes/reset/router.ts'
import { loadRedisConfig } from './models/cache/config.ts'
import { createRedis } from './models/cache/client.ts'
import { RedisJsonCache } from './models/cache/cache-aside.ts'
import { RedisResetStore } from './models/reset/redis-store.ts'
import { PrismaMasterStore } from './models/master/prisma-store.ts'
import { MasterService } from './routes/master/service.ts'
import { createMasterRouter } from './routes/master/router.ts'
import { PrismaAccessStore } from './models/access/prisma-store.ts'
import { AccessService } from './routes/access/service.ts'
import { createAccessRouter } from './routes/access/router.ts'
import { PrismaExpenseStore } from './models/expense/prisma-store.ts'
import { CsvExpenseExportStorage } from './models/expense/export-storage.ts'
import { ExpenseService } from './routes/expense/service.ts'
import { createExpenseRouter } from './routes/expense/router.ts'
import { PrismaUserStore } from './models/user/prisma-store.ts'
import { UserService } from './routes/user/service.ts'
import { createUserRouter } from './routes/user/router.ts'
import { PrismaWorkforceStore } from './models/workforce/prisma-store.ts'
import { WorkforceService } from './routes/workforce/service.ts'
import { createWorkforceRouter } from './routes/workforce/router.ts'
import { PrismaProductSearchStore } from './models/product-search/prisma-store.ts'
import { ProductSearchService } from './routes/product-search/service.ts'
import { createProductSearchRouter } from './routes/product-search/router.ts'
import { PrismaCustomerStore } from './models/customer/prisma-store.ts'
import { CustomerService } from './routes/customer/service.ts'
import { createCustomerRouter } from './routes/customer/router.ts'
import { PrismaProductCatalogStore } from './models/product/catalog-store.ts'
import { DiskProductSample } from './models/product/sample.ts'
import { DiskProductImageStorage } from './models/product/image-storage.ts'
import { PrismaProductImportStore } from './models/product/import-store.ts'
import { ProductService } from './routes/product/service.ts'
import { createProductRouter } from './routes/product/router.ts'
import { PrismaSettingsStore } from './models/settings/prisma-store.ts'
import { SettingsService } from './routes/settings/service.ts'
import { createSettingsRouter } from './routes/settings/router.ts'
import { PrismaPreferenceStore } from './models/settings/preference-store.ts'
import { PreferencesService } from './routes/settings/preferences-service.ts'
import { createPreferencesRouter } from './routes/settings/preferences-router.ts'
import { PrismaHotKeyStore } from './models/settings/hotkey-store.ts'
import { HotKeyService } from './routes/settings/hotkey-service.ts'
import { createHotKeyRouter } from './routes/settings/hotkey-router.ts'
import { PrismaCouponStore } from './models/coupon/prisma-store.ts'
import { CouponService } from './routes/coupon/service.ts'
import { createCouponRouter } from './routes/coupon/router.ts'
import { PrismaKitStore } from './models/kit/prisma-store.ts'
import { KitService } from './routes/kit/service.ts'
import { createKitRouter } from './routes/kit/router.ts'
import { PrismaStockAdjustmentStore } from './models/stock-adjustment/prisma-store.ts'
import { StockAdjustmentService } from './routes/stock-adjustment/service.ts'
import { createStockAdjustmentRouter } from './routes/stock-adjustment/router.ts'
import { PrismaTransferInStore } from './models/transfer-in/prisma-store.ts'
import { TransferInService } from './routes/transfer-in/service.ts'
import { createTransferInRouter } from './routes/transfer-in/router.ts'
import { PrismaTransferOutStore } from './models/transfer-out/prisma-store.ts'
import { TransferOutService } from './routes/transfer-out/service.ts'
import { createTransferOutRouter } from './routes/transfer-out/router.ts'
import { PrismaHappyHourStore } from './models/happy-hour/prisma-store.ts'
import { HappyHourService } from './routes/happy-hour/service.ts'
import { createHappyHourRouter } from './routes/happy-hour/router.ts'
import { PrismaDiscountStore } from './models/discount/group-store.ts'
import { DiscountService } from './routes/discount/service.ts'
import { createDiscountRouter } from './routes/discount/router.ts'
import { PrismaSalonStore } from './models/salon/appointment-store.ts'
import { SalonService } from './routes/salon/service.ts'
import { createSalonRouter } from './routes/salon/router.ts'
import { PrismaAdminStore } from './models/admin/prisma-store.ts'
import { AdminService } from './routes/admin/service.ts'
import { createAdminRouter } from './routes/admin/router.ts'
import { PrismaClientAdminStore } from './models/admin/client-store.ts'
import { ClientAdminService } from './routes/admin/clients-service.ts'
import { createClientAdminRouter } from './routes/admin/clients-router.ts'
import { PrismaKotStore } from './models/kot/prisma-store.ts'
import { KotService } from './routes/kot/service.ts'
import { createKotRouter } from './routes/kot/router.ts'
import { DiskBillFormatStorage } from './models/admin/bill-format-storage.ts'
import { PrismaBillingStore } from './models/billing/prisma-store.ts'
import { BillingService } from './routes/billing/service.ts'
import { createBillingRouter } from './routes/billing/router.ts'
import { PrismaKotAdvancedStore } from './models/kot/advanced-store.ts'
import { KotAdvancedService } from './routes/kot/advanced-service.ts'
import { createKotAdvancedRouter } from './routes/kot/advanced-router.ts'
import { PrismaIntegrationStore } from './models/integrations/prisma-store.ts'
import { CredentialVault } from './models/integrations/credential-vault.ts'
import { IntegrationService } from './routes/integrations/service.ts'
import { createIntegrationRouter } from './routes/integrations/router.ts'
import { createIntegrationAdminRouter } from './routes/admin/integrations-router.ts'
import { PrismaReportStore } from './models/reports/prisma-store.ts'
import { ReportService } from './routes/reports/service.ts'
import { createReportRouter } from './routes/reports/router.ts'

const config = loadConfig()
const databaseConfig = loadDatabaseConfig()
const database = databaseConfig ? createDatabase(databaseConfig) : undefined
const redisConfig = loadRedisConfig()
const redis = redisConfig ? await createRedis(redisConfig) : undefined
const cache = redis && redisConfig ? new RedisJsonCache(redis.client, redisConfig.keyPrefix) : undefined
const publicDirectory = resolve(process.env.UPLOAD_ROOT ?? 'public')
const credentialVault = process.env.INTEGRATION_CREDENTIALS_MASTER_KEY ? new CredentialVault(process.env.INTEGRATION_CREDENTIALS_MASTER_KEY) : undefined
const integrations = database ? new IntegrationService(new PrismaIntegrationStore(database.prisma), credentialVault) : undefined
const apiRouters = database ? (() => {
  const authConfig = loadAuthConfig()
  const resetConfig = loadResetConfig(authConfig.jwtSecret)
  const store = new PrismaAuthStore(database.prisma, authConfig.publicBaseUrl, cache, redisConfig?.profileTtlSeconds)
  const auth = new AuthService(store, authConfig)
  const account = new AccountService(new PrismaAccountStore(database.prisma, cache), Number(process.env.AUDIT_PAGE_SIZE ?? 25), new DiskLogoStorage(publicDirectory))
  const delivery = resetConfig.deliveryUrl ? new WebhookOtpDelivery(resetConfig.deliveryUrl, resetConfig.deliveryToken) : new UnavailableOtpDelivery()
  const resetStore = redis && redisConfig
    ? new RedisResetStore(database.prisma, redis.client, redisConfig.keyPrefix)
    : new PrismaResetStore(database.prisma)
  const reset = new ResetService(resetStore, delivery, resetConfig)
  const master = new MasterService(new PrismaMasterStore(database.prisma), store, Number(process.env.MASTER_PAGE_SIZE ?? 25))
  const access = new AccessService(new PrismaAccessStore(database.prisma), store)
  const expense = new ExpenseService(new PrismaExpenseStore(database.prisma), store, new CsvExpenseExportStorage(publicDirectory, authConfig.publicBaseUrl), Number(process.env.EXPENSE_PAGE_SIZE ?? 25), Number(process.env.EXPENSE_EXPORT_LIMIT ?? 10_000))
  const users = new UserService(new PrismaUserStore(database.prisma), store, Number(process.env.USER_PAGE_SIZE ?? 25))
  const workforce = new WorkforceService(new PrismaWorkforceStore(database.prisma), store, Number(process.env.WORKFORCE_PAGE_SIZE ?? 25))
  const productSearch = new ProductSearchService(new PrismaProductSearchStore(database.prisma), store, Number(process.env.PRODUCT_SEARCH_LIMIT ?? 100))
  const customers = new CustomerService(new PrismaCustomerStore(database.prisma), store, Number(process.env.CUSTOMER_PAGE_SIZE ?? 25))
  const products = new ProductService(new PrismaProductCatalogStore(database.prisma), store, new DiskProductSample(publicDirectory, authConfig.publicBaseUrl), new DiskProductImageStorage(publicDirectory), authConfig.publicBaseUrl, cache, Number(process.env.PRODUCT_CACHE_TTL_SECONDS ?? 60), Number(process.env.PRODUCT_PAGE_SIZE ?? 25), Number(process.env.PRODUCT_SCAN_LIMIT ?? 10_000), new PrismaProductImportStore(database.prisma), Number(process.env.PRODUCT_IMPORT_ROW_LIMIT ?? 5_000))
  const settings = new SettingsService(new PrismaSettingsStore(database.prisma), store)
  const preferences = new PreferencesService(new PrismaPreferenceStore(database.prisma), store)
  const hotKeys = new HotKeyService(new PrismaHotKeyStore(database.prisma), store, Number(process.env.SETTINGS_PAGE_SIZE ?? 25))
  const coupons = new CouponService(new PrismaCouponStore(database.prisma), store, Number(process.env.COUPON_PAGE_SIZE ?? 25))
  const kits = new KitService(new PrismaKitStore(database.prisma), store, Number(process.env.KIT_PRODUCT_LIMIT ?? 500))
  const stockAdjustments = new StockAdjustmentService(new PrismaStockAdjustmentStore(database.prisma), store, Number(process.env.STOCK_ADJUSTMENT_LIST_LIMIT ?? 500))
  const transferIn = new TransferInService(new PrismaTransferInStore(database.prisma), store, Number(process.env.TRANSFER_LIST_LIMIT ?? 500))
  const transferOut = new TransferOutService(new PrismaTransferOutStore(database.prisma), store, Number(process.env.TRANSFER_LIST_LIMIT ?? 500))
  const happyHours = new HappyHourService(new PrismaHappyHourStore(database.prisma), store, Number(process.env.HAPPY_HOUR_PAGE_SIZE ?? 25))
  const discounts = new DiscountService(new PrismaDiscountStore(database.prisma), store, Number(process.env.DISCOUNT_PAGE_SIZE ?? 25))
  const salon = new SalonService(new PrismaSalonStore(database.prisma), store, Number(process.env.SALON_RESULT_LIMIT ?? 500))
  const kot = new KotService(new PrismaKotStore(database.prisma), store, Number(process.env.KOT_RESULT_LIMIT ?? 500))
  const kotAdvanced = new KotAdvancedService(new PrismaKotAdvancedStore(database.prisma), store)
  const billing = new BillingService(new PrismaBillingStore(database.prisma), store)
  const reports = new ReportService(new PrismaReportStore(database.prisma), store, Number(process.env.REPORT_PAGE_SIZE ?? 25), Number(process.env.REPORT_SCAN_LIMIT ?? 50_000))
  return [createAuthRouter(auth), createAccountRouter(auth, account), createResetRouter(reset), createMasterRouter(auth, master), createAccessRouter(auth, access), createExpenseRouter(auth, expense), createUserRouter(auth, users), createWorkforceRouter(auth, workforce), createProductSearchRouter(auth, productSearch), createCustomerRouter(auth, customers), createProductRouter(auth, products), createSettingsRouter(auth, settings), createPreferencesRouter(auth, preferences), createHotKeyRouter(auth, hotKeys), createCouponRouter(auth, coupons), createKitRouter(auth, kits), createStockAdjustmentRouter(auth, stockAdjustments), createTransferInRouter(auth, transferIn), createTransferOutRouter(auth, transferOut), createHappyHourRouter(auth, happyHours), createDiscountRouter(auth, discounts), createSalonRouter(auth, salon), createKotRouter(auth, kot), createKotAdvancedRouter(auth, kotAdvanced), createBillingRouter(auth, billing), createReportRouter(auth, reports), createIntegrationRouter(auth, integrations!)]
})() : undefined
const webRouters = database ? (() => {
  const adminSecret = process.env.ADMIN_SESSION_SECRET ?? ''
  const adminPath = process.env.ADMIN_PATH ?? '/admin'
  const adminService = new AdminService(new PrismaAdminStore(database.prisma), Number(process.env.ADMIN_PAGE_SIZE ?? 25))
  const clientAdminService = new ClientAdminService(new PrismaClientAdminStore(database.prisma), Number(process.env.ADMIN_PAGE_SIZE ?? 25), new DiskLogoStorage(publicDirectory))
  return [createAdminRouter(adminService, adminSecret, adminPath, new DiskBillFormatStorage(publicDirectory)), createClientAdminRouter(adminService, clientAdminService, adminSecret, adminPath), createIntegrationAdminRouter(adminService, integrations!, adminSecret, adminPath)]
})() : undefined
const readiness = database ? { async check() { await database.check(); await redis?.check() } } : undefined
const server = createServer(createApp(readiness, apiRouters, publicDirectory, webRouters))

server.on('error', (error) => {
  console.error('ZenxPOS startup failed:', error.message)
  process.exitCode = 1
  void Promise.allSettled([database?.close(), redis?.close()]).then((results) => {
    if (results.some((result) => result.status === 'rejected')) process.exitCode = 1
  })
})

server.listen(config.port, config.host, () => {
  console.log(`ZenxPOS API listening on http://${config.host}:${config.port}`)
})

let stopping = false
function shutdown() {
  if (stopping) return
  stopping = true
  const timeout = setTimeout(() => process.exit(1), 10_000).unref()
  server.close(async (error) => {
    try { await Promise.all([database?.close(), redis?.close()]) } catch { process.exitCode = 1 }
    finally {
      clearTimeout(timeout)
      if (error) process.exitCode = 1
    }
  })
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
