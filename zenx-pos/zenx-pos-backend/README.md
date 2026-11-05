# ZenxPOS Node.js backend

Incremental TypeScript/Express migration of `../../dev`. Progress and scope live in
[`../MIGRATION_TRACKER.md`](../MIGRATION_TRACKER.md), the single migration tracker.
TiDB-staging to Hostinger-MySQL production readiness is tracked separately in
[`../DATABASE_PROMOTION_TRACKER.md`](../DATABASE_PROMOTION_TRACKER.md).
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
All 650 migration inventory items now have a finished disposition: 537 VERIFIED,
95 schema mappings IMPLEMENTED pending live TiDB reconciliation, 9 REPLACED, and
9 RETIRED. There are no pending or review rows. This means the code inventory is
complete; live database integration, concurrency, and high-volume testing remain
required before deployment.

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

For a new empty database, apply the schema and then create the initial database
records:

```sh
npx prisma db push
npx prisma db seed
```

You can also run the second command as `npm run db:seed`. The seed creates one
super-admin, one active demo shop, its `Admin` role and shop administrator, feature
permissions, and the minimum reference/settings rows needed to sign in. It generates
unique login identifiers and strong passwords, writes only password hashes, and
prints the new credentials once. Save that output. Re-running the seed finds the
seeded records in the database and leaves their login identifiers and passwords
unchanged. Login, role, tenant, permissions, and contract checks always come from
the database; no login value or role is read from `.env` at runtime or during seeding.

To recover an existing active super-admin without editing password hashes manually,
set `ADMIN_RESET_MOBILE` and `ADMIN_RESET_PASSWORD` only for the reset process and run:

```sh
npm run admin:reset
```

The password must contain 12–128 characters with upper-case, lower-case, number,
and symbol characters. The command does not create, reactivate, or undelete accounts.

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

Set `REDIS_URL`, or set both `UPSTASH_REDIS_REST_URL` and
`UPSTASH_REDIS_REST_TOKEN`, to enable Redis. Remote TCP connections must use
`rediss://`; unencrypted `redis://` is accepted only for localhost development.
The Upstash REST endpoint must use HTTPS. With Redis enabled:

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

Run `npm run redis:check` to verify a configured endpoint with one random,
30-second test key. The check covers read, write, expiry, atomic Lua update, and
cleanup without printing the endpoint or token.

## Website quote and contact enquiries

Website forms submit to `POST /api/website-enquiries`. These requests use the
separate `website_enquiries` inbox; `/api/registerBusiness` and its duplicate
registration rules remain unchanged. An existing customer or previous enquirer
can send another message using a fresh submission UUID.

The JSON body contains `submissionId` (UUID), `type` (`quote` or `contact`),
`selectedPlan` (`Standard`, `Premium`, `Help me choose`, or `null`),
`businessName`, `contactPersonName`, `mobile`, `email`, `businessTypeId` (positive
safe integer or `null`), `city` (string or `null`), `subject`, and `message`.
Contact messages must use `selectedPlan: null`. Names/email allow up to 255
characters, city/subject 100, and message 1,000. Subjects require at least three
characters and messages ten. The API trims text, lowercases email, and normalizes
Indian mobile numbers. Business types must be active and not deleted; their names
are stored with the enquiry so later catalogue changes do not erase the context.
The existing `GET /api/registrationBusinessTypes` supplies the choices.

New submissions return HTTP 201. Retrying the same UUID with the same normalized
details returns 200 without creating another enquiry. Reusing it for different
details returns 409. The unique database index also handles simultaneous retries.
Keep the UUID when retrying after a network failure; generate a new UUID after
changing the details. Successful responses contain `success`, `message`, and
`data: null`; no public endpoint exposes enquiry details. Validation errors use
422 and the existing `{ "errors": "..." }` envelope. Public attempts are limited
to five per IP per hour per backend process, including invalid requests and
retries; 429 responses include `Retry-After`. Configure `TRUST_PROXY` for the
actual reverse proxy; horizontally scaled deployments should also enforce the
limit at their shared ingress.

Authenticated superadmins use the following routes under `ADMIN_PATH` (default
`/admin`). All require a current active admin session and return `Cache-Control:
no-store`:

