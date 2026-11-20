# ZenxPOS database promotion tracker

Updated: 2026-10-13

## Deployment decision

- Application hosting: Hostinger VPS through Docker Compose managed alongside aaPanel.
- Staging database: Docker MySQL 8.4 with a private Docker-network endpoint, loopback-only administrative port, and persistent volume.
- Production database: a new MySQL database on Hostinger.
- Staging data will not be copied into production, and production will never be prepared by truncating a staging database.
- Prisma keeps `provider = "mysql"` for both targets. Environment-specific connection URLs select the actual database.
- Production schema changes are applied through reviewed, versioned migrations. `prisma db push` and the demo seed are prohibited in production.

## Current schema baseline

| Item | Current evidence | Status |
|---|---|---|
| Legacy migration inventory | 95 Laravel migrations mapped | Complete |
| Prisma models | 99 models | Complete |
| Prisma columns | 1,220 columns | Complete |
| Declared legacy foreign keys | 37 | Complete |
| Unresolved legacy foreign keys | 1 (`table_reservations.client_id -> clients.id`) | Decision required |
| Legacy floating-point fields | 25 `DOUBLE` columns | Decision required |
| Explicit decimal fields | 142 `DECIMAL` columns | Complete |
| Staging schema | Initialized on MySQL 8.4 and populated from the legacy MySQL dump | Active |
| Production migration history | No `prisma/migrations` baseline exists | Blocking |
| Production MySQL | Not provisioned | Pending |

The authoritative schema sources are:

- `zenx-pos-backend/models/database/schema/schema.prisma`
- `zenx-pos-backend/models/database/schema/compatibility.json`
- `zenx-pos-backend/models/database/schema/tidb-bootstrap.sql`
- `MIGRATION_TRACKER.md`

## Promotion gates

| ID | Gate | Required outcome | Status | Evidence / decision |
|---|---|---|---|---|
| DB-001 | MySQL target | Record the exact staging and production MySQL versions; use a Prisma-supported release | Staging complete | Staging runs MySQL 8.4.11; production remains pending |
| DB-002 | Environment isolation | Create separate production database and least-privilege application/migration users | Pending | Do not reuse staging credentials, volumes, or transaction data |
| DB-003 | Storage engine | All application tables use InnoDB | Staging complete | Docker initialization uses the reviewed schema on MySQL 8.4 |
| DB-004 | Character set | Create database and tables with `utf8mb4` / `utf8mb4_unicode_ci` | Staging complete | Compose pins server charset and collation; repeat verification for production |
| DB-005 | Missing legacy FK | Decide whether `table_reservations.client_id` references `users.id`; add it only after data/domain verification | Blocking | Legacy source names nonexistent `clients` table |
| DB-006 | Numeric compatibility | Retain the 25 legacy `DOUBLE` columns for initial parity, or approve a separate Decimal conversion | Proposed: retain | Do not combine a money-type migration with first production launch |
| DB-007 | Date compatibility | Prove there are no MySQL zero dates that Prisma cannot read | Pending | Scan all date/timestamp columns after import or initialization |
| DB-008 | Index/default parity | Compare primary, unique, secondary indexes, defaults, nullability, unsigned types and auto-increment behavior | Pending | Automated schema comparison report required |
| DB-009 | Baseline migration | Create and review an initial MySQL migration from the frozen Prisma schema | Blocking | Commit migration SQL; never generate it against production |
| DB-010 | Migration history | Establish the Prisma migration baseline and use `prisma migrate deploy` for later changes | Blocking | Production workflow must not run `db push` |
| DB-011 | Connection transport | Choose local socket/localhost, private network with TLS, or explicitly reviewed private-network plaintext | Staging complete | Application allows plaintext only for Docker/private hosts when explicitly enabled; public remote hosts still require TLS |
| DB-012 | MySQL test database | Provision an isolated database whose name ends in `_test` | Pending | Required by `npm run test:db`; never point it at production |
| DB-013 | Fresh schema apply | Apply the reviewed baseline to an empty MySQL test database | Pending | Migration exits successfully with no manual table edits |
| DB-014 | Introspection drift | Compare `prisma db pull --print` from MySQL with the committed model | Pending | Differences reviewed and explained |
| DB-015 | Database integration | Run parameter binding, commit and rollback tests against MySQL | Pending | `npm run test:db` passes |
| DB-016 | Functional parity | Exercise login, super-admin CRUD, product, stock, billing, KOT, transfers, discounts and salon workflows | Pending | API/browser test report against MySQL |
| DB-017 | Concurrency | Verify stock, billing, day-close and transfer transaction behavior under concurrent requests | Pending | No lost updates, duplicates or partial commits |
| DB-018 | Production bootstrap | Add an admin-only production bootstrap that never creates demo clients or known passwords | Pending | One-time random credential; bcrypt hash only in DB |
| DB-019 | Backup and restore | Back up the database and persistent uploads, then complete one restore drill | Blocking for go-live | Record commands, location, retention and restore result |
| DB-020 | CI/CD migration gate | Run migrations as an approved production job before switching the application image | Implemented for versioned changes | `deploy/apply-migrations.sh` backs up the target, applies every pending checksum-pinned SQL file in order, and is invoked by `remote-deploy.sh`; initial production baseline remains gated by DB-009/DB-010 |
| DB-021 | Cutover check | Health, readiness, authenticated smoke tests and rollback are successful | Pending | `/api/health`, `/api/ready`, login and critical reads pass |
| DB-022 | Negative inventory setting | Apply `deploy/sql/20261013_allow_negative_inventory.sql` before deploying the backend that reads the new column | Staging complete | Applied and checksum-recorded on 2026-10-13; defaults to `1`; disable per tenant through Billing Settings with `allowNegativeInventory: 0` |

