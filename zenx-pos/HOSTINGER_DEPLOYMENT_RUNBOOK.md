# Hostinger VPS deployment runbook

This runbook records the working ZenxPOS staging setup on Hostinger and turns it into a reusable sequence for another Node.js project. Replace values in angle brackets for a different project. Never commit private keys, database URLs, API tokens, JWT secrets, or runtime `app.env` files.

## 1. Architecture used here

```text
Developer workstation
        |
        | git push
        v
GitHub Actions
  - test backend and frontend
  - build one Docker image
  - push immutable image to GHCR
  - SSH as restricted deploy user
        |
        v
Hostinger VPS: 185.199.52.159
  aaPanel Nginx :80/:443
        |
        | reverse proxy
        v
  127.0.0.1:5110 -> ZenxPOS staging container
        |
        +-> TiDB staging database
        +-> Upstash Redis
```

Production will use `127.0.0.1:5100` and `retail-api.zenxpos.com`. Staging uses `127.0.0.1:5110` and `staging-retail-api.zenxpos.com`. Ports 5100 and 5110 stay bound to loopback and are never opened in the VPS firewall.

## 2. Files created for deployment

- `.github/workflows/zenx-pos-ci.yml`: backend, super-admin, and image build validation.
- `.github/workflows/zenx-pos-staging-cd.yml`: validates, publishes to GHCR, and deploys `sasi-dev` to staging.
- `.github/workflows/zenx-pos-production-cd.yml`: manual production deployment of an exact image digest.
- `zenx-pos/Dockerfile`: builds the super-admin and backend into one production image.
- `zenx-pos/.dockerignore`: keeps secrets and development files out of the image context.
- `zenx-pos/deploy/compose.yml`: hardened runtime definition.
- `zenx-pos/deploy/app.env.example`: runtime configuration template without secrets.
- `zenx-pos/deploy/remote-deploy.sh`: validates input, deploys an immutable digest, checks readiness, and attempts rollback.
- `zenx-pos/DATABASE_PROMOTION_TRACKER.md`: TiDB-to-MySQL production gates.

The image serves the super-admin at `/`, APIs below `/api`, admin endpoints below `/admin`, and uploaded public files below `/uploads`.

## 3. Initial SSH access

Hostinger showed these values:

```text
SSH username: root
IPv4: 185.199.52.159
SSH command: ssh root@185.199.52.159
```

The downloaded root key is stored locally at:

```text
C:\Users\sasid\Downloads\185.199.52.159_id_ed25519
```

On Windows, OpenSSH rejected the key until its ACL was restricted. Run PowerShell as the same Windows user that owns the key:

```powershell
$Key = 'C:\Users\sasid\Downloads\185.199.52.159_id_ed25519'
$Account = "$env:USERDOMAIN\$env:USERNAME"
icacls $Key /inheritance:r
icacls $Key /remove:g 'sasidhar\CodexSandboxUsers'
icacls $Key /grant:r "${Account}:(R)"
```

Pin and verify the host key before automation:

```powershell
ssh-keyscan -t ed25519 185.199.52.159 > .\zenxpos_known_hosts
ssh-keygen -lf .\zenxpos_known_hosts
```

The verified ED25519 fingerprint during this setup was:

```text
SHA256:BfOPoh1VGyWMYJJypfBYFRZYJIvm4uIDvbHs4Ahhelo
```

Connect:

```powershell
ssh -i $Key -o StrictHostKeyChecking=yes -o UserKnownHostsFile=.\zenxpos_known_hosts root@185.199.52.159
```

For another VPS, verify its fingerprint through the provider console before trusting it.

## 4. Inspect the VPS before changing it

Run these commands as root:

```bash
. /etc/os-release && echo "$PRETTY_NAME"
nproc
free -h
df -h /
ss -lntp
ufw status
systemctl is-active nginx
systemctl is-active docker
docker ps -a
```

Observed during this setup:

- Ubuntu 24.04.4 LTS
- 4 CPU cores, 15 GiB RAM, 193 GB disk
- aaPanel and Nginx installed
- UFW allowed SSH, HTTP, HTTPS, aaPanel, and existing hosting services
- an existing `drcita_app` container used port 8088
- application ports 5100 and 5110 were free
- MySQL listened on the host, while UFW did not expose port 3306

Do not reuse a port until `ss` and `docker ps` both show that it is free.

## 5. Repair Docker when socket activation is broken

