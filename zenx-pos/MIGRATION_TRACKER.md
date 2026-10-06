# ZenxPOS migration tracker

Source: `dev/` (Laravel). Target: `zenx-pos/zenx-pos-backend/` (Node.js/TypeScript).
Baseline recorded: 2026-10-05. This is the single source of migration progress.

## Current checkpoint

- Stage 1 complete: inventory and HTTP foundation implemented and verified.
- All 11 Login API routes are implemented and behavior-tested; Stage 3 remains open for live database verification and distributed edge rate limiting.
- Stage 2 database implementation uses Prisma 7 with the MySQL/MariaDB driver adapter and verified TLS. Live TiDB verification is pending the connection URL.
- All 95 Laravel migration definitions have been translated to a draft Prisma schema: 99 models, 1,220 columns, 37 declared foreign keys (one unresolved). This is not a deployed or live-verified schema.
- Other business endpoints, data transfer, schema deployment and frontend conversion remain pending.
- Existing product-label-printing app and its deployment remain separate.

## Delivery sequence

| Step | Scope | Status | Completion gate |
| --- | --- | --- | --- |
| 1 | Source inventory, folder conventions, TypeScript/Express foundation | VERIFIED | TypeScript build passed; 5 tests passed; inventory and folder-size checks passed |
| 2 | Database connection, schema compatibility, test database and transaction helpers | IN_PROGRESS | Prisma schema/client and offline tests pass; awaiting URL, live schema reconciliation, and separate test-database commit/rollback tests |
| 3 | Login, JWT, reset flow, profiles, client isolation, roles and permissions | IN_PROGRESS | Auth success/failure and cross-client denial checks |
| 4 | Master data, customers, employees, products and variants, uploads | PENDING | CRUD, filtering, validation and import parity |
| 5 | Settings, discounts, coupons and happy hours | PENDING | Configuration and promotion calculation checks |
| 6 | Transfers, stock adjustments and kits | PENDING | Stock balance and transaction rollback checks |
| 7 | Retail billing, refunds, receipts and day closing | PENDING | Totals, tax, payments, stock and concurrent bill checks |
| 8 | Restaurant reservations, tables, KOT and billing | PENDING | Order lifecycle, table state and billing checks |
| 9 | Salon appointments, services and billing | PENDING | Scheduling, employee assignment and billing checks |
| 10 | Admin routes, sessions and frontend templates | PENDING | Screen and role parity with the Blade admin panel |
| 11 | Remaining helpers/assets, runtime configuration, deployment and cutover | PENDING | Full regression, deployment rehearsal and rollback procedure |

## Working agreement

- Preserve the three folders: routes, middlewares, models. Use domain subfolders; at most 10 direct first-party files per folder.
- Preserve legacy endpoint paths and request/response contracts unless a change is explicitly documented here.
- Port client_id filtering, status/trash handling, monetary rules, audit records, and transaction behavior with each feature.
- Record implementation targets and tests per endpoint. Controller/schema/template rows track their separate migration or replacement work.
- Statuses: PENDING, IN_PROGRESS, IMPLEMENTED, VERIFIED, REPLACED, RETIRED, REVIEW.
- VERIFIED means implementation plus passing relevant behavior checks. REPLACED and RETIRED require documented rationale/evidence and do not count as literal conversions.
- Existing insecure behavior (for example admin MD5 passwords or returning reset OTPs) needs a documented replacement plan, not blind duplication.
- Maintain original Laravel code as a reference. No production database changes or deployment in the foundation stage.

## Frontend scope

There are 33 Blade templates: 27 admin pages, 5 shared admin includes, and the Laravel welcome template.
Admin pages cover login, dashboard, password change, clients/contracts/collections, admins, business types, features/subfeatures, key mappings, bill columns, coupon usage types, and bill formats.
The customer-facing retail/restaurant/salon POS UI is not present as a React application in this source.
The Node API conversion does not itself convert Blade templates; Step 10 owns their replacement, with the frontend framework to be selected before that step.

## Inventory boundaries and refresh

The inventory covers explicit API/admin routes and first-party source/static assets. It excludes .git, vendor/node_modules, runtime storage/cache, actual .env secrets, uploaded customer files, dependency lockfiles, and the SQLite database contents.
Those excluded runtime/dependency items still need a deployment/data-transfer plan in Step 11; they are not PHP-to-Node conversion units.
The legacy example environment file is fingerprinted, never copied into the Node environment.
Run npm run migration:refresh to rescan. Run npm run migration:check to verify coverage without writing.
New source becomes PENDING; removed source remains visible; completed work affected by source changes becomes REVIEW.

## Decisions and verification log

- 2026-10-05: Node.js with TypeScript and Express; reuse user-created routes/middlewares/models structure. Runtime development uses Node native TypeScript support; production uses compiled JavaScript.
- 2026-10-05: Baseline is static source inventory, not an assertion that the Laravel app works end to end.
- 2026-10-05: Foundation uses port 5100 so it can coexist with the existing label backend. /up and /api/health are liveness only.
- 2026-10-05: `npm run build` passed. `npm test` passed all 5 tests (HTTP behavior, config validation, tracker route parsing, progress preservation/source drift, and folder limits). `npm run migration:check` passed with 650 items. No database or PHP runtime was required or exercised.
- 2026-10-05: Confirmed the Laravel environment selects local MySQL on port 3306. Selected TiDB-compatible MySQL through Prisma at the user's request. Runtime code uses model methods and Prisma transactions, without application raw SQL.
- 2026-10-05: `models/database/schema/schema.prisma` translates all migration up() definitions. `compatibility.json` maps each source fingerprint and its affected tables. Prisma validation/client generation and the TypeScript build pass. Schema rows remain IMPLEMENTED or REVIEW, not VERIFIED, until a live comparison and database behavior tests pass.
- 2026-10-05: Added strict TLS URL configuration, a bounded connection pool, transaction helper without automatic retries, database readiness, a read-only connection check, and an opt-in separate test-database integration suite. No database URL is configured and no live schema/data changes have run.
- 2026-10-05: Stage 2 offline verification passed: Prisma validate/client generation, TypeScript production build, 12 tests, source/schema drift checks, and the 10-file folder limit. Live connection, real commit/rollback, and schema/data parity remain unverified until DATABASE_URL and a separate test target are supplied.
- 2026-10-05: Stage 3 first slice verified: POST /api/login, POST /api/changePassword, GET /api/getProfile, and GET /api/getPermission. The build and 16 offline tests pass, covering Laravel bcrypt compatibility, strict JWT verification, active-contract checks, tenant-bound identity, permissions, audits, and password-change token revocation.
- 2026-10-05: Authentication intentionally replaces user-enumerating login errors with one credential error and raises the password minimum from 6 to 8 characters. The legacy reset flow remains pending because it exposes the OTP in the API, has no expiry/attempt controls, and has no delivery provider.
- 2026-10-06: Stage 3 authenticated account slice verified: updateProfile, getAuditReports, updateBillFormat, and getBillFormatId. Profile/logo writes are validated and transactional; audit results are bounded; bill formats must be active and match the client's business type. The build and 21 tests pass.
- 2026-10-06: npm production audit reports six transitive advisories in Prisma configuration/mysql2 and the Prisma MariaDB adapter. The offered force fix is a breaking Prisma 7 to 6 downgrade, and the MariaDB advisories have no available adapter fix. Keep strict TLS and utf8mb4, do not use unsafe raw SQL, and reassess adapter versions before deployment.
- 2026-10-06: Added `Vulnerabilities.md` as the legacy security register. It records confirmed source evidence, attack paths, potential breach impact, and the Node resolution status. New confirmed findings must be added during each conversion slice.
- 2026-10-06: Completed the Login controller conversion with secure forgotPassword, verifyOtp, and resetPassword replacements. Challenges use HMAC-only values in the configured challenge store, six-digit OTPs expire, five failed attempts consume the challenge, verified OTPs issue short-lived one-time reset tokens, and successful password updates are audited. The initial slice passed 25 tests before Redis integration.
- 2026-10-06: Added optional Redis infrastructure using the official node-redis client. Redis stores OTP challenges when configured, profile reads use cache-aside with write invalidation, and tenant/version-scoped product cache primitives are ready for Step 4. Remote Redis URLs require TLS. TiDB remains authoritative; stock, totals, permissions, and contracts are never served from this response cache.
- Next checkpoint: Begin Step 4 master-data endpoints while live TiDB reconciliation remains pending DATABASE_URL and DATABASE_TEST_URL. Configure the approved OTP provider through OTP_DELIVERY_URL before reset delivery can operate outside tests.

## Current database limitations and decisions

