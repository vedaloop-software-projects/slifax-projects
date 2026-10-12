# Hostinger deployment

The same immutable image runs in both environments:

- staging: `/opt/zenxpos/staging`, loopback API port `5110`, Docker MySQL loopback port `3310`
- production: `/opt/zenxpos/production`, loopback port `5100`, Hostinger MySQL database

aaPanel/Nginx terminates TLS and proxies the public hostname to the corresponding loopback port. Do not expose ports 5100 or 5110 in the VPS firewall.

## One-time VPS preparation

1. Install Docker Engine and the Docker Compose plugin through aaPanel or the operating system.
2. Create a restricted `zenxdeploy` user without Docker-group membership.
3. Install `remote-deploy.sh` as root-owned `/usr/local/sbin/zenxpos-deploy`, keep the environment directories root-owned, and grant `zenxdeploy` passwordless sudo access only to that command. The script validates its environment and immutable image arguments.
4. Copy `app.env.example` to each directory as `app.env`, fill in environment-specific values, and run `chmod 600 app.env`.
5. Log the VPS into `ghcr.io` once using a read-only package token. The token stays on the VPS and is not passed by the deployment workflow.
6. Add aaPanel reverse proxies and TLS certificates for the staging and production hostnames.
7. Back up the named upload volumes and databases independently.

The runtime uses three stable named volumes: `zenxpos_<environment>_mysql` for `/var/lib/mysql`, `zenxpos_<environment>_uploads` for `/app/public/uploads`, and `zenxpos_<environment>_logs` for `/app/logs`. The deployment script verifies the existing containers before replacement and rejects a release if the database or uploads are currently attached to a different volume. It also verifies all three mounts after deployment. Existing servers must receive the updated root-owned `compose.yml` and `/usr/local/sbin/zenxpos-deploy` before the next release.

Pino continues writing JSON to container stdout for aaPanel and `docker logs`, and also appends to `/app/logs/backend.log`. The named log volume preserves that file when the application container is replaced. Inspect it with `docker exec zenxpos-<environment> tail -n 200 /app/logs/backend.log`.

The workflows cannot upload or modify deployment definitions. They can only invoke the root-owned deployment command. Update `compose.yml` and `/usr/local/sbin/zenxpos-deploy` separately through an audited root bootstrap when those files change.

## GitHub configuration

Create GitHub environments named `staging` and `production`. Configure required reviewers for `production`.

Environment secrets required in both environments:

- `HOSTINGER_SSH_PRIVATE_KEY`

The VPS IP, restricted `zenxdeploy` username, verified ED25519 host key, and expected deployment-key fingerprint are public verification data pinned directly in the workflows. Verify and update them if the VPS or deployment key is ever replaced.

Environment variables:

- `HOSTINGER_SSH_PORT` (defaults to `22`)
- `STAGING_URL` in staging, such as `https://staging.example.com`
- `PRODUCTION_URL` in production
- `PRODUCTION_DEPLOY_ENABLED=true` only after every blocking database promotion gate is closed

The private GHCR package must grant the repository workflow write access. The VPS needs a read-only package credential for pulls.

## Deployment behavior

Pushes to `sasi-dev` run validation, publish an image tagged with the commit SHA, resolve its digest, and deploy that digest to staging. Production is manual and accepts only an immutable digest already tested in staging. The remote script validates configuration, pulls the image, starts the container, waits for `/api/ready`, and attempts rollback on failure.