Docker CLI and Compose existed, but `docker.service` failed with:

```text
failed to load listeners: no sockets found via socket activation
```

The service used `dockerd -H fd://`, so `docker.socket` had to run first. The repair was:

```bash
systemctl daemon-reload
systemctl reset-failed docker.service docker.socket
systemctl restart docker.socket
systemctl start docker.service
systemctl enable docker.service docker.socket
systemctl is-active docker
docker version
docker compose version
docker ps -a
```

Starting Docker also restarts containers whose restart policy requires it. Inspect existing containers immediately afterward.

## 6. Create a dedicated deployment identity

Do not store the Hostinger root key in GitHub. Create a separate passwordless Ed25519 key for CI:

```powershell
ssh-keygen -q -t ed25519 -N "" -C "zenxpos-github-actions" -f "C:\Users\sasid\Downloads\zenxpos_github_actions_ed25519"
```

Restrict the private key ACL as shown in section 3. Copy only the `.pub` file to the server, then create the account:

```bash
useradd --create-home --shell /bin/bash zenxdeploy
install -d -m 700 -o zenxdeploy -g zenxdeploy /home/zenxdeploy/.ssh
install -m 600 -o zenxdeploy -g zenxdeploy \
  /tmp/zenxpos_github_actions_ed25519.pub \
  /home/zenxdeploy/.ssh/authorized_keys
```

The account intentionally has no `docker` group membership. Docker group membership gives root-equivalent host access.

## 7. Install the restricted root deployment command

The deployment account cannot upload or edit the Compose file, runtime secrets, or deployment script. Root owns them:

```bash
install -d -m 755 -o root -g root \
  /opt/zenxpos \
  /opt/zenxpos/staging \
  /opt/zenxpos/production

install -m 644 -o root -g root compose.yml \
  /opt/zenxpos/staging/compose.yml
install -m 644 -o root -g root compose.yml \
  /opt/zenxpos/production/compose.yml
install -m 755 -o root -g root remote-deploy.sh \
  /usr/local/sbin/zenxpos-deploy
```

Create `/etc/sudoers.d/zenxdeploy` with:

```sudoers
zenxdeploy ALL=(root) NOPASSWD: /usr/local/sbin/zenxpos-deploy
```

Validate and install it safely:

```bash
visudo -cf /tmp/zenxdeploy-sudoers
install -m 440 -o root -g root \
  /tmp/zenxdeploy-sudoers /etc/sudoers.d/zenxdeploy
```

The root-owned script accepts only `staging` or `production` and requires an image in this form:

```text
ghcr.io/<owner>/<image>@sha256:<64 lowercase hexadecimal characters>
```

Test the boundary:

```bash
# As zenxdeploy: this must fail.
docker info

# As zenxdeploy: this is the only allowed Docker deployment path.
sudo -n /usr/local/sbin/zenxpos-deploy --check staging
```

## 8. Install runtime secrets

Runtime secrets live only on the VPS:

```text
/opt/zenxpos/staging/app.env
/opt/zenxpos/production/app.env
```

They must be root-owned with mode 600:

```bash
chown root:root /opt/zenxpos/staging/app.env
chmod 600 /opt/zenxpos/staging/app.env
```

For the current staging environment, values came from `zenx-pos/zenx-pos-backend/.env`. `DATABASE_TEST_URL` was excluded and these deployment overrides were applied:

```dotenv
NODE_ENV=production
HOST=0.0.0.0
PORT=5100
PUBLIC_BASE_URL=https://staging-retail-api.zenxpos.com
UPLOAD_ROOT=/app/uploads
REDIS_KEY_PREFIX=zenxpos:staging:
```

Compose sets the container host, port, and final upload root again, so the container listens on port 5100 internally and stores uploaded files in its named volume. Staging uses the TiDB `DATABASE_URL` and Upstash REST credentials already present in the local environment.

Never print `app.env`, pass it as a command-line argument, add it to a Docker image, or save it in GitHub Actions logs.

## 9. Authenticate the VPS to GHCR

The deployment script pulls a private image as root. Create a GitHub token with only `read:packages`, then run this interactively on the VPS:

```bash
read -rsp 'GHCR token: ' GHCR_TOKEN
echo
printf '%s' "$GHCR_TOKEN" | docker login ghcr.io \
  --username <github-user> --password-stdin
unset GHCR_TOKEN
```

The credential stays in root's Docker credential configuration. For a public GHCR package, this login is unnecessary.