- **Unresolved source FK:** table_reservations.client_id references `clients`, but no migration creates that table. Other client-business references use `users`. The generated schema keeps the scalar client_id and records the missing relation, without inventing a replacement. Confirm against the actual database before schema deployment.
- **Numeric precision:** 25 legacy DOUBLE fields include prices, totals, quantities and percentages. Laravel 12 ignores the extra precision arguments to double(); the Prisma draft preserves DOUBLE. Existing DECIMAL fields retain their precision/scale. Converting DOUBLE money to Decimal requires a reviewed data migration.
- **Schema limits:** Prisma does not encode legacy column comments, physical AFTER ordering, or the database collation. Preserve utf8mb4_unicode_ci when preparing DDL. Legacy down() methods have not been converted to rollback scripts. The source migrations may differ from the actual database.
- **TiDB differences:** Check foreign keys, locking/isolation and auto-increment assumptions against the target version. No support for stored procedures/triggers is assumed. No such constructs were found in the migration up() definitions. Multi-row billing/stock concurrency still needs feature-level tests.
- **Prisma limits:** Parameterized model queries protect values against SQL injection; authorization, input validation, tenant client_id filtering and safe field selection remain application responsibilities. Unsafe raw-query APIs are not used. BigInt IDs and Decimal values require deliberate API serialization.
- **Free plan (checked 2026-10-05):** TiDB Starter includes 5 GiB row storage, 5 GiB columnar storage and 50 million RUs/month for qualifying instances. RUs are resource usage, not a simple query count. Free compute is limited (256 MiB per query); reaching quota can deny new connections. Increasing capacity requires paid usage/spending configuration.
- References: [TiDB Starter limits](https://docs.pingcap.com/tidbcloud/serverless-faqs/), [MySQL compatibility](https://docs.pingcap.com/tidb/stable/mysql-compatibility/), [Prisma MySQL adapter](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/mysql), [SQL injection guidance](https://www.prisma.io/docs/orm/v7/prisma-client/using-raw-sql/raw-queries).

<!-- inventory:start -->
## Conversion counts

Counts below are independent work inventories; do not add routes and their source files to claim a conversion percentage.
Admin routes expand GET/POST matches into separate endpoints. Templates include shared layouts and the Laravel welcome page.

| Area | Total | Verified conversions | Implemented, unverified | In progress/review | Replaced/retired | Not started |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| API/Access_levels | 2 | 0 | 0 | 0 | 0 | 2 |
| API/Billing | 29 | 0 | 0 | 0 | 0 | 29 |
| API/Coupons | 5 | 0 | 0 | 0 | 0 | 5 |
| API/Customers | 4 | 0 | 0 | 0 | 0 | 4 |
| API/Discounts | 20 | 0 | 0 | 0 | 0 | 20 |
| API/Happy_hours | 10 | 0 | 0 | 0 | 0 | 10 |
| API/Kit | 5 | 0 | 0 | 0 | 0 | 5 |
| API/Kot | 36 | 0 | 0 | 0 | 0 | 36 |
| API/Login | 11 | 11 | 0 | 0 | 0 | 0 |
| API/Master | 79 | 0 | 0 | 0 | 0 | 79 |
| API/Products | 9 | 0 | 0 | 0 | 0 | 9 |
| API/Salon_appointments | 7 | 0 | 0 | 0 | 0 | 7 |
| API/Settings | 18 | 0 | 0 | 0 | 0 | 18 |
| API/Stock_adjustment | 5 | 0 | 0 | 0 | 0 | 5 |
| API/Transfer_in | 6 | 0 | 0 | 0 | 0 | 6 |
| API/Transfer_out | 6 | 0 | 0 | 0 | 0 | 6 |
| Admin route/Admins | 8 | 0 | 0 | 0 | 0 | 8 |
| Admin route/BillFormats | 8 | 0 | 0 | 0 | 0 | 8 |
| Admin route/Bill_columns | 8 | 0 | 0 | 0 | 0 | 8 |
| Admin route/BusinessTypes | 8 | 0 | 0 | 0 | 0 | 8 |
| Admin route/Clients | 18 | 0 | 0 | 0 | 0 | 18 |
| Admin route/Coupon_usage_types | 8 | 0 | 0 | 0 | 0 | 8 |
| Admin route/Features | 8 | 0 | 0 | 0 | 0 | 8 |
| Admin route/Key_mappings | 8 | 0 | 0 | 0 | 0 | 8 |
| Admin route/Login | 4 | 0 | 0 | 0 | 0 | 4 |
| Admin route/Password | 2 | 0 | 0 | 0 | 0 | 2 |
| Admin route/Sub_features | 8 | 0 | 0 | 0 | 0 | 8 |
| Controller | 28 | 1 | 0 | 0 | 0 | 27 |
| Legacy test | 3 | 0 | 0 | 0 | 0 | 3 |
| Model | 93 | 0 | 0 | 1 | 0 | 92 |
| Public asset | 16 | 0 | 0 | 0 | 0 | 16 |
| Schema | 95 | 0 | 94 | 1 | 0 | 0 |
| Supporting source | 42 | 0 | 0 | 0 | 2 | 40 |
| Template | 33 | 0 | 0 | 0 | 0 | 33 |

## Complete inventory

Edit Target, Status, and Evidence here, then run `npm run migration:refresh` in the backend.
Evidence must name the checks and their result. Use no literal pipe characters inside cells.
Fingerprints detect source changes; changed work already started returns to REVIEW.

| ID | Kind | Source | Target | Status | Evidence | Fingerprint | Source state |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `api:POST:/api/login` | API/Login | dev/routes/api.php:23 → Login.login | zenx-pos-backend/routes/auth/router.ts and service.ts | VERIFIED | npm run build and npm test passed; credential, bcrypt, contract, permissions and audit cases | 049dda9401de9011 | active |
| `api:POST:/api/forgotPassword` | API/Login | dev/routes/api.php:24 → Login.forgotPassword | zenx-pos-backend/routes/reset/router.ts and service.ts | VERIFIED | npm run build and npm test passed; generic response, HMAC challenge, delivery and resend cooldown cases | 8f42641f76340008 | active |
| `api:POST:/api/verifyOtp` | API/Login | dev/routes/api.php:25 → Login.verifyOtp | zenx-pos-backend/routes/reset/router.ts and service.ts | VERIFIED | npm run build and npm test passed; expiry, bounded attempts, constant-time match and one-time token cases | cec8d885fe666a08 | active |
| `api:POST:/api/resetPassword` | API/Login | dev/routes/api.php:26 → Login.resetPassword | zenx-pos-backend/routes/reset/router.ts and models/reset/prisma-store.ts | VERIFIED | npm run build and npm test passed; verified token, transaction, bcrypt, audit and replay-denial cases | 2e3f327f5636683e | active |
| `api:POST:/api/changePassword` | API/Login | dev/routes/api.php:29 → Login.changePassword | zenx-pos-backend/routes/auth/router.ts and models/auth/prisma-store.ts | VERIFIED | npm run build and npm test passed; validation, transaction, audit and token revocation cases | eb45eb668b138b4f | active |
| `api:GET:/api/getProfile` | API/Login | dev/routes/api.php:31 → Login.getProfile | zenx-pos-backend/routes/auth/router.ts and models/auth/prisma-store.ts | VERIFIED | npm run build and npm test passed; authenticated tenant profile case | 07a5771ec43f2638 | active |
| `api:GET:/api/getPermission` | API/Login | dev/routes/api.php:32 → Login.getPermission | zenx-pos-backend/routes/auth/router.ts and models/auth/prisma-store.ts | VERIFIED | npm run build and npm test passed; ordered grouped permissions and no-access cases | 7bc188c8f1bad777 | active |
| `api:POST:/api/updateProfile` | API/Login | dev/routes/api.php:34 → Login.updateProfile | zenx-pos-backend/routes/account/router.ts and models/account | VERIFIED | npm run build and npm test passed; validation, tenant transaction, logo signature, cleanup and audit cases | e19633e02071e887 | active |
| `api:POST:/api/getAuditReports` | API/Login | dev/routes/api.php:35 → Login.getAuditReports | zenx-pos-backend/routes/account/router.ts and models/account/prisma-store.ts | VERIFIED | npm run build and npm test passed; tenant, filters, IST formatting and bounded pagination cases | 0da8b721a8602439 | active |
| `api:POST:/api/updateBillFormat` | API/Login | dev/routes/api.php:36 → Login.updateBillFormat | zenx-pos-backend/routes/account/router.ts and models/account/prisma-store.ts | VERIFIED | npm run build and npm test passed; active business-type format, settings, transaction and audit cases | 373dd4dddf5e681e | active |
| `api:GET:/api/getBillFormatId` | API/Login | dev/routes/api.php:37 → Login.getBillFormatId | zenx-pos-backend/routes/account/router.ts and models/account/prisma-store.ts | VERIFIED | npm run build and npm test passed; tenant setting and missing format cases | fc1c2c38cbd4dddc | active |
| `api:GET:/api/features` | API/Master | dev/routes/api.php:40 → Master.getFeatures | - | PENDING | - | fd5e0984997dafbd | active |
| `api:POST:/api/addCategory` | API/Master | dev/routes/api.php:42 → Master.addCategory | - | PENDING | - | 6e2877f958a8493b | active |
| `api:POST:/api/updateCategory` | API/Master | dev/routes/api.php:43 → Master.updateCategory | - | PENDING | - | e3e8aaf4ff735e5a | active |
| `api:POST:/api/getCategories` | API/Master | dev/routes/api.php:44 → Master.getCategories | - | PENDING | - | f60f99fff1dccc53 | active |
| `api:POST:/api/getCategoryById` | API/Master | dev/routes/api.php:45 → Master.getCategoryById | - | PENDING | - | 7ae229497050171b | active |
| `api:POST:/api/addSubCategory` | API/Master | dev/routes/api.php:47 → Master.addSubCategory | - | PENDING | - | b687bc692923ac7e | active |
| `api:POST:/api/updateSubCategory` | API/Master | dev/routes/api.php:48 → Master.updateSubCategory | - | PENDING | - | 478ed20bc4d53d2f | active |
| `api:POST:/api/getSubCategories` | API/Master | dev/routes/api.php:49 → Master.getSubCategories | - | PENDING | - | 8a7e2e5740b68da7 | active |
| `api:POST:/api/getSubCategoryById` | API/Master | dev/routes/api.php:50 → Master.getSubCategoryById | - | PENDING | - | 6de340bee906aba4 | active |
| `api:POST:/api/addBrand` | API/Master | dev/routes/api.php:52 → Master.addBrand | - | PENDING | - | aab2dde40e57f3d8 | active |
| `api:POST:/api/updateBrand` | API/Master | dev/routes/api.php:53 → Master.updateBrand | - | PENDING | - | 88869655b617ec10 | active |
| `api:POST:/api/getBrands` | API/Master | dev/routes/api.php:54 → Master.getBrands | - | PENDING | - | 8fbd7b0a61b7f453 | active |
| `api:POST:/api/getBrandById` | API/Master | dev/routes/api.php:55 → Master.getBrandById | - | PENDING | - | d6f4383b0fbfd214 | active |
| `api:POST:/api/addSize` | API/Master | dev/routes/api.php:57 → Master.addSize | - | PENDING | - | 792751ed57a411e5 | active |
| `api:POST:/api/updateSize` | API/Master | dev/routes/api.php:58 → Master.updateSize | - | PENDING | - | 5df879aa8414b2f4 | active |
| `api:POST:/api/getSizes` | API/Master | dev/routes/api.php:59 → Master.getSizes | - | PENDING | - | 6b869a623ecf5287 | active |
| `api:POST:/api/getSizeById` | API/Master | dev/routes/api.php:60 → Master.getSizeById | - | PENDING | - | b1916bcb8eaf48b9 | active |
| `api:POST:/api/addColour` | API/Master | dev/routes/api.php:62 → Master.addColour | - | PENDING | - | 2b76935c09682b04 | active |
| `api:POST:/api/updateColour` | API/Master | dev/routes/api.php:63 → Master.updateColour | - | PENDING | - | e98205410bc2f08a | active |
| `api:POST:/api/getColours` | API/Master | dev/routes/api.php:64 → Master.getColours | - | PENDING | - | 50cd485f5a4ab306 | active |
| `api:POST:/api/getColourById` | API/Master | dev/routes/api.php:65 → Master.getColourById | - | PENDING | - | 60fca37ae8cc9e2b | active |
| `api:POST:/api/addUnitType` | API/Master | dev/routes/api.php:67 → Master.addUnitType | - | PENDING | - | ec7bb7a006802e76 | active |
| `api:POST:/api/updateUnitType` | API/Master | dev/routes/api.php:68 → Master.updateUnitType | - | PENDING | - | 92f924b9200440ed | active |
| `api:POST:/api/getUnitTypes` | API/Master | dev/routes/api.php:69 → Master.getUnitTypes | - | PENDING | - | ce1c1cf94f04d1c0 | active |
| `api:POST:/api/getUnitTypeById` | API/Master | dev/routes/api.php:70 → Master.getUnitTypeById | - | PENDING | - | b7586114d5c244c0 | active |
| `api:POST:/api/addTeam` | API/Master | dev/routes/api.php:72 → Master.addTeam | - | PENDING | - | ce296abc9913be3f | active |
| `api:POST:/api/updateTeam` | API/Master | dev/routes/api.php:73 → Master.updateTeam | - | PENDING | - | 4ed2f99a9fbb757f | active |
| `api:POST:/api/getTeams` | API/Master | dev/routes/api.php:74 → Master.getTeams | - | PENDING | - | c8614b24914e2fd9 | active |
| `api:POST:/api/getTeamById` | API/Master | dev/routes/api.php:75 → Master.getTeamById | - | PENDING | - | 11c80d1d03485a6f | active |
| `api:POST:/api/addPaymentMode` | API/Master | dev/routes/api.php:77 → Master.addPaymentMode | - | PENDING | - | be5d290003974e3f | active |
| `api:POST:/api/updatePaymentMode` | API/Master | dev/routes/api.php:78 → Master.updatePaymentMode | - | PENDING | - | f8370741d8505706 | active |
| `api:POST:/api/getPaymentModes` | API/Master | dev/routes/api.php:79 → Master.getPaymentModes | - | PENDING | - | 96574ffcff7f8412 | active |
| `api:POST:/api/getPaymentModeById` | API/Master | dev/routes/api.php:80 → Master.getPaymentModeById | - | PENDING | - | d39b9885d914e922 | active |
| `api:POST:/api/addTax` | API/Master | dev/routes/api.php:82 → Master.addTax | - | PENDING | - | d1dd808ca6822b23 | active |
| `api:POST:/api/updateTax` | API/Master | dev/routes/api.php:83 → Master.updateTax | - | PENDING | - | f2a15cb5ee3c4505 | active |
| `api:POST:/api/getTaxes` | API/Master | dev/routes/api.php:84 → Master.getTaxes | - | PENDING | - | 4fd1c20fbf74777c | active |
| `api:POST:/api/getTaxById` | API/Master | dev/routes/api.php:85 → Master.getTaxById | - | PENDING | - | 577a2320e6e34908 | active |
| `api:POST:/api/addSalesMan` | API/Master | dev/routes/api.php:87 → Master.addSalesMan | - | PENDING | - | a8c83f31249f1f03 | active |
| `api:POST:/api/updateSalesMan` | API/Master | dev/routes/api.php:88 → Master.updateSalesMan | - | PENDING | - | 46402329dcb816b9 | active |
| `api:POST:/api/getSalesMans` | API/Master | dev/routes/api.php:89 → Master.getSalesMans | - | PENDING | - | 0fe037f3558e80f7 | active |
| `api:POST:/api/getSalesManById` | API/Master | dev/routes/api.php:90 → Master.getSalesManById | - | PENDING | - | f5ce286e04008b97 | active |
| `api:POST:/api/addCustomer` | API/Customers | dev/routes/api.php:92 → Customers.addCustomer | - | PENDING | - | 1ae67acd36b0da60 | active |
| `api:POST:/api/updateCustomer` | API/Customers | dev/routes/api.php:93 → Customers.updateCustomer | - | PENDING | - | fac34188296addd1 | active |
| `api:POST:/api/getCustomers` | API/Customers | dev/routes/api.php:94 → Customers.getCustomers | - | PENDING | - | 586b97cb3f539df4 | active |
| `api:POST:/api/getCustomerById` | API/Customers | dev/routes/api.php:95 → Customers.getCustomerById | - | PENDING | - | 3214d9ac95b1fdbe | active |
| `api:POST:/api/addFloor` | API/Master | dev/routes/api.php:97 → Master.addFloor | - | PENDING | - | 1508eaed87486e94 | active |
| `api:POST:/api/updateFloor` | API/Master | dev/routes/api.php:98 → Master.updateFloor | - | PENDING | - | bd2151b672661e2f | active |
| `api:POST:/api/getFloors` | API/Master | dev/routes/api.php:99 → Master.getFloors | - | PENDING | - | 179ae2d97fdcb7f2 | active |
| `api:POST:/api/getFloorById` | API/Master | dev/routes/api.php:100 → Master.getFloorById | - | PENDING | - | cffe216606a96fbc | active |
| `api:POST:/api/addTableType` | API/Master | dev/routes/api.php:102 → Master.addTableType | - | PENDING | - | b98a6902eb780cf4 | active |
| `api:POST:/api/updateTableType` | API/Master | dev/routes/api.php:103 → Master.updateTableType | - | PENDING | - | 8595dbf2cf94ec34 | active |
| `api:POST:/api/getTableTypes` | API/Master | dev/routes/api.php:104 → Master.getTableTypes | - | PENDING | - | ed2175e0f620c9a0 | active |
| `api:POST:/api/getTableTypeById` | API/Master | dev/routes/api.php:105 → Master.getTableTypeById | - | PENDING | - | d734adb522cbe086 | active |
| `api:POST:/api/addTable` | API/Master | dev/routes/api.php:107 → Master.addTable | - | PENDING | - | 3e25567ecaadc795 | active |
| `api:POST:/api/updateTable` | API/Master | dev/routes/api.php:108 → Master.updateTable | - | PENDING | - | 1f062394466f255b | active |
| `api:POST:/api/getTables` | API/Master | dev/routes/api.php:109 → Master.getTables | - | PENDING | - | 69820f2f2f077c8e | active |
| `api:POST:/api/getTableById` | API/Master | dev/routes/api.php:110 → Master.getTableById | - | PENDING | - | 5ea5587419eac049 | active |
| `api:POST:/api/addRole` | API/Master | dev/routes/api.php:112 → Master.addRole | - | PENDING | - | 98c6763ff86ec601 | active |
| `api:POST:/api/updateRole` | API/Master | dev/routes/api.php:113 → Master.updateRole | - | PENDING | - | 2e2555ec5b5e6d95 | active |
| `api:POST:/api/getRoles` | API/Master | dev/routes/api.php:114 → Master.getRoles | - | PENDING | - | 6ce0caa4d848ac37 | active |
| `api:POST:/api/getRoleById` | API/Master | dev/routes/api.php:115 → Master.getRoleById | - | PENDING | - | 66f2f42406f6a0e2 | active |
| `api:POST:/api/addProduct` | API/Products | dev/routes/api.php:117 → Products.addProduct | - | PENDING | - | f1caea3f0017f707 | active |
| `api:POST:/api/getProducts` | API/Products | dev/routes/api.php:118 → Products.getProducts | - | PENDING | - | 42cf8c38a8f3bf0c | active |
| `api:POST:/api/getProductById` | API/Products | dev/routes/api.php:119 → Products.getProductById | - | PENDING | - | d83f9872900e5bcb | active |
| `api:POST:/api/addVariant` | API/Products | dev/routes/api.php:120 → Products.addVariant | - | PENDING | - | 2bebed97e3555512 | active |
| `api:POST:/api/updateProduct` | API/Products | dev/routes/api.php:121 → Products.updateProduct | - | PENDING | - | 463749060ccc6b41 | active |
| `api:POST:/api/updateProductVariant` | API/Products | dev/routes/api.php:122 → Products.updateProductVariant | - | PENDING | - | 435865299b331a92 | active |
| `api:POST:/api/updateProductControls` | API/Products | dev/routes/api.php:123 → Products.updateProductControls | - | PENDING | - | 17e6e86d80520a53 | active |
| `api:POST:/api/productsBulkUpload` | API/Products | dev/routes/api.php:124 → Products.productsBulkUpload | - | PENDING | - | 33036c0d2828fb21 | active |
| `api:GET:/api/getProductSampleFile` | API/Products | dev/routes/api.php:125 → Products.getProductSampleFile | - | PENDING | - | c4196072a9b7869f | active |
| `api:POST:/api/addExpenseHead` | API/Master | dev/routes/api.php:128 → Master.addExpenseHead | - | PENDING | - | 1e19cf1355c16a6c | active |
| `api:POST:/api/updateExpenseHead` | API/Master | dev/routes/api.php:129 → Master.updateExpenseHead | - | PENDING | - | df02060e92e4376e | active |
| `api:POST:/api/getExpenseHeads` | API/Master | dev/routes/api.php:130 → Master.getExpenseHeads | - | PENDING | - | 7cf69a6b87cf3c39 | active |
| `api:POST:/api/getExpenseHeadById` | API/Master | dev/routes/api.php:131 → Master.getExpenseHeadById | - | PENDING | - | d602ba14d0a31e0e | active |
| `api:POST:/api/addExpense` | API/Master | dev/routes/api.php:133 → Master.addExpense | - | PENDING | - | 43e685546ed488d8 | active |
| `api:POST:/api/cancelExpense` | API/Master | dev/routes/api.php:134 → Master.cancelExpense | - | PENDING | - | 56a00a2165c97583 | active |
| `api:POST:/api/getExpenses` | API/Master | dev/routes/api.php:135 → Master.getExpenses | - | PENDING | - | 581e35c4b11cf620 | active |
| `api:POST:/api/getExpenseById` | API/Master | dev/routes/api.php:136 → Master.getExpenseById | - | PENDING | - | 8b8e9620f3c7b69d | active |
| `api:POST:/api/exportExpenses` | API/Master | dev/routes/api.php:137 → Master.exportExpenses | - | PENDING | - | e1f9dc4b246e57c8 | active |
| `api:POST:/api/addUser` | API/Master | dev/routes/api.php:140 → Master.addUser | - | PENDING | - | da2b290d5b68fec3 | active |
| `api:POST:/api/updateUser` | API/Master | dev/routes/api.php:141 → Master.updateUser | - | PENDING | - | bb9dba1749b5d234 | active |
| `api:POST:/api/getUsers` | API/Master | dev/routes/api.php:142 → Master.getUsers | - | PENDING | - | 9d34f499b00e8158 | active |
| `api:POST:/api/getUserById` | API/Master | dev/routes/api.php:143 → Master.getUserById | - | PENDING | - | b1cc44129cc588e3 | active |
| `api:POST:/api/getRoleAccessLevels` | API/Access_levels | dev/routes/api.php:145 → Access_levels.getRoleAccessLevels | - | PENDING | - | a1469232d20da7c7 | active |
| `api:POST:/api/saveRoleAccessLevels` | API/Access_levels | dev/routes/api.php:146 → Access_levels.saveRoleAccessLevels | - | PENDING | - | a8efed3d7f2e149d | active |
| `api:GET:/api/getHardwareSettings` | API/Settings | dev/routes/api.php:148 → Settings.getHardwareSettings | - | PENDING | - | 212c2d6663c1fa17 | active |
| `api:POST:/api/addHardwareSettings` | API/Settings | dev/routes/api.php:149 → Settings.addHardwareSettings | - | PENDING | - | c03f8acaf9193b1f | active |
| `api:GET:/api/getBillingSettings` | API/Settings | dev/routes/api.php:151 → Settings.getBillingSettings | - | PENDING | - | 763c85a38c6167a7 | active |
| `api:POST:/api/addBillingSettings` | API/Settings | dev/routes/api.php:152 → Settings.addBillingSettings | - | PENDING | - | 41fb5e558f2306a2 | active |
| `api:POST:/api/deleteBillingDescription` | API/Settings | dev/routes/api.php:153 → Settings.deleteBillingDescription | - | PENDING | - | 4d7fce626b9dfadc | active |
| `api:GET:/api/getKotSettings` | API/Settings | dev/routes/api.php:155 → Settings.getKotSettings | - | PENDING | - | 4ed21f2745e28907 | active |
| `api:POST:/api/addKotSettings` | API/Settings | dev/routes/api.php:156 → Settings.addKotSettings | - | PENDING | - | 6cb406e76bde79f8 | active |
| `api:POST:/api/deleteKotDescription` | API/Settings | dev/routes/api.php:157 → Settings.deleteKotDescription | - | PENDING | - | 4396d99a519da08b | active |
| `api:POST:/api/searchProducts` | API/Master | dev/routes/api.php:159 → Master.searchProducts | - | PENDING | - | 3988530a6e3f6b79 | active |
| `api:POST:/api/addHotKey` | API/Settings | dev/routes/api.php:161 → Settings.addHotKey | - | PENDING | - | 46dfe75fc477de7c | active |
| `api:POST:/api/updateHotKey` | API/Settings | dev/routes/api.php:162 → Settings.updateHotKey | - | PENDING | - | f7a7511eb2baad1e | active |
| `api:POST:/api/getHotKeys` | API/Settings | dev/routes/api.php:163 → Settings.getHotKeys | - | PENDING | - | 01302c8825fcb85f | active |
| `api:POST:/api/getHotKeyById` | API/Settings | dev/routes/api.php:164 → Settings.getHotKeyById | - | PENDING | - | a0d0f449ec2d7469 | active |
| `api:POST:/api/addKeyMapping` | API/Settings | dev/routes/api.php:166 → Settings.addKeyMapping | - | PENDING | - | e012e6c92bd3a047 | active |
| `api:GET:/api/getKeyMappings` | API/Settings | dev/routes/api.php:167 → Settings.getKeyMappings | - | PENDING | - | 0d685c5a476afa1c | active |
| `api:GET:/api/defaultKeyMapping` | API/Settings | dev/routes/api.php:168 → Settings.defaultKeyMapping | - | PENDING | - | 139afd23dfbb3d28 | active |
| `api:POST:/api/addBillCol` | API/Settings | dev/routes/api.php:170 → Settings.addBillCol | - | PENDING | - | 61990c66a438eb79 | active |
| `api:GET:/api/getBillCols` | API/Settings | dev/routes/api.php:171 → Settings.getBillCols | - | PENDING | - | 0beea54433febb49 | active |
| `api:GET:/api/defaultBillCols` | API/Settings | dev/routes/api.php:172 → Settings.defaultBillCols | - | PENDING | - | 4066a9c32cf97913 | active |
| `api:POST:/api/addGroupWiseDiscount` | API/Discounts | dev/routes/api.php:174 → Discounts.addGroupWiseDiscount | - | PENDING | - | 10c5ce4297a6cf34 | active |
| `api:POST:/api/updateGroupWiseDiscount` | API/Discounts | dev/routes/api.php:175 → Discounts.updateGroupWiseDiscount | - | PENDING | - | 3a8ee1de7d7a4fbd | active |
| `api:POST:/api/getGroupWiseDiscounts` | API/Discounts | dev/routes/api.php:176 → Discounts.getGroupWiseDiscounts | - | PENDING | - | 6a108295395f16e1 | active |
| `api:POST:/api/getGroupWiseDiscountById` | API/Discounts | dev/routes/api.php:177 → Discounts.getGroupWiseDiscountById | - | PENDING | - | 3fab8fd3e12a0427 | active |
| `api:POST:/api/addItemWiseDiscount` | API/Discounts | dev/routes/api.php:179 → Discounts.addItemWiseDiscount | - | PENDING | - | 4aa04b1a3d3f6e5b | active |
| `api:POST:/api/searchItemWiseDiscount` | API/Discounts | dev/routes/api.php:180 → Discounts.searchItemWiseDiscount | - | PENDING | - | c78ba8b5fb3e6347 | active |
| `api:POST:/api/updateItemWiseDiscount` | API/Discounts | dev/routes/api.php:181 → Discounts.updateItemWiseDiscount | - | PENDING | - | 3f4abb75a89b8c5b | active |
| `api:POST:/api/getItemWiseDiscounts` | API/Discounts | dev/routes/api.php:182 → Discounts.getItemWiseDiscounts | - | PENDING | - | 75b28197658603ea | active |
| `api:POST:/api/getItemWiseDiscountById` | API/Discounts | dev/routes/api.php:183 → Discounts.getItemWiseDiscountById | - | PENDING | - | acbad32f90de64cb | active |
| `api:POST:/api/addPurchaseWiseDiscount` | API/Discounts | dev/routes/api.php:185 → Discounts.addPurchaseWiseDiscount | - | PENDING | - | c16aba9e7fafdb06 | active |
| `api:POST:/api/searchPurchaseWiseDiscount` | API/Discounts | dev/routes/api.php:186 → Discounts.searchPurchaseWiseDiscount | - | PENDING | - | 9d85e937bc3e80df | active |
| `api:POST:/api/updatePurchaseWiseDiscount` | API/Discounts | dev/routes/api.php:187 → Discounts.updatePurchaseWiseDiscount | - | PENDING | - | 19178c2c369132a8 | active |
| `api:POST:/api/getPurchaseWiseDiscounts` | API/Discounts | dev/routes/api.php:188 → Discounts.getPurchaseWiseDiscounts | - | PENDING | - | e41503f0db47902b | active |
| `api:POST:/api/getPurchaseWiseDiscountById` | API/Discounts | dev/routes/api.php:189 → Discounts.getPurchaseWiseDiscountById | - | PENDING | - | f59d39e5e199ff88 | active |
| `api:POST:/api/deleteChildPurchaseWiseDiscount` | API/Discounts | dev/routes/api.php:190 → Discounts.deleteChildPurchaseWiseDiscount | - | PENDING | - | d42559c26d27bd29 | active |
| `api:POST:/api/addBillBuster` | API/Discounts | dev/routes/api.php:192 → Discounts.addBillBuster | - | PENDING | - | 6755de022824b7d0 | active |
| `api:POST:/api/updateBillBuster` | API/Discounts | dev/routes/api.php:193 → Discounts.updateBillBuster | - | PENDING | - | c3b10308d29805f9 | active |
| `api:POST:/api/getBillBusters` | API/Discounts | dev/routes/api.php:194 → Discounts.getBillBusters | - | PENDING | - | 4edbde4e627de7fd | active |
| `api:POST:/api/getBillBusterById` | API/Discounts | dev/routes/api.php:195 → Discounts.getBillBusterById | - | PENDING | - | 47ce3249ce593998 | active |
| `api:POST:/api/deleteBillBusterChild` | API/Discounts | dev/routes/api.php:196 → Discounts.deleteBillBusterChild | - | PENDING | - | 05a0e929ff23a0e3 | active |
| `api:POST:/api/addHappyHour` | API/Happy_hours | dev/routes/api.php:198 → Happy_hours.addHappyHour | - | PENDING | - | 0662bfc3369d1e3f | active |
| `api:POST:/api/updateHappyHour` | API/Happy_hours | dev/routes/api.php:199 → Happy_hours.updateHappyHour | - | PENDING | - | a7ce568c056ef911 | active |
| `api:POST:/api/getHappyHours` | API/Happy_hours | dev/routes/api.php:200 → Happy_hours.getHappyHours | - | PENDING | - | 56ded9688a05bb80 | active |
| `api:POST:/api/getHappyHourById` | API/Happy_hours | dev/routes/api.php:201 → Happy_hours.getHappyHourById | - | PENDING | - | a0137df9a6924d9c | active |
| `api:POST:/api/deleteHappyHourChild` | API/Happy_hours | dev/routes/api.php:202 → Happy_hours.deleteHappyHourChild | - | PENDING | - | 037d707f599a7ce0 | active |
| `api:POST:/api/addGroupWiseHappyHour` | API/Happy_hours | dev/routes/api.php:204 → Happy_hours.addGroupWiseHappyHour | - | PENDING | - | 12ac3b6f171b8bfa | active |
| `api:POST:/api/updateGroupWiseHappyHour` | API/Happy_hours | dev/routes/api.php:205 → Happy_hours.updateGroupWiseHappyHour | - | PENDING | - | baacc59def8ebef1 | active |
| `api:POST:/api/getGroupWiseHappyHours` | API/Happy_hours | dev/routes/api.php:206 → Happy_hours.getGroupWiseHappyHours | - | PENDING | - | 4966ed35884ba903 | active |
| `api:POST:/api/getGroupWiseHappyHourById` | API/Happy_hours | dev/routes/api.php:207 → Happy_hours.getGroupWiseHappyHourById | - | PENDING | - | 1d53d315ecc984e4 | active |
| `api:POST:/api/deleteGroupWiseHappyHourChild` | API/Happy_hours | dev/routes/api.php:208 → Happy_hours.deleteGroupWiseHappyHourChild | - | PENDING | - | ddf95ad0457b7668 | active |
| `api:POST:/api/addCoupon` | API/Coupons | dev/routes/api.php:210 → Coupons.addCoupon | - | PENDING | - | b4b788d6e43187d0 | active |
| `api:POST:/api/updateCoupon` | API/Coupons | dev/routes/api.php:211 → Coupons.updateCoupon | - | PENDING | - | c42163c3348f8e49 | active |
| `api:POST:/api/getCoupons` | API/Coupons | dev/routes/api.php:212 → Coupons.getCoupons | - | PENDING | - | 22b2ec0519677a25 | active |
| `api:POST:/api/getCouponById` | API/Coupons | dev/routes/api.php:213 → Coupons.getCouponById | - | PENDING | - | c6e205137f3a20fe | active |
| `api:GET:/api/getCouponUsageTypes` | API/Coupons | dev/routes/api.php:214 → Coupons.getCouponUsageTypes | - | PENDING | - | 8337c58a7a6a25b9 | active |
| `api:POST:/api/searchEanCode` | API/Billing | dev/routes/api.php:216 → Billing.searchEanCode | - | PENDING | - | e14a02fd52006421 | active |
| `api:POST:/api/getCustomerByMobile` | API/Billing | dev/routes/api.php:218 → Billing.getCustomerByMobile | - | PENDING | - | 88bf3b8dcb734355 | active |
| `api:POST:/api/updateTempProductQty` | API/Billing | dev/routes/api.php:221 → Billing.updateTempProductQty | - | PENDING | - | be017ba5452e21d2 | active |
| `api:POST:/api/updateTempProductSalePrice` | API/Billing | dev/routes/api.php:222 → Billing.updateTempProductSalePrice | - | PENDING | - | 3a1cf1ff95cb7e11 | active |
| `api:GET:/api/clearTempBill` | API/Billing | dev/routes/api.php:223 → Billing.clearTempBill | - | PENDING | - | 87a4fb26b183d169 | active |
| `api:POST:/api/updateVoid` | API/Billing | dev/routes/api.php:224 → Billing.updateVoid | - | PENDING | - | 534609ff53114c91 | active |
| `api:POST:/api/updateTempProductDiscount` | API/Billing | dev/routes/api.php:225 → Billing.updateTempProductDiscount | - | PENDING | - | 02e3e9811a624c7e | active |
| `api:GET:/api/getShortcutKeys` | API/Billing | dev/routes/api.php:226 → Billing.getShortcutKeys | - | PENDING | - | a2442816143b273d | active |
| `api:POST:/api/suspendBill` | API/Billing | dev/routes/api.php:227 → Billing.suspendBill | - | PENDING | - | 22df3c3d1eb44b06 | active |
| `api:POST:/api/getProductDetails` | API/Billing | dev/routes/api.php:228 → Billing.getProductDetails | - | PENDING | - | 18df4729811b8106 | active |
| `api:POST:/api/addProductToTemp` | API/Billing | dev/routes/api.php:229 → Billing.addProductToTemp | - | PENDING | - | 6ba9504af9405d31 | active |
| `api:POST:/api/getSuspendedItems` | API/Billing | dev/routes/api.php:230 → Billing.getSuspendedItems | - | PENDING | - | fa21bd82161d270b | active |
| `api:POST:/api/resumeSuspendedBill` | API/Billing | dev/routes/api.php:231 → Billing.resumeSuspendedBill | - | PENDING | - | 82515ec07c18d435 | active |
| `api:GET:/api/getTempBillItems` | API/Billing | dev/routes/api.php:232 → Billing.getTempBillItems | - | PENDING | - | cf28cb32c52ee6e1 | active |
| `api:POST:/api/getTempBillItem` | API/Billing | dev/routes/api.php:233 → Billing.getTempBillItem | - | PENDING | - | 525f2a2bceb4b9c8 | active |
| `api:POST:/api/updateManualDiscount` | API/Billing | dev/routes/api.php:234 → Billing.updateManualDiscount | - | PENDING | - | a25bbcf69a855e6d | active |
| `api:GET:/api/clearManualDiscount` | API/Billing | dev/routes/api.php:235 → Billing.clearManualDiscount | - | PENDING | - | a06d7cd5361f307c | active |
| `api:GET:/api/getFreeProductDetails` | API/Billing | dev/routes/api.php:236 → Billing.getFreeProductDetails | - | PENDING | - | ad5083e354089f75 | active |
| `api:POST:/api/saveBill` | API/Billing | dev/routes/api.php:237 → Billing.saveBill | - | PENDING | - | 6b7b9816bffeaf6a | active |
| `api:POST:/api/getApplicableBillBuster` | API/Billing | dev/routes/api.php:238 → Billing.getApplicableBillBuster | - | PENDING | - | a0cdfb9a9430effd | active |
| `api:POST:/api/applyBillBuster` | API/Billing | dev/routes/api.php:239 → Billing.applyBillBuster | - | PENDING | - | 1f85fb38e28efb8a | active |
| `api:POST:/api/overingBill` | API/Billing | dev/routes/api.php:240 → Billing.overingBill | - | PENDING | - | 9e6187773c87afa2 | active |
| `api:POST:/api/checkRefundBill` | API/Billing | dev/routes/api.php:241 → Billing.checkRefundBill | - | PENDING | - | 3018b9c57051838a | active |
| `api:POST:/api/addRefundProductToTemp` | API/Billing | dev/routes/api.php:242 → Billing.addRefundProductToTemp | - | PENDING | - | 8fdf35b69a7ec03e | active |
| `api:POST:/api/saveRefundBill` | API/Billing | dev/routes/api.php:243 → Billing.saveRefundBill | - | PENDING | - | adc4b459e569356e | active |
| `api:POST:/api/getPrint` | API/Billing | dev/routes/api.php:244 → Billing.getPrint | - | PENDING | - | bbb06adbf6c7d390 | active |
| `api:POST:/api/getDayCloseReport` | API/Billing | dev/routes/api.php:245 → Billing.getDayCloseReport | - | PENDING | - | d51030c395f3eab1 | active |
| `api:GET:/api/dayClose` | API/Billing | dev/routes/api.php:246 → Billing.dayClose | - | PENDING | - | 8241e2907b63386a | active |
| `api:GET:/api/getBillFormats` | API/Billing | dev/routes/api.php:247 → Billing.getBillFormats | - | PENDING | - | 25e7e9c71717b376 | active |
| `api:GET:/api/getTransferInNumber` | API/Transfer_in | dev/routes/api.php:250 → Transfer_in.getTransferInNumber | - | PENDING | - | 3158e8016c468a46 | active |
| `api:POST:/api/addTransferIn` | API/Transfer_in | dev/routes/api.php:251 → Transfer_in.addTransferIn | - | PENDING | - | d5307ceb5ba67bcb | active |
| `api:POST:/api/getTransferInById` | API/Transfer_in | dev/routes/api.php:252 → Transfer_in.getTransferInById | - | PENDING | - | 8986f4e89c714ec4 | active |
| `api:POST:/api/getTransferInList` | API/Transfer_in | dev/routes/api.php:253 → Transfer_in.getTransferInList | - | PENDING | - | 4ba4dc474cad8bb1 | active |
| `api:POST:/api/deleteTransferInProduct` | API/Transfer_in | dev/routes/api.php:254 → Transfer_in.deleteTransferInProduct | - | PENDING | - | ca2b052ed0e6f8cb | active |
| `api:POST:/api/editTransferIn` | API/Transfer_in | dev/routes/api.php:255 → Transfer_in.editTransferIn | - | PENDING | - | a42329ea71fced87 | active |
| `api:GET:/api/getTransferOutNumber` | API/Transfer_out | dev/routes/api.php:257 → Transfer_out.getTransferOutNumber | - | PENDING | - | 3063ee640e2f003f | active |
| `api:POST:/api/addTransferOut` | API/Transfer_out | dev/routes/api.php:258 → Transfer_out.addTransferOut | - | PENDING | - | 725b5ef606eea15e | active |
| `api:POST:/api/getTransferOutById` | API/Transfer_out | dev/routes/api.php:259 → Transfer_out.getTransferOutById | - | PENDING | - | cdb2eddc9d71321a | active |
| `api:POST:/api/getTransferOutList` | API/Transfer_out | dev/routes/api.php:260 → Transfer_out.getTransferOutList | - | PENDING | - | afc0a0e7146b71fe | active |
| `api:POST:/api/deleteTransferOutProduct` | API/Transfer_out | dev/routes/api.php:261 → Transfer_out.deleteTransferOutProduct | - | PENDING | - | 9eb69768ae65837a | active |
| `api:POST:/api/editTransferOut` | API/Transfer_out | dev/routes/api.php:262 → Transfer_out.editTransferOut | - | PENDING | - | 7a38b92a6f8e03d4 | active |
| `api:POST:/api/addStockAdjustment` | API/Stock_adjustment | dev/routes/api.php:264 → Stock_adjustment.addStockAdjustment | - | PENDING | - | d9063afd1c06defe | active |
| `api:POST:/api/getStockAdjustmentById` | API/Stock_adjustment | dev/routes/api.php:265 → Stock_adjustment.getStockAdjustmentById | - | PENDING | - | c69c7da67054c1da | active |
| `api:POST:/api/getStockAdjustmentList` | API/Stock_adjustment | dev/routes/api.php:266 → Stock_adjustment.getStockAdjustmentList | - | PENDING | - | f89fb94402a68f3c | active |
| `api:POST:/api/deleteStockAdjustmentProduct` | API/Stock_adjustment | dev/routes/api.php:267 → Stock_adjustment.deleteStockAdjustmentProduct | - | PENDING | - | 1e027126d5f66f83 | active |
| `api:POST:/api/editStockAdjustment` | API/Stock_adjustment | dev/routes/api.php:268 → Stock_adjustment.editStockAdjustment | - | PENDING | - | 3471f9426d790d56 | active |
| `api:GET:/api/getKitMasterProducts` | API/Kit | dev/routes/api.php:270 → Kit.getKitMasterProducts | - | PENDING | - | 1e5eeeff67953008 | active |
| `api:GET:/api/getKitChildProducts` | API/Kit | dev/routes/api.php:271 → Kit.getKitChildProducts | - | PENDING | - | 8c5651a09b8105bf | active |
| `api:POST:/api/getKitDetails` | API/Kit | dev/routes/api.php:272 → Kit.getKitDetails | - | PENDING | - | a3f9e092754fdaf5 | active |
| `api:POST:/api/addUpdateKit` | API/Kit | dev/routes/api.php:273 → Kit.addUpdateKit | - | PENDING | - | 9aec8844e33254db | active |
| `api:POST:/api/deleteKitChildProduct` | API/Kit | dev/routes/api.php:274 → Kit.deleteKitChildProduct | - | PENDING | - | 1447ce93c40e4ed2 | active |
| `api:POST:/api/addDesignation` | API/Master | dev/routes/api.php:276 → Master.addDesignation | - | PENDING | - | 8ab91e433338badd | active |
| `api:POST:/api/updateDesignation` | API/Master | dev/routes/api.php:277 → Master.updateDesignation | - | PENDING | - | 2c2a94a26dee69c0 | active |
| `api:POST:/api/getDesignations` | API/Master | dev/routes/api.php:278 → Master.getDesignations | - | PENDING | - | 841ae1c7017e39ac | active |
| `api:POST:/api/getDesignationById` | API/Master | dev/routes/api.php:279 → Master.getDesignationById | - | PENDING | - | 6df48dd4c562a975 | active |
| `api:POST:/api/addEmployee` | API/Master | dev/routes/api.php:281 → Master.addEmployee | - | PENDING | - | e7d1714f28857230 | active |
| `api:POST:/api/updateEmployee` | API/Master | dev/routes/api.php:282 → Master.updateEmployee | - | PENDING | - | f5fc4c25fd368377 | active |
| `api:POST:/api/getEmployees` | API/Master | dev/routes/api.php:283 → Master.getEmployees | - | PENDING | - | b0e94722b2e60185 | active |
| `api:POST:/api/getEmployeeById` | API/Master | dev/routes/api.php:284 → Master.getEmployeeById | - | PENDING | - | 1a6619645fccd91b | active |
| `api:GET:/api/getCategoriesForKot` | API/Kot | dev/routes/api.php:286 → Kot.getCategoriesForKot | - | PENDING | - | 7379c3aefaa25b19 | active |
| `api:POST:/api/getProductsForKot` | API/Kot | dev/routes/api.php:287 → Kot.getProductsForKot | - | PENDING | - | 1cbbaaca3b5b6ece | active |
| `api:POST:/api/getProductVariantsForKot` | API/Kot | dev/routes/api.php:288 → Kot.getProductVariantsForKot | - | PENDING | - | e5a3031327181f39 | active |
| `api:POST:/api/getTableLayout` | API/Kot | dev/routes/api.php:289 → Kot.getTableLayout | - | PENDING | - | e5ce8fb1d74f0a5f | active |
| `api:POST:/api/getTableDetails` | API/Kot | dev/routes/api.php:290 → Kot.getTableDetails | - | PENDING | - | e3b81f709cb5c422 | active |
| `api:POST:/api/getTableReservations` | API/Kot | dev/routes/api.php:291 → Kot.getTableReservations | - | PENDING | - | 796f13809823844b | active |
| `api:POST:/api/checkReservationAvailability` | API/Kot | dev/routes/api.php:292 → Kot.checkReservationAvailability | - | PENDING | - | 472a1da782b8529b | active |
| `api:POST:/api/createReservation` | API/Kot | dev/routes/api.php:293 → Kot.createReservation | - | PENDING | - | fb3119d859a20ad7 | active |
| `api:POST:/api/getReservations` | API/Kot | dev/routes/api.php:294 → Kot.getReservations | - | PENDING | - | eadadb0d44d93321 | active |
| `api:POST:/api/getReservationDetails` | API/Kot | dev/routes/api.php:295 → Kot.getReservationDetails | - | PENDING | - | cb534ea24ad3f5bd | active |
| `api:POST:/api/updateReservation` | API/Kot | dev/routes/api.php:296 → Kot.updateReservation | - | PENDING | - | 28d72d2c61a2b608 | active |
| `api:POST:/api/cancelReservation` | API/Kot | dev/routes/api.php:297 → Kot.cancelReservation | - | PENDING | - | 53689b925705d561 | active |
| `api:POST:/api/checkInReservation` | API/Kot | dev/routes/api.php:298 → Kot.checkInReservation | - | PENDING | - | 4e8dff665bd0f392 | active |
| `api:POST:/api/createTableSession` | API/Kot | dev/routes/api.php:299 → Kot.createTableSession | - | PENDING | - | 5d5761c4aeef2a4d | active |
| `api:POST:/api/shiftTable` | API/Kot | dev/routes/api.php:300 → Kot.shiftTable | - | PENDING | - | ba39496c09138821 | active |
| `api:POST:/api/getTableKotDetails` | API/Kot | dev/routes/api.php:301 → Kot.getTableKotDetails | - | PENDING | - | a22163ca5f1dbd69 | active |
| `api:POST:/api/addMoreItems` | API/Kot | dev/routes/api.php:302 → Kot.addMoreItems | - | PENDING | - | b97414dd03b58bdf | active |
| `api:POST:/api/getAllKotDetails` | API/Kot | dev/routes/api.php:303 → Kot.getAllKotDetails | - | PENDING | - | 98302f2b9322d434 | active |
| `api:POST:/api/updateKotItemPreparing` | API/Kot | dev/routes/api.php:304 → Kot.updateKotItemPreparing | - | PENDING | - | 451cae07ceebe4bd | active |
| `api:POST:/api/updateKotItemReady` | API/Kot | dev/routes/api.php:305 → Kot.updateKotItemReady | - | PENDING | - | a932695ac04f1140 | active |
| `api:POST:/api/updateKotItemServed` | API/Kot | dev/routes/api.php:306 → Kot.updateKotItemServed | - | PENDING | - | 9b04a6995b6e225e | active |
| `api:POST:/api/cancelKotItem` | API/Kot | dev/routes/api.php:307 → Kot.cancelKotItem | - | PENDING | - | b4d787bd1dd4f2e0 | active |
| `api:POST:/api/addToTemp` | API/Kot | dev/routes/api.php:308 → Kot.addToTemp | - | PENDING | - | ef938d7d3f4f53da | active |
| `api:GET:/api/getKotTempBillItems` | API/Kot | dev/routes/api.php:309 → Kot.getKotTempBillItems | - | PENDING | - | ccb7decf379ed3ab | active |
| `api:POST:/api/applyCoupon` | API/Kot | dev/routes/api.php:310 → Kot.applyCoupon | - | PENDING | - | a1147cbc8d3de436 | active |
| `api:POST:/api/applyBillDiscount` | API/Kot | dev/routes/api.php:311 → Kot.applyBillDiscount | - | PENDING | - | 391ab81f5d8ffa95 | active |
| `api:POST:/api/saveTableBill` | API/Kot | dev/routes/api.php:312 → Kot.saveTableBill | - | PENDING | - | 200b24e6bb65f9ed | active |
| `api:POST:/api/addDirectBillItem` | API/Kot | dev/routes/api.php:313 → Kot.addDirectBillItem | - | PENDING | - | 4e4dc3fb8bc4886b | active |
| `api:POST:/api/saveTakeawayBill` | API/Kot | dev/routes/api.php:314 → Kot.saveTakeawayBill | - | PENDING | - | bd1d8f250261a3b9 | active |
| `api:GET:/api/KotClearTempBill` | API/Kot | dev/routes/api.php:315 → Kot.KotClearTempBill | - | PENDING | - | d5f6b0b25f888d62 | active |
| `api:POST:/api/KotSuspendBill` | API/Kot | dev/routes/api.php:316 → Kot.KotSuspendBill | - | PENDING | - | 1e425494f016842a | active |
| `api:POST:/api/KotResumeSuspendedBill` | API/Kot | dev/routes/api.php:317 → Kot.KotResumeSuspendedBill | - | PENDING | - | d5ecdd90b2a1abf4 | active |
| `api:POST:/api/getKotDayCloseReport` | API/Kot | dev/routes/api.php:318 → Kot.getKotDayCloseReport | - | PENDING | - | 544033d225199559 | active |
| `api:GET:/api/kotDayClose` | API/Kot | dev/routes/api.php:319 → Kot.kotDayClose | - | PENDING | - | e25fc9883ae96fc4 | active |
| `api:POST:/api/kotOveringBill` | API/Kot | dev/routes/api.php:320 → Kot.kotOveringBill | - | PENDING | - | 7ecd655804121f92 | active |
| `api:POST:/api/getKotPrint` | API/Kot | dev/routes/api.php:321 → Kot.getKotPrint | - | PENDING | - | 9e5735045753b394 | active |
| `api:POST:/api/bookSalonAppointment` | API/Salon_appointments | dev/routes/api.php:324 → Salon_appointments.bookSalonAppointment | - | PENDING | - | 7cff1b75831a262f | active |
| `api:POST:/api/getSalonEmployees` | API/Salon_appointments | dev/routes/api.php:325 → Salon_appointments.getSalonEmployees | - | PENDING | - | 559ba9263566eb2a | active |
| `api:POST:/api/getSalonAppointments` | API/Salon_appointments | dev/routes/api.php:326 → Salon_appointments.getSalonAppointments | - | PENDING | - | 7e33d3f31d0f295c | active |
| `api:POST:/api/updateSalonAppointmentStatus` | API/Salon_appointments | dev/routes/api.php:327 → Salon_appointments.updateSalonAppointmentStatus | - | PENDING | - | 66bd1c0f35f60c2a | active |
| `api:POST:/api/addServiceToTemp` | API/Salon_appointments | dev/routes/api.php:329 → Salon_appointments.addServiceToTemp | - | PENDING | - | fde7362a5ece0b1d | active |
| `api:GET:/api/getSalonTemp` | API/Salon_appointments | dev/routes/api.php:330 → Salon_appointments.getSalonTemp | - | PENDING | - | 9fbf7bc677c26b55 | active |
| `api:POST:/api/saveSalonBill` | API/Salon_appointments | dev/routes/api.php:332 → Salon_appointments.saveSalonBill | - | PENDING | - | 05544c43a72d38e5 | active |
| `web:GET:{ADMIN_PATH}` | Admin route/Login | dev/routes/web.php:19 → Login.login | - | PENDING | - | eeb3560093d4b47e | active |
| `web:POST:{ADMIN_PATH}/login` | Admin route/Login | dev/routes/web.php:20 → Login.index | - | PENDING | - | 181df860ab63e336 | active |
| `web:GET:{ADMIN_PATH}/logout` | Admin route/Login | dev/routes/web.php:21 → Login.logout | - | PENDING | - | 94f831b92bb869ad | active |
| `web:GET:{ADMIN_PATH}/dashboard` | Admin route/Login | dev/routes/web.php:22 → Login.dashboard | - | PENDING | - | f09cf441de5d3206 | active |
| `web:GET:{ADMIN_PATH}/change_password` | Admin route/Password | dev/routes/web.php:23 → Password.changePassword | - | PENDING | - | 89de1d275b0e5a80 | active |
| `web:POST:{ADMIN_PATH}/update_password` | Admin route/Password | dev/routes/web.php:24 → Password.updatePassword | - | PENDING | - | 30c7ff8363bdc86d | active |
| `web:GET:{ADMIN_PATH}/add_business_type` | Admin route/BusinessTypes | dev/routes/web.php:26 → BusinessTypes.add | - | PENDING | - | da98e76b4ca53ca4 | active |
| `web:POST:{ADMIN_PATH}/add/business_type` | Admin route/BusinessTypes | dev/routes/web.php:27 → BusinessTypes.addBusinessType | - | PENDING | - | e62b4cab0f6ccd8f | active |
| `web:GET:{ADMIN_PATH}/business_types` | Admin route/BusinessTypes | dev/routes/web.php:28 → BusinessTypes.getBusinessTypes | - | PENDING | - | 99901805b7dac46b | active |
| `web:POST:{ADMIN_PATH}/business_types` | Admin route/BusinessTypes | dev/routes/web.php:28 → BusinessTypes.getBusinessTypes | - | PENDING | - | 99901805b7dac46b | active |
| `web:GET:{ADMIN_PATH}/business_types/refresh` | Admin route/BusinessTypes | dev/routes/web.php:29 → BusinessTypes.getBusinessTypes | - | PENDING | - | bf94ce90b863c0aa | active |
| `web:GET:{ADMIN_PATH}/edit/business_type/{id}` | Admin route/BusinessTypes | dev/routes/web.php:30 → BusinessTypes.editBusinessType | - | PENDING | - | 61d933b0dc8a557c | active |
| `web:POST:{ADMIN_PATH}/update/business_type/{id}` | Admin route/BusinessTypes | dev/routes/web.php:31 → BusinessTypes.updateBusinessType | - | PENDING | - | 0dcd86def34587b6 | active |
| `web:GET:{ADMIN_PATH}/delete/business_type/{id}` | Admin route/BusinessTypes | dev/routes/web.php:32 → BusinessTypes.deleteBusinessType | - | PENDING | - | 336ae4a47404a61e | active |
| `web:GET:{ADMIN_PATH}/add_feature` | Admin route/Features | dev/routes/web.php:34 → Features.add | - | PENDING | - | 0cb2b0c026431167 | active |
| `web:POST:{ADMIN_PATH}/add/feature` | Admin route/Features | dev/routes/web.php:35 → Features.addFeature | - | PENDING | - | ef2f1b7e3f4826f1 | active |
| `web:GET:{ADMIN_PATH}/features` | Admin route/Features | dev/routes/web.php:36 → Features.getFeatures | - | PENDING | - | 02dfcc0bb2566760 | active |
| `web:POST:{ADMIN_PATH}/features` | Admin route/Features | dev/routes/web.php:36 → Features.getFeatures | - | PENDING | - | 02dfcc0bb2566760 | active |
| `web:GET:{ADMIN_PATH}/features/refresh` | Admin route/Features | dev/routes/web.php:37 → Features.getFeatures | - | PENDING | - | cf1b41232a5d26ec | active |
| `web:GET:{ADMIN_PATH}/edit/feature/{id}` | Admin route/Features | dev/routes/web.php:38 → Features.editFeature | - | PENDING | - | 2f021f0359886827 | active |
| `web:POST:{ADMIN_PATH}/update/feature/{id}` | Admin route/Features | dev/routes/web.php:39 → Features.updateFeature | - | PENDING | - | 796751c6b1f1728d | active |
| `web:GET:{ADMIN_PATH}/delete/feature/{id}` | Admin route/Features | dev/routes/web.php:40 → Features.deleteFeature | - | PENDING | - | a029eea1765f0056 | active |
| `web:GET:{ADMIN_PATH}/add_sub_feature` | Admin route/Sub_features | dev/routes/web.php:42 → Sub_features.add | - | PENDING | - | 1f9ab3a697231c08 | active |
| `web:POST:{ADMIN_PATH}/add/sub_feature` | Admin route/Sub_features | dev/routes/web.php:43 → Sub_features.addSubFeature | - | PENDING | - | 34526f1217b35fea | active |
| `web:GET:{ADMIN_PATH}/sub_features` | Admin route/Sub_features | dev/routes/web.php:44 → Sub_features.getSubFeatures | - | PENDING | - | fd886abd1a1a6506 | active |
| `web:POST:{ADMIN_PATH}/sub_features` | Admin route/Sub_features | dev/routes/web.php:44 → Sub_features.getSubFeatures | - | PENDING | - | fd886abd1a1a6506 | active |
| `web:GET:{ADMIN_PATH}/sub_features/refresh` | Admin route/Sub_features | dev/routes/web.php:45 → Sub_features.getSubFeatures | - | PENDING | - | b1a86f0ac45fcdef | active |
| `web:GET:{ADMIN_PATH}/edit/sub_feature/{id}` | Admin route/Sub_features | dev/routes/web.php:46 → Sub_features.editSubFeature | - | PENDING | - | fe2da9a5d079aa32 | active |
| `web:POST:{ADMIN_PATH}/update/sub_feature/{id}` | Admin route/Sub_features | dev/routes/web.php:47 → Sub_features.updateSubFeature | - | PENDING | - | a8c98f304d6671e0 | active |
| `web:GET:{ADMIN_PATH}/delete/sub_feature/{id}` | Admin route/Sub_features | dev/routes/web.php:48 → Sub_features.deleteSubFeature | - | PENDING | - | 7755be7012f59709 | active |
| `web:GET:{ADMIN_PATH}/add_admin` | Admin route/Admins | dev/routes/web.php:50 → Admins.add | - | PENDING | - | d265aa02d20c8bf2 | active |
| `web:POST:{ADMIN_PATH}/add/admin` | Admin route/Admins | dev/routes/web.php:51 → Admins.addAdmin | - | PENDING | - | 1069d36b8b3648e2 | active |
| `web:GET:{ADMIN_PATH}/admins` | Admin route/Admins | dev/routes/web.php:52 → Admins.getAdmins | - | PENDING | - | 80c90a3a5e1e1817 | active |
| `web:POST:{ADMIN_PATH}/admins` | Admin route/Admins | dev/routes/web.php:52 → Admins.getAdmins | - | PENDING | - | 80c90a3a5e1e1817 | active |
| `web:GET:{ADMIN_PATH}/admins/refresh` | Admin route/Admins | dev/routes/web.php:53 → Admins.getAdmins | - | PENDING | - | 3b77c80e7997605c | active |
| `web:GET:{ADMIN_PATH}/edit/admin/{id}` | Admin route/Admins | dev/routes/web.php:54 → Admins.editAdmin | - | PENDING | - | 0a09489c4b40ebb5 | active |
| `web:POST:{ADMIN_PATH}/update/admin/{id}` | Admin route/Admins | dev/routes/web.php:55 → Admins.updateAdmin | - | PENDING | - | 1c3dce87abcecfce | active |
| `web:GET:{ADMIN_PATH}/delete/admin/{id}` | Admin route/Admins | dev/routes/web.php:56 → Admins.deleteAdmin | - | PENDING | - | d7d73d9f20e07561 | active |
| `web:GET:{ADMIN_PATH}/add_client` | Admin route/Clients | dev/routes/web.php:58 → Clients.add | - | PENDING | - | 44e9ae75062bef7c | active |
| `web:POST:{ADMIN_PATH}/add/client` | Admin route/Clients | dev/routes/web.php:59 → Clients.addClient | - | PENDING | - | fe648e9721ff3a70 | active |
| `web:GET:{ADMIN_PATH}/clients` | Admin route/Clients | dev/routes/web.php:60 → Clients.getClients | - | PENDING | - | a2253dc248fb912b | active |
| `web:POST:{ADMIN_PATH}/clients` | Admin route/Clients | dev/routes/web.php:60 → Clients.getClients | - | PENDING | - | a2253dc248fb912b | active |
| `web:GET:{ADMIN_PATH}/clients/refresh` | Admin route/Clients | dev/routes/web.php:61 → Clients.getClients | - | PENDING | - | 36c175f285450e9d | active |
| `web:GET:{ADMIN_PATH}/edit/client/{id}` | Admin route/Clients | dev/routes/web.php:62 → Clients.editClient | - | PENDING | - | c2e0bd661b535ede | active |
| `web:POST:{ADMIN_PATH}/update/client/{id}` | Admin route/Clients | dev/routes/web.php:63 → Clients.updateClient | - | PENDING | - | 47ef4410a667be9c | active |
| `web:GET:{ADMIN_PATH}/delete/client/{id}` | Admin route/Clients | dev/routes/web.php:64 → Clients.deleteClient | - | PENDING | - | e8bb1e1d98979098 | active |
| `web:GET:{ADMIN_PATH}/client/features/{id}` | Admin route/Clients | dev/routes/web.php:65 → Clients.getFeatures | - | PENDING | - | a455dc5798f3a9d8 | active |
| `web:POST:{ADMIN_PATH}/client/features/update` | Admin route/Clients | dev/routes/web.php:66 → Clients.updateFeatures | - | PENDING | - | 32a70ffae8915946 | active |
| `web:GET:{ADMIN_PATH}/contrat_details` | Admin route/Clients | dev/routes/web.php:69 → Clients.getContractDetails | - | PENDING | - | e37c1a8ba0f05670 | active |
| `web:POST:{ADMIN_PATH}/contrat_details` | Admin route/Clients | dev/routes/web.php:69 → Clients.getContractDetails | - | PENDING | - | e37c1a8ba0f05670 | active |
| `web:GET:{ADMIN_PATH}/contrat_details/refresh` | Admin route/Clients | dev/routes/web.php:70 → Clients.getContractDetails | - | PENDING | - | 91c9a6e835aed458 | active |
| `web:GET:{ADMIN_PATH}/get_client_payments/{id}` | Admin route/Clients | dev/routes/web.php:71 → Clients.getClientPayments | - | PENDING | - | 512ee392ecb29078 | active |
| `web:POST:{ADMIN_PATH}/store_client_payment` | Admin route/Clients | dev/routes/web.php:72 → Clients.storeClientPayment | - | PENDING | - | 0fb87ad4e4dbbd9a | active |
| `web:GET:{ADMIN_PATH}/collection_details` | Admin route/Clients | dev/routes/web.php:74 → Clients.getCollectionDetails | - | PENDING | - | 9c592617aac79f2d | active |
| `web:POST:{ADMIN_PATH}/collection_details` | Admin route/Clients | dev/routes/web.php:74 → Clients.getCollectionDetails | - | PENDING | - | 9c592617aac79f2d | active |
| `web:GET:{ADMIN_PATH}/collection_details/refresh` | Admin route/Clients | dev/routes/web.php:75 → Clients.getCollectionDetails | - | PENDING | - | a982feeff34a0bf7 | active |
| `web:GET:{ADMIN_PATH}/add_key_map` | Admin route/Key_mappings | dev/routes/web.php:78 → Key_mappings.add | - | PENDING | - | a0c0ccb691a184e9 | active |
| `web:POST:{ADMIN_PATH}/add/key_map` | Admin route/Key_mappings | dev/routes/web.php:79 → Key_mappings.addKeyMap | - | PENDING | - | 38b597d874cde5bc | active |
| `web:GET:{ADMIN_PATH}/key_maps` | Admin route/Key_mappings | dev/routes/web.php:80 → Key_mappings.getKeyMaps | - | PENDING | - | 885ecfeec8c02b80 | active |
| `web:POST:{ADMIN_PATH}/key_maps` | Admin route/Key_mappings | dev/routes/web.php:80 → Key_mappings.getKeyMaps | - | PENDING | - | 885ecfeec8c02b80 | active |
| `web:GET:{ADMIN_PATH}/key_maps/refresh` | Admin route/Key_mappings | dev/routes/web.php:81 → Key_mappings.getKeyMaps | - | PENDING | - | beb3399ae366302f | active |
| `web:GET:{ADMIN_PATH}/edit/key_map/{id}` | Admin route/Key_mappings | dev/routes/web.php:82 → Key_mappings.editKeyMap | - | PENDING | - | 92f1b5db50e406a8 | active |
| `web:POST:{ADMIN_PATH}/update/key_map/{id}` | Admin route/Key_mappings | dev/routes/web.php:83 → Key_mappings.updateKeyMap | - | PENDING | - | eb21f74b2273c41e | active |
| `web:GET:{ADMIN_PATH}/delete/key_map/{id}` | Admin route/Key_mappings | dev/routes/web.php:84 → Key_mappings.deleteKeyMap | - | PENDING | - | 041811e67751e2a2 | active |
| `web:GET:{ADMIN_PATH}/add_bill_column` | Admin route/Bill_columns | dev/routes/web.php:87 → Bill_columns.add | - | PENDING | - | e33cd6245574f9ca | active |
| `web:POST:{ADMIN_PATH}/add/bill_column` | Admin route/Bill_columns | dev/routes/web.php:88 → Bill_columns.addBillColumn | - | PENDING | - | bd5f53f1f26b1af5 | active |
| `web:GET:{ADMIN_PATH}/bill_columns` | Admin route/Bill_columns | dev/routes/web.php:89 → Bill_columns.getBillColumns | - | PENDING | - | 55e25fb1d6a83f10 | active |
| `web:POST:{ADMIN_PATH}/bill_columns` | Admin route/Bill_columns | dev/routes/web.php:89 → Bill_columns.getBillColumns | - | PENDING | - | 55e25fb1d6a83f10 | active |
| `web:GET:{ADMIN_PATH}/bill_columns/refresh` | Admin route/Bill_columns | dev/routes/web.php:90 → Bill_columns.getBillColumns | - | PENDING | - | 129fe2a37ae8b3f3 | active |
| `web:GET:{ADMIN_PATH}/edit/bill_column/{id}` | Admin route/Bill_columns | dev/routes/web.php:91 → Bill_columns.editBillColumn | - | PENDING | - | 787ab66cc711cd85 | active |
| `web:POST:{ADMIN_PATH}/update/bill_column/{id}` | Admin route/Bill_columns | dev/routes/web.php:92 → Bill_columns.updateBillColumn | - | PENDING | - | 4ad72edaef790347 | active |
| `web:GET:{ADMIN_PATH}/delete/bill_column/{id}` | Admin route/Bill_columns | dev/routes/web.php:93 → Bill_columns.deleteBillColumn | - | PENDING | - | 43cebd976415c05a | active |
| `web:GET:{ADMIN_PATH}/add_coupon_usage_type` | Admin route/Coupon_usage_types | dev/routes/web.php:97 → Coupon_usage_types.add | - | PENDING | - | bb78f98e5845e42c | active |
| `web:POST:{ADMIN_PATH}/add/coupon_usage_type` | Admin route/Coupon_usage_types | dev/routes/web.php:98 → Coupon_usage_types.addCouponUsageType | - | PENDING | - | 9a0fa76ac0f1c5cc | active |
| `web:GET:{ADMIN_PATH}/coupon_usage_types` | Admin route/Coupon_usage_types | dev/routes/web.php:99 → Coupon_usage_types.getCouponUsageTypes | - | PENDING | - | eb650cc2d3835471 | active |
| `web:POST:{ADMIN_PATH}/coupon_usage_types` | Admin route/Coupon_usage_types | dev/routes/web.php:99 → Coupon_usage_types.getCouponUsageTypes | - | PENDING | - | eb650cc2d3835471 | active |
| `web:GET:{ADMIN_PATH}/coupon_usage_types/refresh` | Admin route/Coupon_usage_types | dev/routes/web.php:100 → Coupon_usage_types.getCouponUsageTypes | - | PENDING | - | d444241c0d2acff4 | active |
| `web:GET:{ADMIN_PATH}/edit/coupon_usage_type/{id}` | Admin route/Coupon_usage_types | dev/routes/web.php:101 → Coupon_usage_types.editCouponUsageType | - | PENDING | - | 0a045a319d1bc642 | active |
| `web:POST:{ADMIN_PATH}/update/coupon_usage_type/{id}` | Admin route/Coupon_usage_types | dev/routes/web.php:102 → Coupon_usage_types.updateCouponUsageType | - | PENDING | - | 62ced2587f331288 | active |
| `web:GET:{ADMIN_PATH}/delete/coupon_usage_type/{id}` | Admin route/Coupon_usage_types | dev/routes/web.php:103 → Coupon_usage_types.deleteCouponUsageType | - | PENDING | - | b1b9ea9820053f67 | active |
| `web:GET:{ADMIN_PATH}/add_bill_format` | Admin route/BillFormats | dev/routes/web.php:107 → BillFormats.add | - | PENDING | - | 4d5ad9084211e5c3 | active |
| `web:POST:{ADMIN_PATH}/add/bill_format` | Admin route/BillFormats | dev/routes/web.php:109 → BillFormats.addBillFormat | - | PENDING | - | e675338084af5caa | active |
| `web:GET:{ADMIN_PATH}/bill_formats` | Admin route/BillFormats | dev/routes/web.php:111 → BillFormats.getBillFormats | - | PENDING | - | b3eab6e97ceadc7b | active |
| `web:POST:{ADMIN_PATH}/bill_formats` | Admin route/BillFormats | dev/routes/web.php:111 → BillFormats.getBillFormats | - | PENDING | - | b3eab6e97ceadc7b | active |
| `web:GET:{ADMIN_PATH}/bill_formats/refresh` | Admin route/BillFormats | dev/routes/web.php:113 → BillFormats.getBillFormats | - | PENDING | - | 49eac3f1d71d6999 | active |
| `web:GET:{ADMIN_PATH}/edit/bill_format/{id}` | Admin route/BillFormats | dev/routes/web.php:115 → BillFormats.editBillFormat | - | PENDING | - | aaf8f7d6eaee9135 | active |
| `web:POST:{ADMIN_PATH}/update/bill_format/{id}` | Admin route/BillFormats | dev/routes/web.php:117 → BillFormats.updateBillFormat | - | PENDING | - | 7604889da15628f7 | active |
| `web:GET:{ADMIN_PATH}/delete/bill_format/{id}` | Admin route/BillFormats | dev/routes/web.php:119 → BillFormats.deleteBillFormat | - | PENDING | - | 66c6d4105fd73402 | active |
| `file:.editorconfig` | Supporting source | dev/.editorconfig | - | PENDING | - | f78cc5a2ef8ba61a | active |
| `file:.env.example` | Supporting source | dev/.env.example | - | PENDING | - | a527dd22cebd532f | active |
| `file:.gitattributes` | Supporting source | dev/.gitattributes | - | PENDING | - | a40eb27ee0b545ca | active |
| `file:.gitignore` | Supporting source | dev/.gitignore | - | PENDING | - | 41e54abd62aa86fd | active |
| `file:app/Exports/ExpensesExport.php` | Supporting source | dev/app/Exports/ExpensesExport.php | - | PENDING | - | 4b3e03bd2c20c51c | active |
| `file:app/Http/Controllers/admin/Admins.php` | Controller | dev/app/Http/Controllers/admin/Admins.php | - | PENDING | - | b395c21db09c1016 | active |
| `file:app/Http/Controllers/admin/Bill_columns.php` | Controller | dev/app/Http/Controllers/admin/Bill_columns.php | - | PENDING | - | 910109ce2bfa99ad | active |
| `file:app/Http/Controllers/admin/BillFormats.php` | Controller | dev/app/Http/Controllers/admin/BillFormats.php | - | PENDING | - | 6571fcfa7420f097 | active |
| `file:app/Http/Controllers/admin/BusinessTypes.php` | Controller | dev/app/Http/Controllers/admin/BusinessTypes.php | - | PENDING | - | f6e89b607dbdc81d | active |
| `file:app/Http/Controllers/admin/Clients.php` | Controller | dev/app/Http/Controllers/admin/Clients.php | - | PENDING | - | 3c32017f8a3070bc | active |
| `file:app/Http/Controllers/admin/Coupon_usage_types.php` | Controller | dev/app/Http/Controllers/admin/Coupon_usage_types.php | - | PENDING | - | 8fb61a6effbbe092 | active |
| `file:app/Http/Controllers/admin/Features.php` | Controller | dev/app/Http/Controllers/admin/Features.php | - | PENDING | - | e115c349cdbb6dba | active |
| `file:app/Http/Controllers/admin/Key_mappings.php` | Controller | dev/app/Http/Controllers/admin/Key_mappings.php | - | PENDING | - | 8f33518c76362468 | active |
| `file:app/Http/Controllers/admin/Login.php` | Controller | dev/app/Http/Controllers/admin/Login.php | - | PENDING | - | 44102d31e35160f8 | active |
| `file:app/Http/Controllers/admin/Password.php` | Controller | dev/app/Http/Controllers/admin/Password.php | - | PENDING | - | 240e7ae0703466c3 | active |
| `file:app/Http/Controllers/admin/Sub_features.php` | Controller | dev/app/Http/Controllers/admin/Sub_features.php | - | PENDING | - | 9ab5b2eb85b1c556 | active |
| `file:app/Http/Controllers/Api/Access_levels.php` | Controller | dev/app/Http/Controllers/Api/Access_levels.php | - | PENDING | - | 0cf861de1e896d46 | active |
| `file:app/Http/Controllers/Api/Billing.php` | Controller | dev/app/Http/Controllers/Api/Billing.php | - | PENDING | - | dc529d652e835816 | active |
| `file:app/Http/Controllers/Api/Coupons.php` | Controller | dev/app/Http/Controllers/Api/Coupons.php | - | PENDING | - | 5cd0af831ba364b8 | active |
| `file:app/Http/Controllers/Api/Customers.php` | Controller | dev/app/Http/Controllers/Api/Customers.php | - | PENDING | - | d3036341d4d1b6ae | active |
| `file:app/Http/Controllers/Api/Discounts.php` | Controller | dev/app/Http/Controllers/Api/Discounts.php | - | PENDING | - | 6629d741a58ff64d | active |
| `file:app/Http/Controllers/Api/Happy_hours.php` | Controller | dev/app/Http/Controllers/Api/Happy_hours.php | - | PENDING | - | a11d9780fa1fd373 | active |
| `file:app/Http/Controllers/Api/Kit.php` | Controller | dev/app/Http/Controllers/Api/Kit.php | - | PENDING | - | d0babaf076952dbe | active |
| `file:app/Http/Controllers/Api/Kot.php` | Controller | dev/app/Http/Controllers/Api/Kot.php | - | PENDING | - | fc70d35ca9d480bb | active |
| `file:app/Http/Controllers/Api/Login.php` | Controller | dev/app/Http/Controllers/Api/Login.php | zenx-pos-backend/routes/auth, routes/account and routes/reset | VERIFIED | All 11 routed methods verified by npm run build and 25 passing behavior tests | 6be4e2a5077da818 | active |
| `file:app/Http/Controllers/Api/Master.php` | Controller | dev/app/Http/Controllers/Api/Master.php | - | PENDING | - | 3ca16981b3467c52 | active |
| `file:app/Http/Controllers/Api/Products.php` | Controller | dev/app/Http/Controllers/Api/Products.php | - | PENDING | - | b939c6cb41ed10cc | active |
| `file:app/Http/Controllers/Api/Salon_appointments.php` | Controller | dev/app/Http/Controllers/Api/Salon_appointments.php | - | PENDING | - | b7a840bf880e3e8f | active |
| `file:app/Http/Controllers/Api/Settings.php` | Controller | dev/app/Http/Controllers/Api/Settings.php | - | PENDING | - | ab7585d5307e18f4 | active |
| `file:app/Http/Controllers/Api/Stock_adjustment.php` | Controller | dev/app/Http/Controllers/Api/Stock_adjustment.php | - | PENDING | - | a4a179053cc69894 | active |
| `file:app/Http/Controllers/Api/Transfer_in.php` | Controller | dev/app/Http/Controllers/Api/Transfer_in.php | - | PENDING | - | 2e8bdaebd8459b21 | active |
| `file:app/Http/Controllers/Api/Transfer_out.php` | Controller | dev/app/Http/Controllers/Api/Transfer_out.php | - | PENDING | - | fef48d9608eeafd3 | active |
| `file:app/Http/Controllers/Controller.php` | Controller | dev/app/Http/Controllers/Controller.php | - | PENDING | - | 25d1c1ef8e6cc8a3 | active |
| `file:app/Http/Kernel.php` | Supporting source | dev/app/Http/Kernel.php | - | PENDING | - | d961f4667ff477e5 | active |
| `file:app/Http/Middleware/JwtMiddleware.php` | Supporting source | dev/app/Http/Middleware/JwtMiddleware.php | zenx-pos-backend/middlewares/auth/authenticate.ts | REPLACED | npm test passed token signature, issuer, audience, account reload and cross-client denial cases | da4ddca2b932f141 | active |
| `file:app/Http/Traits/ApiLogger.php` | Supporting source | dev/app/Http/Traits/ApiLogger.php | - | PENDING | - | 2f76e7f21faa0232 | active |
| `file:app/Http/Traits/ProjectTrait.php` | Supporting source | dev/app/Http/Traits/ProjectTrait.php | - | PENDING | - | 0bc841c4d9e9f32b | active |
| `file:app/Models/Admin.php` | Model | dev/app/Models/Admin.php | - | PENDING | - | 2a9796b875aef750 | active |
| `file:app/Models/Appointment_service.php` | Model | dev/app/Models/Appointment_service.php | - | PENDING | - | 6170fed124e2e45e | active |
| `file:app/Models/Audit.php` | Model | dev/app/Models/Audit.php | - | PENDING | - | 9a6d6b3942047069 | active |
| `file:app/Models/Bill_buster.php` | Model | dev/app/Models/Bill_buster.php | - | PENDING | - | 359eb1da50c7ee18 | active |
| `file:app/Models/Bill_col_setting.php` | Model | dev/app/Models/Bill_col_setting.php | - | PENDING | - | 3e9a158e49eb0ca3 | active |
| `file:app/Models/Bill_column.php` | Model | dev/app/Models/Bill_column.php | - | PENDING | - | 6d2f253d3b72b819 | active |
| `file:app/Models/Bill_format.php` | Model | dev/app/Models/Bill_format.php | - | PENDING | - | a4b747a42c295f35 | active |
| `file:app/Models/Bill_master.php` | Model | dev/app/Models/Bill_master.php | - | PENDING | - | de42b55d968ff5bf | active |
| `file:app/Models/Bill_payment.php` | Model | dev/app/Models/Bill_payment.php | - | PENDING | - | 49798533700b3e88 | active |
| `file:app/Models/Bill_tran.php` | Model | dev/app/Models/Bill_tran.php | - | PENDING | - | 85c199dec69728ec | active |
| `file:app/Models/Billing_setting_description.php` | Model | dev/app/Models/Billing_setting_description.php | - | PENDING | - | b072f89365da83a1 | active |
| `file:app/Models/Billing_setting.php` | Model | dev/app/Models/Billing_setting.php | - | PENDING | - | 4d0ae7026085e727 | active |
| `file:app/Models/Brand.php` | Model | dev/app/Models/Brand.php | - | PENDING | - | 1be54f5fad36b9d3 | active |
| `file:app/Models/Business_type.php` | Model | dev/app/Models/Business_type.php | - | PENDING | - | e13d0530e9b08223 | active |
| `file:app/Models/Category.php` | Model | dev/app/Models/Category.php | - | PENDING | - | e1d5696b674812ea | active |
| `file:app/Models/Child_bill_buster.php` | Model | dev/app/Models/Child_bill_buster.php | - | PENDING | - | d0c6f0c07aabdbf0 | active |
| `file:app/Models/Child_group_wise_happy_hour.php` | Model | dev/app/Models/Child_group_wise_happy_hour.php | - | PENDING | - | 6a2de88b5b57811e | active |
| `file:app/Models/Child_happy_hour.php` | Model | dev/app/Models/Child_happy_hour.php | - | PENDING | - | 3ef0e6f65180df3f | active |
| `file:app/Models/Child_purchase_wise_discount.php` | Model | dev/app/Models/Child_purchase_wise_discount.php | - | PENDING | - | 897622155923b488 | active |
| `file:app/Models/Client_feature.php` | Model | dev/app/Models/Client_feature.php | - | PENDING | - | be7f37e9ef6259e8 | active |
| `file:app/Models/Client_payment.php` | Model | dev/app/Models/Client_payment.php | - | PENDING | - | 369d94f68c3b69db | active |
| `file:app/Models/Client_role_billing_access.php` | Model | dev/app/Models/Client_role_billing_access.php | - | PENDING | - | 5d1eefef4430373b | active |
| `file:app/Models/Client_role_feature.php` | Model | dev/app/Models/Client_role_feature.php | - | PENDING | - | 49ebf39b1a6d3899 | active |
| `file:app/Models/Client_role.php` | Model | dev/app/Models/Client_role.php | - | PENDING | - | 7397841bfcbbadca | active |
| `file:app/Models/Client_user.php` | Model | dev/app/Models/Client_user.php | zenx-pos-backend/models/auth/prisma-store.ts | IN_PROGRESS | Authentication queries and password update implemented; remaining domain uses pending | c8a13cd55b4dd851 | active |
| `file:app/Models/Colour.php` | Model | dev/app/Models/Colour.php | - | PENDING | - | 76c4b703c3489989 | active |
| `file:app/Models/Coupon_usage_type.php` | Model | dev/app/Models/Coupon_usage_type.php | - | PENDING | - | 6b86417d75a4ca84 | active |
| `file:app/Models/Coupon.php` | Model | dev/app/Models/Coupon.php | - | PENDING | - | 1d3e4e23dc63a084 | active |
| `file:app/Models/Customer.php` | Model | dev/app/Models/Customer.php | - | PENDING | - | 31bef79dc5d99e5a | active |
| `file:app/Models/Day_close_detail.php` | Model | dev/app/Models/Day_close_detail.php | - | PENDING | - | 6982232f073cfefa | active |
| `file:app/Models/Designation.php` | Model | dev/app/Models/Designation.php | - | PENDING | - | 7af25681c07c77e9 | active |
| `file:app/Models/Employee.php` | Model | dev/app/Models/Employee.php | - | PENDING | - | 08bda7618682be36 | active |
| `file:app/Models/Expense_head.php` | Model | dev/app/Models/Expense_head.php | - | PENDING | - | 73b3b44a94bd2025 | active |
| `file:app/Models/Expense.php` | Model | dev/app/Models/Expense.php | - | PENDING | - | 90a11fe140a8ba21 | active |
| `file:app/Models/Feature.php` | Model | dev/app/Models/Feature.php | - | PENDING | - | 9e604af990e7a9d0 | active |
| `file:app/Models/Floor.php` | Model | dev/app/Models/Floor.php | - | PENDING | - | 940dcae85644ebfe | active |
| `file:app/Models/Group_wise_discount.php` | Model | dev/app/Models/Group_wise_discount.php | - | PENDING | - | 3119b0ba9470e206 | active |
| `file:app/Models/Group_wise_happy_hour.php` | Model | dev/app/Models/Group_wise_happy_hour.php | - | PENDING | - | 513f9e7cb38dc343 | active |
| `file:app/Models/Gst.php` | Model | dev/app/Models/Gst.php | - | PENDING | - | 37ea07ba2a674fd0 | active |
| `file:app/Models/Happy_hour.php` | Model | dev/app/Models/Happy_hour.php | - | PENDING | - | a88306b83036b9ad | active |
| `file:app/Models/Hardware_setting.php` | Model | dev/app/Models/Hardware_setting.php | - | PENDING | - | ff93d991e6fae898 | active |
| `file:app/Models/Hot_keys_setting.php` | Model | dev/app/Models/Hot_keys_setting.php | - | PENDING | - | daee07c8d88ae7b4 | active |
| `file:app/Models/Item_wise_discount.php` | Model | dev/app/Models/Item_wise_discount.php | - | PENDING | - | 01c68427dfa57c53 | active |
| `file:app/Models/Key_mapping_setting.php` | Model | dev/app/Models/Key_mapping_setting.php | - | PENDING | - | da4bb7d89ca8d747 | active |
| `file:app/Models/Key_mapping.php` | Model | dev/app/Models/Key_mapping.php | - | PENDING | - | edbd0b7b3b2a0b85 | active |
| `file:app/Models/kit_bill_tran.php` | Model | dev/app/Models/kit_bill_tran.php | - | PENDING | - | 5814328c483644ec | active |
| `file:app/Models/Kit_mast_sales.php` | Model | dev/app/Models/Kit_mast_sales.php | - | PENDING | - | 5a085e361408a01d | active |
| `file:app/Models/Kit_master_details.php` | Model | dev/app/Models/Kit_master_details.php | - | PENDING | - | 097ce118eed5713b | active |
| `file:app/Models/Kit_master.php` | Model | dev/app/Models/Kit_master.php | - | PENDING | - | d455468b28599969 | active |
| `file:app/Models/Kit_tran_sales.php` | Model | dev/app/Models/Kit_tran_sales.php | - | PENDING | - | ec5013474f1061a2 | active |
| `file:app/Models/Kot_bill_mast.php` | Model | dev/app/Models/Kot_bill_mast.php | - | PENDING | - | d9f45ebc72bf9f0c | active |
| `file:app/Models/kot_bill_payment.php` | Model | dev/app/Models/kot_bill_payment.php | - | PENDING | - | 4d53f31f81a6401b | active |
| `file:app/Models/Kot_bill_tran.php` | Model | dev/app/Models/Kot_bill_tran.php | - | PENDING | - | 9a9a7abf693f077f | active |
| `file:app/Models/Kot_mast.php` | Model | dev/app/Models/Kot_mast.php | - | PENDING | - | 95356e66ec6c1f26 | active |
| `file:app/Models/Kot_prev_bill_mast.php` | Model | dev/app/Models/Kot_prev_bill_mast.php | - | PENDING | - | bf7488f568a835ab | active |
| `file:app/Models/Kot_prev_bill_tran.php` | Model | dev/app/Models/Kot_prev_bill_tran.php | - | PENDING | - | 78a23eda7a82bcc5 | active |
| `file:app/Models/Kot_setting_description.php` | Model | dev/app/Models/Kot_setting_description.php | - | PENDING | - | c3d973cee57cbd6d | active |
| `file:app/Models/Kot_setting.php` | Model | dev/app/Models/Kot_setting.php | - | PENDING | - | da28222eb0d9c45c | active |
| `file:app/Models/Kot_temp_tran.php` | Model | dev/app/Models/Kot_temp_tran.php | - | PENDING | - | fa4073adc837975b | active |
| `file:app/Models/Kot_tran.php` | Model | dev/app/Models/Kot_tran.php | - | PENDING | - | b974b1d1d2b4044d | active |
| `file:app/Models/Payment_mode.php` | Model | dev/app/Models/Payment_mode.php | - | PENDING | - | 2cbcb4f9f5bee1ec | active |
| `file:app/Models/Payment_summary.php` | Model | dev/app/Models/Payment_summary.php | - | PENDING | - | 9c4c552cbc7f2c7d | active |
| `file:app/Models/Prev_bill_master.php` | Model | dev/app/Models/Prev_bill_master.php | - | PENDING | - | 91414737f592cfae | active |
| `file:app/Models/Prev_bill_payment.php` | Model | dev/app/Models/Prev_bill_payment.php | - | PENDING | - | 9c5efd49cd01b6f6 | active |
| `file:app/Models/Prev_bill_tran.php` | Model | dev/app/Models/Prev_bill_tran.php | - | PENDING | - | 028633275df6362b | active |
| `file:app/Models/Product_control.php` | Model | dev/app/Models/Product_control.php | - | PENDING | - | 06a2d7862bd4d062 | active |
| `file:app/Models/Product_variant.php` | Model | dev/app/Models/Product_variant.php | - | PENDING | - | a638805573f7d113 | active |
| `file:app/Models/Product.php` | Model | dev/app/Models/Product.php | - | PENDING | - | a77946eb6efbcf10 | active |
| `file:app/Models/Purchase_wise_discount.php` | Model | dev/app/Models/Purchase_wise_discount.php | - | PENDING | - | 6e2ff8bb1845e936 | active |
| `file:app/Models/Sales_man.php` | Model | dev/app/Models/Sales_man.php | - | PENDING | - | d6350a0dcb7d0a99 | active |
| `file:app/Models/Salon_appointment.php` | Model | dev/app/Models/Salon_appointment.php | - | PENDING | - | b9c266ab49346556 | active |
| `file:app/Models/Size.php` | Model | dev/app/Models/Size.php | - | PENDING | - | 4f53ab8cc448a32a | active |
| `file:app/Models/State.php` | Model | dev/app/Models/State.php | - | PENDING | - | 5aba96a668ac02fd | active |
| `file:app/Models/Stock_adjustment_mast.php` | Model | dev/app/Models/Stock_adjustment_mast.php | - | PENDING | - | 3974cf167948b30b | active |
| `file:app/Models/Stock_adjustment_tran.php` | Model | dev/app/Models/Stock_adjustment_tran.php | - | PENDING | - | 88c5a8efd90ff356 | active |
| `file:app/Models/Stock.php` | Model | dev/app/Models/Stock.php | - | PENDING | - | dbac2172479b35c1 | active |
| `file:app/Models/Sub_category.php` | Model | dev/app/Models/Sub_category.php | - | PENDING | - | b676b22c02c736b8 | active |
| `file:app/Models/Sub_feature.php` | Model | dev/app/Models/Sub_feature.php | - | PENDING | - | dd21926f96d41cfc | active |
| `file:app/Models/Suspended_item.php` | Model | dev/app/Models/Suspended_item.php | - | PENDING | - | fa357a293f452371 | active |
| `file:app/Models/Table_reservation.php` | Model | dev/app/Models/Table_reservation.php | - | PENDING | - | 5a0c1fc3b0fd9bbf | active |
| `file:app/Models/Table_session.php` | Model | dev/app/Models/Table_session.php | - | PENDING | - | b33912b0df713744 | active |
| `file:app/Models/Table_type.php` | Model | dev/app/Models/Table_type.php | - | PENDING | - | 9053bab0b659d6de | active |
| `file:app/Models/Table.php` | Model | dev/app/Models/Table.php | - | PENDING | - | 6bbdc4b21a7840ff | active |
| `file:app/Models/Tax_breakup.php` | Model | dev/app/Models/Tax_breakup.php | - | PENDING | - | 9b90448527dcb5db | active |
| `file:app/Models/Tax.php` | Model | dev/app/Models/Tax.php | - | PENDING | - | a9d9478029ce0981 | active |
| `file:app/Models/Team.php` | Model | dev/app/Models/Team.php | - | PENDING | - | 562c3aa11ec4927c | active |
| `file:app/Models/Temp_bill_tran.php` | Model | dev/app/Models/Temp_bill_tran.php | - | PENDING | - | f97f309a324ed7b6 | active |
| `file:app/Models/Transfer_in_mast.php` | Model | dev/app/Models/Transfer_in_mast.php | - | PENDING | - | 1927d471bf396353 | active |
| `file:app/Models/Transfer_in_tran.php` | Model | dev/app/Models/Transfer_in_tran.php | - | PENDING | - | b6b25e18510d8f88 | active |
| `file:app/Models/Transfer_out_mast.php` | Model | dev/app/Models/Transfer_out_mast.php | - | PENDING | - | b795fb884c1da964 | active |
| `file:app/Models/Transfer_out_tran.php` | Model | dev/app/Models/Transfer_out_tran.php | - | PENDING | - | 411942b38c14040a | active |
| `file:app/Models/Unit_type.php` | Model | dev/app/Models/Unit_type.php | - | PENDING | - | d83d752a804ee077 | active |
| `file:app/Models/User.php` | Model | dev/app/Models/User.php | - | PENDING | - | 2731fbf075322723 | active |
| `file:app/Providers/AppServiceProvider.php` | Supporting source | dev/app/Providers/AppServiceProvider.php | - | PENDING | - | caf306ef6a25a547 | active |
| `file:app/Providers/RouteServiceProvider.php` | Supporting source | dev/app/Providers/RouteServiceProvider.php | - | PENDING | - | cd228ce26c955a0e | active |
| `file:artisan` | Supporting source | dev/artisan | - | PENDING | - | f91a517c0c5d3a90 | active |
| `file:bootstrap/app.php` | Supporting source | dev/bootstrap/app.php | - | PENDING | - | fcdb99770995aa92 | active |
| `file:bootstrap/providers.php` | Supporting source | dev/bootstrap/providers.php | - | PENDING | - | 2ef405f988a6ef3f | active |
| `file:composer.json` | Supporting source | dev/composer.json | - | PENDING | - | b1a50f55e89b3af3 | active |
| `file:config/app.php` | Supporting source | dev/config/app.php | - | PENDING | - | f804e6f316b4b1f8 | active |
| `file:config/auth.php` | Supporting source | dev/config/auth.php | - | PENDING | - | 54019155c57b4a10 | active |
| `file:config/cache.php` | Supporting source | dev/config/cache.php | - | PENDING | - | b8bcf382283330b9 | active |
| `file:config/constants.php` | Supporting source | dev/config/constants.php | - | PENDING | - | 5b08bd1e4309498e | active |
| `file:config/database.php` | Supporting source | dev/config/database.php | - | PENDING | - | 4f56083ec3874d21 | active |
| `file:config/filesystems.php` | Supporting source | dev/config/filesystems.php | - | PENDING | - | ba7060d7a23e490c | active |
| `file:config/jwt.php` | Supporting source | dev/config/jwt.php | zenx-pos-backend/models/auth/config.ts | REPLACED | npm run build and npm test passed with explicit HS256 issuer audience expiry and 32-byte secret validation | 77fb330d1dce8db5 | active |
| `file:config/logging.php` | Supporting source | dev/config/logging.php | - | PENDING | - | 729cd77811443240 | active |
| `file:config/mail.php` | Supporting source | dev/config/mail.php | - | PENDING | - | 825c4b149f2fe412 | active |
| `file:config/queue.php` | Supporting source | dev/config/queue.php | - | PENDING | - | 6101774da7c8b79a | active |
| `file:config/services.php` | Supporting source | dev/config/services.php | - | PENDING | - | 8258c4487eb1d73a | active |
| `file:config/session.php` | Supporting source | dev/config/session.php | - | PENDING | - | f2e75e189021597e | active |
| `file:database/.gitignore` | Supporting source | dev/database/.gitignore | - | PENDING | - | 8eafbd3959515de7 | active |
| `file:database/factories/UserFactory.php` | Supporting source | dev/database/factories/UserFactory.php | - | PENDING | - | 05c4cfa8e4dc7ebe | active |
| `file:database/migrations/0001_01_01_000000_create_users_table.php` | Schema | dev/database/migrations/0001_01_01_000000_create_users_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 63bf61cef29f3a1c | active |
| `file:database/migrations/0001_01_01_000001_create_cache_table.php` | Schema | dev/database/migrations/0001_01_01_000001_create_cache_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 2ca8398390ecef8e | active |
| `file:database/migrations/0001_01_01_000002_create_jobs_table.php` | Schema | dev/database/migrations/0001_01_01_000002_create_jobs_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 7c9c712adf4091c8 | active |
| `file:database/migrations/2026_04_22_114427_create_admins_table.php` | Schema | dev/database/migrations/2026_04_22_114427_create_admins_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | bd386efae77d2cf9 | active |
| `file:database/migrations/2026_04_23_055719_create_business_types_table.php` | Schema | dev/database/migrations/2026_04_23_055719_create_business_types_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 6741695a1c5fef11 | active |
| `file:database/migrations/2026_04_23_075209_create_features_table.php` | Schema | dev/database/migrations/2026_04_23_075209_create_features_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 86d84802a4877bd3 | active |
| `file:database/migrations/2026_04_23_091957_create_states_table.php` | Schema | dev/database/migrations/2026_04_23_091957_create_states_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | b1d35c6713bf650e | active |
| `file:database/migrations/2026_04_23_120250_add_business_columns_to_users_table.php` | Schema | dev/database/migrations/2026_04_23_120250_add_business_columns_to_users_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | ea2cc0111cbc77c3 | active |
| `file:database/migrations/2026_04_23_121712_create_client_features_table.php` | Schema | dev/database/migrations/2026_04_23_121712_create_client_features_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | dea603b173be0e0f | active |
| `file:database/migrations/2026_05_01_054125_create_client_payments_table.php` | Schema | dev/database/migrations/2026_05_01_054125_create_client_payments_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | c1e0aca37974912a | active |
| `file:database/migrations/2026_05_04_092426_create_gsts_table.php` | Schema | dev/database/migrations/2026_05_04_092426_create_gsts_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 903c5a27847f7abd | active |
| `file:database/migrations/2026_05_05_093715_create_client_roles_table.php` | Schema | dev/database/migrations/2026_05_05_093715_create_client_roles_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 48d253fe35571c36 | active |
| `file:database/migrations/2026_05_05_093830_create_client_users_table.php` | Schema | dev/database/migrations/2026_05_05_093830_create_client_users_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 7c60b2cf023bba20 | active |
| `file:database/migrations/2026_05_05_100316_create_client_role_features_table.php` | Schema | dev/database/migrations/2026_05_05_100316_create_client_role_features_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 4b50ae437a2f9e5c | active |
| `file:database/migrations/2026_05_06_120122_create_sub_features_table.php` | Schema | dev/database/migrations/2026_05_06_120122_create_sub_features_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 5624f8d3543b098e | active |
| `file:database/migrations/2026_05_07_105417_create_categories_table.php` | Schema | dev/database/migrations/2026_05_07_105417_create_categories_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 878caa3385cf1a74 | active |
| `file:database/migrations/2026_05_07_111110_create_audits_table.php` | Schema | dev/database/migrations/2026_05_07_111110_create_audits_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 0bd8e8816d9fcd22 | active |
| `file:database/migrations/2026_05_08_110952_create_sub_categories_table.php` | Schema | dev/database/migrations/2026_05_08_110952_create_sub_categories_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 1a041af636ce67c6 | active |
| `file:database/migrations/2026_05_08_142802_create_brands_table.php` | Schema | dev/database/migrations/2026_05_08_142802_create_brands_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | eeb7952afa3fa104 | active |
| `file:database/migrations/2026_05_08_142910_create_colours_table.php` | Schema | dev/database/migrations/2026_05_08_142910_create_colours_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | e0df8ee23d574d26 | active |
| `file:database/migrations/2026_05_08_142955_create_sizes_table.php` | Schema | dev/database/migrations/2026_05_08_142955_create_sizes_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 4b737ebe0c2543ae | active |
| `file:database/migrations/2026_05_08_152913_create_unit_types_table.php` | Schema | dev/database/migrations/2026_05_08_152913_create_unit_types_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 76fc23155e2e83bc | active |
| `file:database/migrations/2026_05_11_144906_create_teams_table.php` | Schema | dev/database/migrations/2026_05_11_144906_create_teams_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 1f9d78d69ff86dc3 | active |
| `file:database/migrations/2026_05_11_152811_create_payment_modes_table.php` | Schema | dev/database/migrations/2026_05_11_152811_create_payment_modes_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 98e75e52b61e1946 | active |
| `file:database/migrations/2026_05_11_160835_create_taxes_table.php` | Schema | dev/database/migrations/2026_05_11_160835_create_taxes_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | e1d0bde816f1f7c2 | active |
| `file:database/migrations/2026_05_11_171221_create_sales_mans_table.php` | Schema | dev/database/migrations/2026_05_11_171221_create_sales_mans_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 7009b4a8aad7be23 | active |
| `file:database/migrations/2026_05_11_180627_create_customers_table.php` | Schema | dev/database/migrations/2026_05_11_180627_create_customers_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 638070cc715ebe78 | active |
| `file:database/migrations/2026_05_12_143953_create_floors_table.php` | Schema | dev/database/migrations/2026_05_12_143953_create_floors_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 9eb0ff4e5cb16fc5 | active |
| `file:database/migrations/2026_05_12_151354_create_table_types_table.php` | Schema | dev/database/migrations/2026_05_12_151354_create_table_types_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 75f9ae6cb4a29d93 | active |
| `file:database/migrations/2026_05_12_154247_create_tables_table.php` | Schema | dev/database/migrations/2026_05_12_154247_create_tables_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 12d3033ff15b3264 | active |
| `file:database/migrations/2026_05_12_174725_create_products_table.php` | Schema | dev/database/migrations/2026_05_12_174725_create_products_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 0b9142caf4e2d467 | active |
| `file:database/migrations/2026_05_12_174801_create_product_variants_table.php` | Schema | dev/database/migrations/2026_05_12_174801_create_product_variants_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | d0b851e18363c442 | active |
| `file:database/migrations/2026_05_12_174830_create_product_controls_table.php` | Schema | dev/database/migrations/2026_05_12_174830_create_product_controls_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | f205c37281b2a503 | active |
| `file:database/migrations/2026_05_14_164031_create_expense_heads_table.php` | Schema | dev/database/migrations/2026_05_14_164031_create_expense_heads_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | b5d49defa12d7b1c | active |
| `file:database/migrations/2026_05_15_123351_create_expenses_table.php` | Schema | dev/database/migrations/2026_05_15_123351_create_expenses_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 6177512473fa6606 | active |
| `file:database/migrations/2026_05_18_102437_create_client_role_billing_access_table.php` | Schema | dev/database/migrations/2026_05_18_102437_create_client_role_billing_access_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 16a360b4a64808e1 | active |
| `file:database/migrations/2026_05_18_150745_create_hardware_settings_table.php` | Schema | dev/database/migrations/2026_05_18_150745_create_hardware_settings_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 89599e699be28ce8 | active |
| `file:database/migrations/2026_05_18_163351_create_billing_settings_table.php` | Schema | dev/database/migrations/2026_05_18_163351_create_billing_settings_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 1d45a2643d9a0fae | active |
| `file:database/migrations/2026_05_18_165503_create_billing_settings_descriptions_table.php` | Schema | dev/database/migrations/2026_05_18_165503_create_billing_settings_descriptions_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 2fd4518943fca6ad | active |
| `file:database/migrations/2026_05_19_113429_create_kot_settings_descriptions_table.php` | Schema | dev/database/migrations/2026_05_19_113429_create_kot_settings_descriptions_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 900f771b26aa61c9 | active |
| `file:database/migrations/2026_05_19_113720_create_kot_settings_table.php` | Schema | dev/database/migrations/2026_05_19_113720_create_kot_settings_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 5058cb6d0720e0a2 | active |
| `file:database/migrations/2026_05_19_122350_create_hot_keys_settings_table.php` | Schema | dev/database/migrations/2026_05_19_122350_create_hot_keys_settings_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 924f6a016ae74bca | active |
| `file:database/migrations/2026_05_19_164646_create_key_mapping_masters_table.php` | Schema | dev/database/migrations/2026_05_19_164646_create_key_mapping_masters_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | ad8d311bbdf2f5a8 | active |
| `file:database/migrations/2026_05_19_172540_create_bill_col_masters_table.php` | Schema | dev/database/migrations/2026_05_19_172540_create_bill_col_masters_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | a983f57e5d0abee6 | active |
| `file:database/migrations/2026_05_20_151943_create_key_mapping_settings_table.php` | Schema | dev/database/migrations/2026_05_20_151943_create_key_mapping_settings_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | d8a106966a1fa695 | active |
| `file:database/migrations/2026_05_21_143755_create_bill_col_settings_table.php` | Schema | dev/database/migrations/2026_05_21_143755_create_bill_col_settings_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | aa8c5047b00110b3 | active |
| `file:database/migrations/2026_05_21_155639_create_group_wise_discounts_table.php` | Schema | dev/database/migrations/2026_05_21_155639_create_group_wise_discounts_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 73eb90d12b5b212e | active |
| `file:database/migrations/2026_05_22_123443_create_item_wise_discounts_table.php` | Schema | dev/database/migrations/2026_05_22_123443_create_item_wise_discounts_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 1a13cec8dfe9d66e | active |
| `file:database/migrations/2026_05_22_164648_create_purchase_wise_discounts_table.php` | Schema | dev/database/migrations/2026_05_22_164648_create_purchase_wise_discounts_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 071fc693fc09ba0b | active |
| `file:database/migrations/2026_05_22_164829_create_child_purchase_wise_discounts_table.php` | Schema | dev/database/migrations/2026_05_22_164829_create_child_purchase_wise_discounts_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 6d4f24279380ce23 | active |
| `file:database/migrations/2026_05_23_122132_create_bill_busters_table.php` | Schema | dev/database/migrations/2026_05_23_122132_create_bill_busters_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 9d2f34683d1eb8dc | active |
| `file:database/migrations/2026_05_23_122548_create_child_bill_busters_table.php` | Schema | dev/database/migrations/2026_05_23_122548_create_child_bill_busters_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 7a5aba0b910e505b | active |
| `file:database/migrations/2026_05_26_102829_create_happy_hours_table.php` | Schema | dev/database/migrations/2026_05_26_102829_create_happy_hours_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | dc258943da01d4ba | active |
| `file:database/migrations/2026_05_26_102952_create_child_happy_hours_table.php` | Schema | dev/database/migrations/2026_05_26_102952_create_child_happy_hours_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 194a53fea44099be | active |
| `file:database/migrations/2026_05_26_143948_create_group_wise_happy_hours_table.php` | Schema | dev/database/migrations/2026_05_26_143948_create_group_wise_happy_hours_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | d99e9d646c0a6bd2 | active |
| `file:database/migrations/2026_05_26_144234_create_child_group_wise_happy_hours_table.php` | Schema | dev/database/migrations/2026_05_26_144234_create_child_group_wise_happy_hours_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | afd498b9fb5d9920 | active |
| `file:database/migrations/2026_05_26_165859_create_coupon_usage_types_table.php` | Schema | dev/database/migrations/2026_05_26_165859_create_coupon_usage_types_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 58f04e063987b4ee | active |
| `file:database/migrations/2026_05_28_175156_create_coupons_table.php` | Schema | dev/database/migrations/2026_05_28_175156_create_coupons_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 3539e7004e72f50b | active |
| `file:database/migrations/2026_06_01_143218_create_bill_master_table.php` | Schema | dev/database/migrations/2026_06_01_143218_create_bill_master_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 9f7c7e285900c3e5 | active |
| `file:database/migrations/2026_06_01_172827_create_bill_tran_table.php` | Schema | dev/database/migrations/2026_06_01_172827_create_bill_tran_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 9264e7e129a3b79f | active |
| `file:database/migrations/2026_06_01_173114_create_prev_bill_master_table.php` | Schema | dev/database/migrations/2026_06_01_173114_create_prev_bill_master_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 2e3375cd708da16e | active |
| `file:database/migrations/2026_06_01_173146_create_prev_bill_tran_table.php` | Schema | dev/database/migrations/2026_06_01_173146_create_prev_bill_tran_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 4730c3d076d56a44 | active |
| `file:database/migrations/2026_06_01_173238_create_temp_bill_tran_table.php` | Schema | dev/database/migrations/2026_06_01_173238_create_temp_bill_tran_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 31a2af734442796f | active |
| `file:database/migrations/2026_06_01_173421_create_suspended_items_table.php` | Schema | dev/database/migrations/2026_06_01_173421_create_suspended_items_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 907e6b81518dbf13 | active |
| `file:database/migrations/2026_06_01_173647_create_bill_payments_table.php` | Schema | dev/database/migrations/2026_06_01_173647_create_bill_payments_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | c020ac0e7b521539 | active |
| `file:database/migrations/2026_06_01_174009_create_prev_bill_payments_table.php` | Schema | dev/database/migrations/2026_06_01_174009_create_prev_bill_payments_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 4fa69bb55e229ce8 | active |
| `file:database/migrations/2026_06_01_174046_create_tax_breakup_table.php` | Schema | dev/database/migrations/2026_06_01_174046_create_tax_breakup_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | af3e49b7589796cb | active |
| `file:database/migrations/2026_06_01_174529_create_stock_table.php` | Schema | dev/database/migrations/2026_06_01_174529_create_stock_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | d9b2bd552e421baf | active |
| `file:database/migrations/2026_06_16_104321_create_payment_summary_table.php` | Schema | dev/database/migrations/2026_06_16_104321_create_payment_summary_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | d48d15fa538dd4ac | active |
| `file:database/migrations/2026_06_23_165419_create_day_close_details_table.php` | Schema | dev/database/migrations/2026_06_23_165419_create_day_close_details_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | bd0f72b246150d11 | active |
| `file:database/migrations/2026_06_25_110812_create_transfer_in_mast_table.php` | Schema | dev/database/migrations/2026_06_25_110812_create_transfer_in_mast_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | da1729ba006dbea8 | active |
| `file:database/migrations/2026_06_25_112330_create_transfer_in_tran_table.php` | Schema | dev/database/migrations/2026_06_25_112330_create_transfer_in_tran_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | a8d92cfc1fc3c204 | active |
| `file:database/migrations/2026_06_26_101851_create_transfer_out_mast_table.php` | Schema | dev/database/migrations/2026_06_26_101851_create_transfer_out_mast_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | c9255a770485ff3e | active |
| `file:database/migrations/2026_06_26_111646_create_transfer_out_tran_table.php` | Schema | dev/database/migrations/2026_06_26_111646_create_transfer_out_tran_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | e8302ee859a60c4e | active |
| `file:database/migrations/2026_06_29_163928_create_stock_adjustments_mast_table.php` | Schema | dev/database/migrations/2026_06_29_163928_create_stock_adjustments_mast_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 110e9606faec8cd6 | active |
| `file:database/migrations/2026_06_29_164224_create_stock_adjustments_tran_table.php` | Schema | dev/database/migrations/2026_06_29_164224_create_stock_adjustments_tran_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | f029451b5fc42b76 | active |
| `file:database/migrations/2026_06_30_114217_create_kit_master_table.php` | Schema | dev/database/migrations/2026_06_30_114217_create_kit_master_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | cb8f237b0d402847 | active |
| `file:database/migrations/2026_06_30_114416_create_kit_master_details_table.php` | Schema | dev/database/migrations/2026_06_30_114416_create_kit_master_details_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | d8ab3539ee12ed7c | active |
| `file:database/migrations/2026_07_01_101907_create_designations_table.php` | Schema | dev/database/migrations/2026_07_01_101907_create_designations_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 1bac198597c416d7 | active |
| `file:database/migrations/2026_07_01_113116_create_employees_table.php` | Schema | dev/database/migrations/2026_07_01_113116_create_employees_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | cf7292472dcc7498 | active |
| `file:database/migrations/2026_07_01_152834_create_kit_mast_sales_table.php` | Schema | dev/database/migrations/2026_07_01_152834_create_kit_mast_sales_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 4c44e9a3e496114c | active |
| `file:database/migrations/2026_07_01_153131_create_kit_tran_sales_table.php` | Schema | dev/database/migrations/2026_07_01_153131_create_kit_tran_sales_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | f689f5f756766662 | active |
| `file:database/migrations/2026_07_03_110114_create_table_sessions_table.php` | Schema | dev/database/migrations/2026_07_03_110114_create_table_sessions_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 13b8c93fa099273d | active |
| `file:database/migrations/2026_07_03_111313_create_kot_mast_table.php` | Schema | dev/database/migrations/2026_07_03_111313_create_kot_mast_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 36786ce324013c09 | active |
| `file:database/migrations/2026_07_03_111659_create_kot_tran_table.php` | Schema | dev/database/migrations/2026_07_03_111659_create_kot_tran_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 8bad13c0fbcea21b | active |
| `file:database/migrations/2026_07_03_112810_create_kot_bill_mast_table.php` | Schema | dev/database/migrations/2026_07_03_112810_create_kot_bill_mast_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 87523630858b4782 | active |
| `file:database/migrations/2026_07_03_113755_create_kot_bill_tran_table.php` | Schema | dev/database/migrations/2026_07_03_113755_create_kot_bill_tran_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | af85c61f7ba60ad3 | active |
| `file:database/migrations/2026_07_03_162117_create_table_reservations_table.php` | Schema | dev/database/migrations/2026_07_03_162117_create_table_reservations_table.php | zenx-pos-backend/models/database/schema/schema.prisma | REVIEW | Prisma validates; missing clients FK target recorded; live reconciliation pending | 5ecafe472e42fa2d | active |
| `file:database/migrations/2026_07_10_113147_create_kot_bill_payments_table.php` | Schema | dev/database/migrations/2026_07_10_113147_create_kot_bill_payments_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 24d7ca7a3bddd6ed | active |
| `file:database/migrations/2026_07_10_170322_create_kot_temp_tran_table.php` | Schema | dev/database/migrations/2026_07_10_170322_create_kot_temp_tran_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 521a9daadf206518 | active |
| `file:database/migrations/2026_07_14_124350_create_kot_prev_bill_mast_table.php` | Schema | dev/database/migrations/2026_07_14_124350_create_kot_prev_bill_mast_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | cb2316dad73261c2 | active |
| `file:database/migrations/2026_07_14_124639_create_kot_prev_bill_tran_table.php` | Schema | dev/database/migrations/2026_07_14_124639_create_kot_prev_bill_tran_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 68a93c2acb8a7b81 | active |
| `file:database/migrations/2026_07_16_103336_create_salon_appointments_table.php` | Schema | dev/database/migrations/2026_07_16_103336_create_salon_appointments_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 914e305efb5ab246 | active |
| `file:database/migrations/2026_07_16_103435_create_appointment_services_table.php` | Schema | dev/database/migrations/2026_07_16_103435_create_appointment_services_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 7f592a0d0b0dca50 | active |
| `file:database/migrations/2026_09_21_120623_create_bill_formats_table.php` | Schema | dev/database/migrations/2026_09_21_120623_create_bill_formats_table.php | zenx-pos-backend/models/database/schema/schema.prisma | IMPLEMENTED | Prisma validates; offline translation checks pass; live database parity pending | 64f1cd95782c390c | active |
| `file:database/migrations.zip` | Supporting source | dev/database/migrations.zip | - | PENDING | - | 6d2db10727ac17e6 | active |
| `file:database/seeders/DatabaseSeeder.php` | Supporting source | dev/database/seeders/DatabaseSeeder.php | - | PENDING | - | cf8e4b6e48360218 | active |
| `file:package.json` | Supporting source | dev/package.json | - | PENDING | - | e1bf666b49a401c0 | active |
| `file:phpunit.xml` | Supporting source | dev/phpunit.xml | - | PENDING | - | cdb0cb728fc010b1 | active |
| `file:public/.htaccess` | Public asset | dev/public/.htaccess | - | PENDING | - | b7e379c77639fd56 | active |
| `file:public/404.html` | Public asset | dev/public/404.html | - | PENDING | - | d189695b2f3bb923 | active |
| `file:public/502.html` | Public asset | dev/public/502.html | - | PENDING | - | bdb65b997b2313fd | active |
| `file:public/css/style.css` | Public asset | dev/public/css/style.css | - | PENDING | - | d11cd317228613a3 | active |
| `file:public/csv/sample_product.csv` | Public asset | dev/public/csv/sample_product.csv | - | PENDING | - | 6a05fcaed585565c | active |
| `file:public/favicon.ico` | Public asset | dev/public/favicon.ico | - | PENDING | - | e3b0c44298fc1c14 | active |
| `file:public/images/active.svg` | Public asset | dev/public/images/active.svg | - | PENDING | - | 1a430bad30aa022e | active |
| `file:public/images/client.svg` | Public asset | dev/public/images/client.svg | - | PENDING | - | 1c25bbfb813bd145 | active |
| `file:public/images/expired.svg` | Public asset | dev/public/images/expired.svg | - | PENDING | - | 821e2dcd47655a4a | active |
| `file:public/images/login.png` | Public asset | dev/public/images/login.png | - | PENDING | - | e508e76740844bcc | active |
| `file:public/images/logo_dark.png` | Public asset | dev/public/images/logo_dark.png | - | PENDING | - | b9e067872accb22f | active |
| `file:public/images/logo_light.png` | Public asset | dev/public/images/logo_light.png | - | PENDING | - | 4eb7c75499d405aa | active |
| `file:public/index.html` | Public asset | dev/public/index.html | - | PENDING | - | 0bae6089419ea8f9 | active |
| `file:public/index.php` | Public asset | dev/public/index.php | - | PENDING | - | eba77cba39695b6b | active |
| `file:public/info.php` | Public asset | dev/public/info.php | - | PENDING | - | 7b0425f92a9f3649 | active |
| `file:public/robots.txt` | Public asset | dev/public/robots.txt | - | PENDING | - | e5c4b84484ee4216 | active |
| `file:ql -u root -p` | Supporting source | dev/ql -u root -p | - | PENDING | - | 1b91b400d412421a | active |
| `file:README.md` | Supporting source | dev/README.md | - | PENDING | - | d8b15dfcda5b6e61 | active |
| `file:resources/css/app.css` | Supporting source | dev/resources/css/app.css | - | PENDING | - | 9f49ed837fdc773b | active |
| `file:resources/js/app.js` | Supporting source | dev/resources/js/app.js | - | PENDING | - | cf6dab196c721f69 | active |
| `file:resources/js/bootstrap.js` | Supporting source | dev/resources/js/bootstrap.js | - | PENDING | - | 6fd9fc82e68fa915 | active |
| `file:resources/views/admin/admins/add.blade.php` | Template | dev/resources/views/admin/admins/add.blade.php | - | PENDING | - | 681995a092e1a7b1 | active |
| `file:resources/views/admin/admins/edit.blade.php` | Template | dev/resources/views/admin/admins/edit.blade.php | - | PENDING | - | ca43c7186d4005d6 | active |
| `file:resources/views/admin/admins/view.blade.php` | Template | dev/resources/views/admin/admins/view.blade.php | - | PENDING | - | 30b9e7b9387812c5 | active |
| `file:resources/views/admin/bill_col/add.blade.php` | Template | dev/resources/views/admin/bill_col/add.blade.php | - | PENDING | - | 417d3cd199a0b176 | active |
| `file:resources/views/admin/bill_col/view.blade.php` | Template | dev/resources/views/admin/bill_col/view.blade.php | - | PENDING | - | acbdbb24e8305747 | active |
| `file:resources/views/admin/bill_format/add.blade.php` | Template | dev/resources/views/admin/bill_format/add.blade.php | - | PENDING | - | 2ae5ff2a80878ff3 | active |
| `file:resources/views/admin/bill_format/edit.blade.php` | Template | dev/resources/views/admin/bill_format/edit.blade.php | - | PENDING | - | b96b78e328ca021a | active |
| `file:resources/views/admin/bill_format/view.blade.php` | Template | dev/resources/views/admin/bill_format/view.blade.php | - | PENDING | - | 716d0d48a8947dff | active |
| `file:resources/views/admin/business_type/add.blade.php` | Template | dev/resources/views/admin/business_type/add.blade.php | - | PENDING | - | d6633a1b625f960c | active |
| `file:resources/views/admin/business_type/view.blade.php` | Template | dev/resources/views/admin/business_type/view.blade.php | - | PENDING | - | aba821c035e8aed5 | active |
| `file:resources/views/admin/change-password.blade.php` | Template | dev/resources/views/admin/change-password.blade.php | - | PENDING | - | ec1d357995631643 | active |
| `file:resources/views/admin/client/add.blade.php` | Template | dev/resources/views/admin/client/add.blade.php | - | PENDING | - | 39aa6ca5e900006a | active |
| `file:resources/views/admin/client/collection_report.blade.php` | Template | dev/resources/views/admin/client/collection_report.blade.php | - | PENDING | - | c28b96ae95d2741c | active |
| `file:resources/views/admin/client/contract_details.blade.php` | Template | dev/resources/views/admin/client/contract_details.blade.php | - | PENDING | - | c903577d0d562229 | active |
| `file:resources/views/admin/client/edit.blade.php` | Template | dev/resources/views/admin/client/edit.blade.php | - | PENDING | - | ccf9bdbe8b6cc8c6 | active |
| `file:resources/views/admin/client/view.blade.php` | Template | dev/resources/views/admin/client/view.blade.php | - | PENDING | - | cf621ebf60c29f38 | active |
| `file:resources/views/admin/coupon-usage-type/add.blade.php` | Template | dev/resources/views/admin/coupon-usage-type/add.blade.php | - | PENDING | - | ed90218df49f539a | active |
| `file:resources/views/admin/coupon-usage-type/view.blade.php` | Template | dev/resources/views/admin/coupon-usage-type/view.blade.php | - | PENDING | - | 0fbe93f49eae6876 | active |
| `file:resources/views/admin/feature/add.blade.php` | Template | dev/resources/views/admin/feature/add.blade.php | - | PENDING | - | 2a14e3235d1d7031 | active |
| `file:resources/views/admin/feature/view.blade.php` | Template | dev/resources/views/admin/feature/view.blade.php | - | PENDING | - | cfe66ec307a47f3c | active |
| `file:resources/views/admin/includes/footer_links.blade.php` | Template | dev/resources/views/admin/includes/footer_links.blade.php | - | PENDING | - | a63785c00b0347b5 | active |
| `file:resources/views/admin/includes/footer.blade.php` | Template | dev/resources/views/admin/includes/footer.blade.php | - | PENDING | - | e3b0c44298fc1c14 | active |
| `file:resources/views/admin/includes/header_links.blade.php` | Template | dev/resources/views/admin/includes/header_links.blade.php | - | PENDING | - | 24e0c36b65f90758 | active |
| `file:resources/views/admin/includes/header.blade.php` | Template | dev/resources/views/admin/includes/header.blade.php | - | PENDING | - | e53bb406c0c91c2b | active |
| `file:resources/views/admin/includes/sidebar.blade.php` | Template | dev/resources/views/admin/includes/sidebar.blade.php | - | PENDING | - | 1d9397b69ab4194e | active |
| `file:resources/views/admin/index.blade.php` | Template | dev/resources/views/admin/index.blade.php | - | PENDING | - | a0e6b844de92be8f | active |
| `file:resources/views/admin/key_map/add.blade.php` | Template | dev/resources/views/admin/key_map/add.blade.php | - | PENDING | - | d65132d566547bcc | active |
| `file:resources/views/admin/key_map/view.blade.php` | Template | dev/resources/views/admin/key_map/view.blade.php | - | PENDING | - | 6f02b1a24aa6913a | active |
| `file:resources/views/admin/login.blade.php` | Template | dev/resources/views/admin/login.blade.php | - | PENDING | - | f74ec0d8763124d0 | active |
| `file:resources/views/admin/sub_feature/add.blade.php` | Template | dev/resources/views/admin/sub_feature/add.blade.php | - | PENDING | - | a0ab763d90f91c69 | active |
| `file:resources/views/admin/sub_feature/edit.blade.php` | Template | dev/resources/views/admin/sub_feature/edit.blade.php | - | PENDING | - | f6462931502844ce | active |
| `file:resources/views/admin/sub_feature/view.blade.php` | Template | dev/resources/views/admin/sub_feature/view.blade.php | - | PENDING | - | 0d04cf7aa20e1093 | active |
| `file:resources/views/welcome.blade.php` | Template | dev/resources/views/welcome.blade.php | - | PENDING | - | e50e41602994840b | active |
| `file:routes/api.php` | Supporting source | dev/routes/api.php | - | PENDING | - | 4626124d1c1f23d4 | active |
| `file:routes/console.php` | Supporting source | dev/routes/console.php | - | PENDING | - | 9adccc33e7dd4006 | active |
| `file:routes/web.php` | Supporting source | dev/routes/web.php | - | PENDING | - | 2017ed8be3c838d2 | active |
| `file:tests/Feature/ExampleTest.php` | Legacy test | dev/tests/Feature/ExampleTest.php | - | PENDING | - | aaa4a192fb4aa96d | active |
| `file:tests/TestCase.php` | Legacy test | dev/tests/TestCase.php | - | PENDING | - | c7c209f5579c4264 | active |
| `file:tests/Unit/ExampleTest.php` | Legacy test | dev/tests/Unit/ExampleTest.php | - | PENDING | - | ffacae5c1a2a44c8 | active |
| `file:vite.config.js` | Supporting source | dev/vite.config.js | - | PENDING | - | b981a284135bcb7d | active |

<!-- inventory:end -->