- `GET /admin/website-enquiries?status=&type=&page=1`: newest first, 25 per page;
  `{ success, data: rows, meta: { total, page, pageSize } }`.
- `GET /admin/website-enquiries/summary`: `{ success, data: { unreadCount } }`.
- `POST /admin/website-enquiries/:id/read`: records the first read time/admin
  once and returns `{ success, message, data: row }`.
- `POST /admin/website-enquiries/:id/status` with `{ "status": "in_progress" }`:
  accepts `new`, `in_progress`, or `closed` and returns the updated row.

Rows retain the submitted type, plan, subject, message and contact details, plus
`businessTypeName`, `status`, `readAt`, `createdAt`, and `updatedAt`. IDs are JSON
strings and timestamps are ISO strings. Listing does not mark messages as read;
status and read state are independent. New submissions appear in the durable
superadmin inbox/unread badge and queue an email alert to the configured internal
recipients. Reading or changing an enquiry's status does not send another email.

Before deploying these routes, apply both reviewed incremental migrations in order:
[`../deploy/sql/20261105_website_enquiries.sql`](../deploy/sql/20261105_website_enquiries.sql)
and [`../deploy/sql/20261105_website_enquiry_email_alerts.sql`](../deploy/sql/20261105_website_enquiry_email_alerts.sql).
The first creates the inbox without changing registration data; the second adds
durable email-delivery state. Existing enquiries are marked `not_requested`, so
enabling email does not send historical messages. API startup does not apply
migrations. The deployment scripts apply pending versioned SQL before replacing
the running application; package both migrations with the rollout. Outside those
scripts, apply them separately before starting the updated backend.
After schema edits, run
`npm run schema:generate`, `npm run schema:validate`, and `npm run build`.
Module tests use in-memory stores and Prisma fakes and never send email or write
to the configured database:

```sh
node --test routes/website-enquiries/tests/*.test.ts models/website-enquiries/tests/*.test.ts
```

### Enquiry email configuration and delivery

Enquiry alerts reuse the existing `SUPPORT_SMTP_HOST`, `SUPPORT_SMTP_PORT`,
`SUPPORT_SMTP_SECURE`, `SUPPORT_SMTP_USER`, and `SUPPORT_SMTP_APP_PASSWORD` settings.
Keep these values on the backend. With `SUPPORT_SMTP_SECURE=false`, STARTTLS is
required before authentication; certificate verification stays enabled. The optional overrides are:

| Variable | Purpose and fallback |
| --- | --- |
| `ENQUIRY_EMAIL_TO` | Comma-separated internal recipients; blank uses `SUPPORT_EMAIL_TO`. |
| `ENQUIRY_EMAIL_FROM` | Sender address; blank uses `SUPPORT_EMAIL_FROM`, then `SUPPORT_SMTP_USER`. |
| `ENQUIRY_ADMIN_URL` | Optional superadmin app base URL; the alert link sets its hash to `#/website-enquiries`. Requires HTTPS, except HTTP loopback for local development; URL credentials and query parameters are rejected. |

No separate enable flag or platform-settings entry is required. The worker sends
only when SMTP and recipient configuration is complete. New enquiries retain
their queued alerts when email is unconfigured; configure the backend and restart
it to resume delivery. Do not put SMTP credentials or recipient settings in the
website's `NEXT_PUBLIC_*` variables.

The inbox row and pending alert are saved in the same insert. The public request
returns after persistence and does not wait for SMTP. An identical submission
UUID retry creates neither a new enquiry nor an additional alert. The backend
checks the queue every 15 seconds, claims work with a five-minute lease and an
atomic state comparison, and limits each SMTP attempt to at most 45 seconds.
Failed sends retry after 1, 5, 15, and 60 minutes, up to five total attempts. The
final failure is retained and logged; it does not remove the dashboard enquiry.

Delivery is **at least once**. Each enquiry uses a stable message ID, but an SMTP
acknowledgment or process failure after acceptance can still cause a rare duplicate
on retry; message IDs do not guarantee recipient-side deduplication. Tests use
fake transports and stores. Live SMTP delivery and production configuration have
not been verified as part of this change.

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
