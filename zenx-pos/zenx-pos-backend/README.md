# ZenxPOS Node.js backend

Incremental TypeScript/Express migration of `../../dev`. Progress and scope live in
[`../MIGRATION_TRACKER.md`](../MIGRATION_TRACKER.md), the single migration tracker.
Confirmed legacy security findings and their replacement status are recorded in
[`../Vulnerabilities.md`](../Vulnerabilities.md).

## Run

Requires Node.js 22.18+ (developed with Node 24).

```sh
npm ci
npm run build
npm test
npm run dev
```

Defaults to `http://127.0.0.1:5100`. Copy `.env.example` to `.env` to override.
After building, `npm start` runs the compiled server. `/up` and `/api/health`
are liveness endpoints only. `/api/ready` verifies a Prisma query against
`business_types`, returning 503 when the database is missing or unavailable.
Eight authentication/account endpoints are migrated; other business endpoints remain pending.

## Authentication

When `DATABASE_URL` is configured, set a unique `JWT_SECRET` of at least 32 bytes.
The server refuses to start authentication with a weak or missing secret. Optional
issuer, audience, lifetime, and public asset URL settings are listed in `.env.example`.

Implemented routes are `POST /api/login`, `POST /api/changePassword`,
`GET /api/getProfile`, `GET /api/getPermission`, `POST /api/updateProfile`,
`POST /api/getAuditReports`, `POST /api/updateBillFormat`, and
`GET /api/getBillFormatId`. Protected routes require an
`Authorization: Bearer <token>` header. Each request reloads the active user, tenant,
role, and contract from the database. Password changes use a transaction and revoke
older tokens. Existing Laravel bcrypt hashes are supported.

The reset-password routes use HMAC-only challenges in the existing database cache
table. OTPs expire after 10 minutes, allow five attempts, enforce a resend cooldown,
and produce a separate one-time reset token. Configure an approved HTTPS SMS/email
webhook with `OTP_DELIVERY_URL`; reset requests return 503 while delivery is not
configured. Distributed per-IP login rate limiting remains required before deployment.

Profile updates use multipart form data with a JSON `data` field and optional `logo`.
JPG, PNG, and WebP logos are limited to 2 MB and stored below `UPLOAD_ROOT`. Audit
reports always paginate using `AUDIT_PAGE_SIZE` (1–100, default 25) to prevent an
unbounded tenant-history query.

## TiDB / MySQL with Prisma

Set `DATABASE_URL` in the ignored `.env` file using your TiDB connection URL.
Special characters in usernames/passwords must be percent-encoded. Runtime and
Prisma CLI configuration both enforce certificate validation for remote connections.
TiDB Starter normally does not require a custom CA. Local MySQL may explicitly use
`DB_SSL=false`; this is rejected for remote hosts.

`npm run db:check` performs a read-only Prisma query. `npm run db:inspect` prints
the live Prisma schema without changing the database or overwriting the draft.
Never publish command output containing credentials or sensitive schema details.

Use Prisma model methods and `runTransaction()` from `models/database/transaction.ts`.
No application raw SQL is required. Never use unsafe raw-query methods or interpolate
user input into SQL. Query parameterization does not replace input validation,
role authorization or `client_id` filtering. The legacy auth contract returns IDs as
safe JSON numbers; the global fallback serializes other BigInt values as strings.
Decimal values retain precision, so API conversions must be deliberate.

`models/database/schema/schema.prisma` is a **draft** translated from all 95 Laravel
migrations. `compatibility.json` records source fingerprints and limitations.
`npm run schema:generate` reproduces these artifacts; `npm run schema:validate`
validates them. The schema has 99 models, 1,220 columns and 37 declared foreign keys,
of which one is unresolved: `table_reservations.client_id` references a nonexistent
`clients` table. Its scalar column is preserved but its relation is not invented.
Reconcile this with the live database before deployment. No schema push, migrations,
or reset runs automatically. This draft is not permission to replace a live schema.

Twenty-five existing DOUBLE columns retain Laravel 12 floating-point semantics;
do not silently convert existing amounts to Decimal without a reviewed data migration.
Prisma does not encode the legacy `utf8mb4_unicode_ci` collation, column comments,
or physical column ordering. Review these during DDL preparation. Preserve business
date behavior with the configured `+05:30` connection timezone and parity tests.

For live verification, set `DATABASE_TEST_URL` to a **separate** database ending in
`_test`, with the reconciled tables already provisioned. Run `npm run test:db` to
check ORM parameter binding and commit/rollback behavior. This test inserts uniquely
named business types and removes the committed test record. It creates no tables
and refuses to use the application database. Normal `npm test` runs offline only.

TiDB suitability remains subject to live verification: transaction locking,
auto-increment ordering and some MySQL features differ. See the official
[compatibility guide](https://docs.pingcap.com/tidb/stable/mysql-compatibility/),
[Starter limits](https://docs.pingcap.com/tidbcloud/serverless-faqs/), and
[Prisma MySQL adapter](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/mysql).

As of 2026-10-06, `npm audit --omit=dev` reports transitive advisories in Prisma's
configuration/mysql2 dependencies and the MariaDB adapter. The suggested force fix
downgrades Prisma from 7 to 6, while the adapter advisories have no available fix.
Do not apply that breaking downgrade automatically; retain strict TLS and utf8mb4,
avoid raw SQL, and recheck supported adapter releases before deployment.

## Redis and cache-aside

Set `REDIS_URL` to enable Redis. Remote Redis connections must use `rediss://`;
unencrypted `redis://` is accepted only for localhost development. With Redis enabled:

- Password-reset challenges and one-time reset tokens are stored in Redis with native expiry.
- Profile reads use cache-aside with `PROFILE_CACHE_TTL_SECONDS` and profile writes delete the tenant's cached profile.
- Product cache helpers use tenant IDs and generation numbers in every key. Product writes will increment the tenant generation during the product-route conversion, making all older item/list keys unreachable until their TTL expires.

TiDB remains the source of truth. Cache failures fall through to TiDB for profile and
future product reads. OTP operations fail closed because reset security state must not
silently disappear. When `REDIS_URL` is absent, reset challenges use the existing
database `cache` table and profile/product response caching is disabled.

Use cache-aside only for product catalogue data. Do not use a stale cache value for
stock deduction, bill totals, authorization, role permissions, or contract checks;
those operations must read and transact against TiDB. The approach follows Redis's
[cache-aside guidance](https://redis.io/docs/latest/develop/use-cases/cache-aside/)
and the official [node-redis connection guidance](https://redis.io/docs/latest/develop/clients/nodejs/connect/).

## Structure

- `routes/<domain>/`: routes, request handlers, and endpoint tests.
- `middlewares/<concern>/`: HTTP handling, authentication, and later feature authorization.
- `models/<domain>/`: database access and domain rules; system configuration is in `models/system/`.

Keep at most 10 directly contained first-party files per directory. Split larger
domains into meaningful subfolders; dependencies and build output are excluded.

Preserve Laravel route names, client isolation, transactions, and request/response
contracts. Document intentional behavior changes in the tracker. Do not treat a
route stub as a conversion. Database changes and deployment are separate phases.

## Tracking

`npm run migration:refresh` discovers legacy routes and source files, preserves
existing status/evidence columns, and updates counts. `npm run migration:check`
checks for source drift, missing coverage, and backend folder size violations.
Edit statuses and evidence in the tracker, then refresh. `VERIFIED` requires a
target path and passing behavior checks. Do not mark inventory as conversion.