## 10. Configure GitHub environments

In GitHub, open **Settings -> Environments** and create `staging` and `production`. Add required reviewers to production.

Add these staging environment secrets:

| Secret | Value |
|---|---|
| `HOSTINGER_SSH_HOST` | `185.199.52.159` |
| `HOSTINGER_SSH_USER` | `zenxdeploy` |
| `HOSTINGER_SSH_PRIVATE_KEY` | Entire contents of `C:\Users\sasid\Downloads\zenxpos_github_actions_ed25519` |
| `HOSTINGER_SSH_KNOWN_HOSTS` | Verified `ssh-keyscan -t ed25519 185.199.52.159` line |

Add these staging variables:

| Variable | Value |
|---|---|
| `HOSTINGER_SSH_PORT` | `22` |
| `STAGING_URL` | `https://staging-retail-api.zenxpos.com` |

Production uses the same names in its environment, plus:

```text
PRODUCTION_URL=https://retail-api.zenxpos.com
PRODUCTION_DEPLOY_ENABLED=true
```

Keep `PRODUCTION_DEPLOY_ENABLED` absent until every production database gate is complete.

The repository or organization must allow GitHub Actions to create and write the `ghcr.io/vedaloop-software-projects/zenx-pos` package.

## 11. Create DNS records

In the DNS provider for `zenxpos.com`, create:

| Environment | Type | Name | Value |
|---|---|---|---|
| Staging | A | `staging-retail-api` | `185.199.52.159` |
| Production, later | A | `retail-api` | `185.199.52.159` |

Verify from more than one resolver:

```powershell
Resolve-DnsName staging-retail-api.zenxpos.com -Type A
nslookup staging-retail-api.zenxpos.com 1.1.1.1
```

The staging record resolved correctly during this setup. The production record was intentionally left unresolved.

## 12. Configure the aaPanel/Nginx reverse proxy

The working staging vhost path is:

```text
/www/server/panel/vhost/nginx/staging-retail-api.zenxpos.com.conf
```