## Expected code changes

The application data model is expected to need few or no broad changes because Prisma uses the MySQL connector for both databases. The following targeted changes are expected before production:

1. Add a reviewed Prisma migration baseline for MySQL.
2. Resolve the `table_reservations.client_id` foreign-key target.
3. Add a production-safe admin bootstrap separate from the demo seed.
4. Finalize the Docker-to-MySQL connection and TLS policy.
5. Add schema-drift and MySQL integration checks to CI.
6. Add backup, migration, readiness and rollback steps to the production deployment workflow.

No monetary type conversion is planned for the initial launch. The existing `DOUBLE` behavior will be preserved until a separate data migration can define rounding, backfill, validation and rollback rules.

## Promotion procedure

1. Freeze the Prisma schema after Docker MySQL staging acceptance.
2. Provision an empty Hostinger MySQL `_test` database using the selected production version, InnoDB, `utf8mb4`, and `utf8mb4_unicode_ci`.
3. Resolve DB-005 and generate the initial versioned migration locally or in an isolated build environment.
4. Apply the baseline to the empty MySQL test database.
5. Run schema comparison, `npm run test:db`, the full backend suite, and critical workflow tests.
6. Provision an empty production database and distinct least-privilege users.
7. Take and verify pre-deployment backups even though the first production database is empty; this validates the operational path.
8. Apply `prisma migrate deploy` through the protected production deployment job.
9. Run the production-only admin bootstrap once. Do not run the demo seed.
10. Deploy the exact Docker image digest already accepted in staging.
11. Run health, readiness, login and critical read/write smoke tests.
12. Record the migration version, image digest, backup identifier, smoke-test result and rollback point below.

## Release record

| Release | Image digest | Migration | Database backup | Verification | Date |
|---|---|---|---|---|---|
| Initial production | Pending | Pending | Pending | Pending | Pending |
| WhatsApp messaging | Pending | `deploy/sql/20261113_whatsapp_messaging.sql` (additive: 4 `users` columns, 4 new `whatsapp_*` tables, 1 platform setting, 6 starter templates; rerunnable) | Pending | Pending: apply on staging, run `verify-fresh-database.sh`, smoke-test a simulated send. Rollback = leave columns/tables unused (no data rewritten) | Pending |

## Rules

- Never copy `.env`, database credentials, MySQL dumps or user-uploaded files into a Docker image or Git.
- Never run `prisma db push`, `prisma migrate dev`, destructive resets, truncation or the demo seed against production.
- Never point `DATABASE_TEST_URL` at staging or production.
- Keep staging and production database credentials, Redis namespaces, upload volumes and signing secrets separate.
- Every production schema change updates this tracker and includes forward migration, validation, backup and rollback evidence.
