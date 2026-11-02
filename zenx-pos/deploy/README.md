# Hostinger deployment

The same immutable image runs in both environments on one VPS, each with its own Docker MySQL:

| | Directory | API (loopback) | MySQL (loopback) | Deploys from |
|---|---|---|---|---|
| staging | `/opt/zenxpos/staging` | `5110` | `3310` | push to `sasi-dev` |
| production | `/opt/zenxpos/production` | `5100` | `3311` | merge to `main` |

aaPanel/Nginx terminates TLS and proxies each public hostname to its loopback port. Do not expose these ports in the VPS firewall. The super-admin app is part of the same image and is served at `<api-url>/admin`.

## Database schema and migrations

- `mysql-init/` builds a **new, empty** database (MySQL runs it only when the volume is empty):
  - `001-schema.sql` is the complete schema up to the baseline.
  - `002-platform-data.sql` holds the default platform rows.
  - `003-migration-baseline.sql` records every migration already contained in `001`, with its checksum.
- `sql/<yyyymmdd>_<name>.sql` holds versioned migrations. `apply-migrations.sh` runs every migration not yet recorded in `zenxpos_schema_migrations`, in order, after a backup, before the new image takes traffic.
- **To change the schema, add a new migration file with a later date.** Never edit an applied migration or the `mysql-init` files: `npm run migration:check` (baseline check) and the deploy script both reject changed migrations.
- Every CI, staging and production run executes `verify-fresh-database.sh`. It initialises the pinned MySQL image from `mysql-init`, runs `apply-migrations.sh` twice (the second run must be a no-op), compares the result with the Prisma schema (only the differences in `schema-drift-allowlist.sql` are accepted), boots the built image, creates the first super-admin and signs in. The production workflow also requires the platform reference data (features, sub-features, business types, states).

## Production: one-time server preparation

1. Platform reference data. If `sql/*_platform_reference_data.sql` does not exist yet, export it from staging and commit it:
   `sudo bash export-reference-data.sh staging > sql/20261102_platform_reference_data.sql`
2. Copy this `deploy` directory to the VPS and run `sudo bash bootstrap-production.sh https://retail-api.zenxpos.com`. It:
   - installs the deployment commands;
   - installs `compose.yml` and `mysql-init` into `/opt/zenxpos/production`;
   - creates `app.env` and `mysql.env` with generated secrets (it never overwrites them);
   - lists the third-party keys still to fill in (Cashfree live keys, SMTP, OTP delivery, Redis).
3. Point DNS to the VPS, and add the aaPanel reverse proxy with TLS to `http://127.0.0.1:5100`.
4. In the GitHub `production` environment, set `PRODUCTION_URL` and `PRODUCTION_DEPLOY_ENABLED=true`, and keep the `HOSTINGER_SSH_PRIVATE_KEY` secret.
5. Merge to `main`. After the first deploy, create the first super-admin (refused if one already exists):

   ```bash
   docker exec -e ADMIN_CREATE_FIRST=true -e ADMIN_RESET_NAME='Super Admin' \
     -e ADMIN_RESET_MOBILE='<10-digit mobile>' -e ADMIN_RESET_PASSWORD='<strong password>' \
     zenxpos-production node dist/models/database/reset-admin.js
   ```

   Without `ADMIN_CREATE_FIRST`, the same command resets an existing super-admin's password.

## VPS preparation (both environments)

1. Install Docker Engine and the Docker Compose plugin (v2.1+ for `up --wait`).
2. Create a restricted `zenxdeploy` user without Docker-group membership. Grant it passwordless sudo only for the root-owned `/usr/local/sbin/zenxpos-deploy`, which validates its environment and immutable image arguments.
3. Log the VPS into `ghcr.io` once with a read-only package token. The token stays on the VPS.
4. Back up the named upload volumes and databases independently.

Each environment uses three stable named volumes: `zenxpos_<environment>_mysql`, `zenxpos_<environment>_uploads` and `zenxpos_<environment>_logs`. The deployment script refuses to replace a container whose database, uploads or logs are attached elsewhere, and verifies all three mounts after deploying. The workflows can only invoke the root-owned deployment command. Changes to `compose.yml` or the deployment scripts reach the server through `bootstrap-production.sh` (for production) or an audited root update (for staging).

Pino writes JSON to container stdout and also to `/app/logs/backend.log`, kept in the log volume: `docker exec zenxpos-<environment> tail -n 200 /app/logs/backend.log`.

## GitHub configuration

- **Environments:** `staging` and `production`. Add required reviewers to `production` if a person should approve each release.
- **Secret** (both environments): `HOSTINGER_SSH_PRIVATE_KEY`.
- **Variables:**
  - `HOSTINGER_SSH_PORT` (default `22`);
  - `STAGING_URL`;
  - `PRODUCTION_URL`;
  - `PRODUCTION_DEPLOY_ENABLED=true`, set once production is bootstrapped. Production deploys fail with a clear message until then.
- **Pinned in the workflows:** the VPS IP, the `zenxdeploy` user, the ED25519 host key and the deployment-key fingerprint. Update them if the VPS or the key is replaced.
- **Package access:** the private GHCR package must grant the repository workflow write access; the VPS needs a read-only credential for pulls.

## Deployment behaviour

- **Staging:** pushes to `sasi-dev` validate, verify a new database, publish the image tagged with the commit SHA, and deploy its digest.
- **Production:** merging to `main` runs the same checks, including the reference-data requirement, publishes `:<sha>` and `:production`, then deploys behind the `PRODUCTION_DEPLOY_ENABLED` switch and the GitHub `production` environment.
- **Redeploy or roll back:** run the production workflow manually with an existing `image_ref` digest.
- **Remote script:** checks configuration, waits for MySQL to be healthy, applies pending migrations, starts the new container, waits for `/api/ready`, and rolls back to the previous image on failure.