Its HTTP proxy began as:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name staging-retail-api.zenxpos.com;

    access_log /www/wwwlogs/staging-retail-api.zenxpos.com.log;
    error_log /www/wwwlogs/staging-retail-api.zenxpos.com.error.log;

    client_max_body_size 25m;

    location / {
        proxy_pass http://127.0.0.1:5110;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 10s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

Always validate before reloading:

```bash
/usr/sbin/nginx -t
systemctl reload nginx
```

The equivalent aaPanel UI flow is **Website -> Proxy Project -> Add Proxy Project**, enter the hostname, set the target URL to `http://127.0.0.1:5110`, preserve the host header, save, and validate Nginx.

## 13. Enable HTTPS

After DNS resolves, request and install the certificate:

```bash
certbot --nginx --non-interactive --agree-tos --redirect \
  -d staging-retail-api.zenxpos.com
/usr/sbin/nginx -t
systemctl reload nginx
certbot certificates
systemctl list-timers | grep certbot
```

The staging certificate was issued successfully and expires on 2027-01-06. Certbot installed automatic renewal. Test renewal periodically:

```bash
certbot renew --dry-run
```

## 14. First staging deployment

Before pushing, validate locally:

```powershell
cd zenx-pos\zenx-pos-backend
npm ci
npm run build
npm test

cd ..\zenx-pos-superadmin
npm ci
npm run lint
npm run build

cd ..\..
docker build --file zenx-pos/Dockerfile --tag zenx-pos:local zenx-pos
```

Commit all intended ZenxPOS application and deployment files, review the diff, then push `sasi-dev`:

```powershell
git status --short
git diff --check
git add .github/workflows/zenx-pos-*.yml zenx-pos
git diff --cached --stat
git diff --cached
git commit -m "Deploy ZenxPOS staging stack"
git push origin sasi-dev
```

Do not blindly include unrelated changes under `dev/` or other projects.

The staging workflow then:

1. Builds and tests the Node.js backend.
2. Lints and builds the React super-admin.
3. Builds one production Docker image.
4. Pushes commit and staging tags to GHCR.
5. Resolves the pushed image to an immutable digest.
6. Connects as `zenxdeploy` using the pinned host key.
7. Calls the root-owned deployment command.
8. Waits for the container health check and `/api/ready`.
9. Verifies the public HTTPS readiness URL.

## 15. Verify a deployment

On the VPS:

```bash
docker ps --filter name=zenxpos-staging
docker inspect zenxpos-staging --format '{{json .State.Health}}'
docker logs --tail 100 zenxpos-staging
curl --fail http://127.0.0.1:5110/api/ready
curl --fail https://staging-retail-api.zenxpos.com/api/ready
```

From the workstation:

```powershell
Invoke-RestMethod https://staging-retail-api.zenxpos.com/api/ready
```

Also test super-admin login, API authentication, uploads, TiDB reads and writes, OTP storage, profile caching, product cache invalidation, and seed data manually.

## 16. Logs and troubleshooting

```bash
# Application
docker logs --tail 200 -f zenxpos-staging

# Container health and immutable image
docker inspect zenxpos-staging --format '{{.Config.Image}}'
docker inspect zenxpos-staging --format '{{json .State.Health}}'

# Nginx
tail -f /www/wwwlogs/staging-retail-api.zenxpos.com.log
tail -f /www/wwwlogs/staging-retail-api.zenxpos.com.error.log

# Docker service
systemctl status docker --no-pager
journalctl -u docker.service -n 100 --no-pager

# TLS
certbot certificates
curl -Iv https://staging-retail-api.zenxpos.com
```

A `502 Bad Gateway` means Nginx is reachable but nothing healthy is listening on `127.0.0.1:5110`. Check the container and application logs. A DNS failure means the A record has not propagated. An SSH host-key error means the pinned key differs; verify the new fingerprint through Hostinger before replacing the GitHub secret.

## 17. Rollback behavior

`zenxpos-deploy` records the currently running image before deployment. If the new container fails its health checks, it prints recent logs and attempts to restart the previous image. To deploy a known digest manually:

```bash
sudo /usr/local/sbin/zenxpos-deploy staging \
  ghcr.io/vedaloop-software-projects/zenx-pos@sha256:<digest>
```

Use digests from a successful GitHub Actions run or `docker inspect`. Never use `latest` for production promotion.

## 18. Production promotion

Staging uses TiDB. Production will use a new Hostinger MySQL database and its own root-only `app.env`. Follow `DATABASE_PROMOTION_TRACKER.md` before enabling production:

1. Create and back up the production MySQL database and restricted application user.
2. Verify the MySQL version, charset, collation, timezone, and TLS behavior.
3. Apply the Prisma schema as a reviewed baseline.
4. Resolve all foreign-key and compatibility gates recorded in the tracker.
5. Seed only required reference and admin records.
6. Test backup and restore.
7. Create `retail-api.zenxpos.com`, reverse proxy it to `127.0.0.1:5100`, and issue its certificate.
8. Install `/opt/zenxpos/production/app.env` with the production MySQL URL and unique production secrets.
9. Set `PRODUCTION_DEPLOY_ENABLED=true` only after the gates pass.
10. Run the production workflow manually with the exact digest tested in staging.

Do not copy staging transaction data into production and do not use truncation as the launch procedure.

## 19. Backup requirements

Back up these independently:

- TiDB or MySQL data using database-native backups.
- Docker named volume `zenxpos_staging_uploads` and later `zenxpos_production_uploads`.
- root-owned `app.env` files through an encrypted secret-management process.
- Nginx vhost files and certificate renewal configuration.

Test restoring into a separate database and volume before calling the backup process complete.

## 20. Current setup status

Completed on 2026-10-08:

- Hostinger root SSH verified.
- VPS host key pinned and fingerprint recorded.
- Docker socket/service repaired and enabled.
- Existing `drcita_app` container preserved and restarted by its policy.
- dedicated `zenxdeploy` key and account created.
- direct Docker access denied to `zenxdeploy`.
- root-owned restricted deployment command installed.
- staging Compose definition installed.
- TiDB, JWT, OTP, and Upstash staging configuration installed root-only.
- staging deployment readiness check passed.
- `staging-retail-api.zenxpos.com` DNS resolves to the VPS.
- Nginx reverse proxy installed for loopback port 5110.
- Let's Encrypt certificate installed with automatic renewal.

Remaining before the first application container is live:

1. Add the staging GitHub environment secrets and variables.
2. Authenticate root Docker on the VPS to private GHCR, or make the package public after its first publication.
3. Review and commit the intended ZenxPOS changes.
4. Push `sasi-dev` and observe the staging workflow.
5. Verify `/api/ready`, login, data, caching, and uploads.

