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
        +-> digest-pinned Docker MySQL 8.4 (`mysql:3306`, host loopback `127.0.0.1:3310`)
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
- `zenx-pos/deploy/app.env.example`: application runtime configuration template without secrets.
- `zenx-pos/deploy/mysql.env.example`: MySQL runtime secret template without secrets.
- `zenx-pos/deploy/mysql-init/001-schema.sql`: reviewed initial schema used only when the MySQL volume is empty.
- `zenx-pos/deploy/remote-deploy.sh`: validates input, deploys an immutable digest, checks readiness, and attempts rollback.
- `zenx-pos/DATABASE_PROMOTION_TRACKER.md`: staging verification and production database gates.

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
/opt/zenxpos/staging/mysql.env
/opt/zenxpos/production/app.env
/opt/zenxpos/production/mysql.env
```

They must be root-owned with mode 600:

```bash
chown root:root /opt/zenxpos/staging/app.env
chmod 600 /opt/zenxpos/staging/app.env
chown root:root /opt/zenxpos/staging/mysql.env
chmod 600 /opt/zenxpos/staging/mysql.env
```

For the current staging environment, values came from `zenx-pos/zenx-pos-backend/.env`. `DATABASE_TEST_URL` was excluded and these deployment overrides were applied:

```dotenv
NODE_ENV=production
HOST=0.0.0.0
PORT=5100
PUBLIC_BASE_URL=https://staging-retail-api.zenxpos.com
UPLOAD_ROOT=/app/public
REDIS_KEY_PREFIX=zenxpos:staging:
DATABASE_URL=mysql://zenxpos_app:<URL_ENCODED_PASSWORD>@mysql:3306/zenxpos_staging
DB_SSL=false
DB_ALLOW_PLAINTEXT_PRIVATE=true
DB_TRANSACTION_TIMEOUT_MS=30000
LOG_LEVEL=info
```

Create `mysql.env` from `deploy/mysql.env.example` with a unique application password and root password. Compose starts MySQL on its private Docker network, publishes it only to VPS loopback port 3310 for administration, and persists data in `zenxpos_staging_mysql`. The application reaches it as `mysql:3306`. Compose also stores uploads in `zenxpos_staging_uploads`. Upstash remains the Redis provider.

Never print `app.env` or `mysql.env`, pass their values as command-line arguments, add them to a Docker image, or save them in GitHub Actions logs.

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
| `HOSTINGER_SSH_PRIVATE_KEY` | Entire contents of `C:\Users\sasid\Downloads\zenxpos_github_actions_ed25519` |

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

The VPS IP, `zenxdeploy` username, and verified VPS ED25519 host key are public deployment configuration pinned directly in both workflows. The recorded host fingerprint is `SHA256:BfOPoh1VGyWMYJJypfBYFRZYJIvm4uIDvbHs4Ahhelo`. The workflows also derive the configured private key's public fingerprint and require `SHA256:COgbyHgZW5D5eHg1HKNcQBLusOyzpYM4smQ2yYppoo0` before opening SSH. If Hostinger replaces the server or the deployment key is rotated, verify the new fingerprints before changing the workflow.

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
docker inspect zenxpos-staging-mysql --format '{{json .State.Health}}'
docker logs --tail 100 zenxpos-staging
docker logs --tail 100 zenxpos-staging-mysql
curl --fail http://127.0.0.1:5110/api/ready
curl --fail https://staging-retail-api.zenxpos.com/api/ready
```

From the workstation:

```powershell
Invoke-RestMethod https://staging-retail-api.zenxpos.com/api/ready
```

Also test super-admin login, API authentication, uploads, MySQL reads and writes, OTP storage, profile caching, product cache invalidation, and imported/seeded data manually.

## 16. Monitor deployments without the GitHub UI

The easiest command-line method is GitHub CLI. Authenticate once with `gh auth login`, then run these commands from the repository root:

```powershell
# List recent staging runs and copy the run ID.
gh run list --branch sasi-dev --workflow "ZenxPOS Staging CD" --limit 10

# Watch one run until it succeeds or fails. The command returns a failing exit code on failure.
gh run watch <RUN_ID> --exit-status

# Show jobs and steps.
gh run view <RUN_ID> --json status,conclusion,jobs

# Print only failed logs.
gh run view <RUN_ID> --log-failed
```

If `gh` is unavailable, the GitHub REST API can use the credential already stored by Git. This script does not print the credential and clears it from the PowerShell variables afterward:

```powershell
$Owner = 'vedaloop-software-projects'
$Repository = 'slifax-projects'
$Branch = 'sasi-dev'

$CredentialLines = @(
  'protocol=https'
  'host=github.com'
  ''
) | git credential fill

$Credential = @{}
foreach ($Line in $CredentialLines) {
  if ($Line -match '^([^=]+)=(.*)$') {
    $Credential[$matches[1]] = $matches[2]
  }
}

try {
  if (-not $Credential.ContainsKey('password')) {
    throw 'No stored GitHub credential is available.'
  }

  $Headers = @{
    Accept = 'application/vnd.github+json'
    Authorization = "Bearer $($Credential.password)"
    'X-GitHub-Api-Version' = '2022-11-28'
    'User-Agent' = 'ZenxPOS-Deployment-Monitor'
  }

  $RunsUri = "https://api.github.com/repos/$Owner/$Repository/actions/runs?branch=$Branch&per_page=10"
  $Runs = Invoke-RestMethod -Uri $RunsUri -Headers $Headers
  $Runs.workflow_runs |
    Select-Object id, name, status, conclusion, head_sha, html_url |
    Format-Table -AutoSize

  # Replace this with the staging run ID printed above.
  $RunId = <RUN_ID>
  $JobsUri = "https://api.github.com/repos/$Owner/$Repository/actions/runs/$RunId/jobs"
  $Jobs = Invoke-RestMethod -Uri $JobsUri -Headers $Headers
  $Jobs.jobs | Select-Object id, name, status, conclusion | Format-Table -AutoSize
  $Jobs.jobs.steps | Select-Object name, status, conclusion | Format-Table -AutoSize
}
finally {
  $Credential.Clear()
  Remove-Variable CredentialLines -ErrorAction SilentlyContinue
}
```

Monitor the deployment target directly from PowerShell:

```powershell
$Key = 'C:\Users\sasid\Downloads\185.199.52.159_id_ed25519'

ssh -i $Key root@185.199.52.159 @'
echo '[container]'
docker ps -a --filter name=zenxpos-staging
echo '[images]'
docker images ghcr.io/vedaloop-software-projects/zenx-pos --digests
echo '[health]'
curl --fail --show-error http://127.0.0.1:5110/api/ready
'@

Invoke-WebRequest \
  -Uri 'https://staging-retail-api.zenxpos.com/api/ready' \
  -UseBasicParsing
```

Interpret the sequence as follows:

1. `validate` tests the backend and super-admin.
2. `publish` builds and pushes the immutable GHCR image.
3. `deploy` verifies SSH, pulls the image on the VPS, starts Compose, and checks readiness.
4. The container cannot appear in aaPanel until the `deploy` job reaches the deployment command.
5. A temporary HTTPS `502` means Nginx works but no healthy process is listening on loopback port 5110.

SSH errors have distinct meanings:

- `Host key verification failed` means the pinned VPS identity is missing or different.
- `Permission denied (publickey,password)` means the configured deployment private key does not match `/home/zenxdeploy/.ssh/authorized_keys`.
- The expected dedicated deployment-key fingerprint is `SHA256:COgbyHgZW5D5eHg1HKNcQBLusOyzpYM4smQ2yYppoo0`.

## 17. Logs and troubleshooting

```bash
# Application
docker logs --tail 200 -f zenxpos-staging

# MySQL health, resource use, and logs
docker inspect zenxpos-staging-mysql --format '{{json .State.Health}}'
docker stats --no-stream zenxpos-staging zenxpos-staging-mysql
docker logs --tail 200 -f zenxpos-staging-mysql

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

## 18. Rollback behavior

`zenxpos-deploy` records the currently running image before deployment. If the new container fails its health checks, it prints recent logs and attempts to restart the previous image. To deploy a known digest manually:

```bash
sudo /usr/local/sbin/zenxpos-deploy staging \
  ghcr.io/vedaloop-software-projects/zenx-pos@sha256:<digest>
```

Use digests from a successful GitHub Actions run or `docker inspect`. Never use `latest` for production promotion.

## 19. Production promotion

Staging uses its own Docker MySQL volume. Production will use a separate MySQL database/volume and separate root-only `app.env` and `mysql.env`. Follow `DATABASE_PROMOTION_TRACKER.md` before enabling production:

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

## 20. Backup requirements

Back up these independently:

- MySQL data using `mysqldump` plus tested volume/database restore procedures.
- Docker named volume `zenxpos_staging_uploads` and later `zenxpos_production_uploads`.
- root-owned `app.env` and `mysql.env` files through an encrypted secret-management process.
- Nginx vhost files and certificate renewal configuration.

Test restoring into a separate database and volume before calling the backup process complete.

## 21. Current setup status

Completed through 2026-10-12:

- Hostinger root SSH verified.
- VPS host key pinned and fingerprint recorded.
- Docker socket/service repaired and enabled.
- Existing `drcita_app` container preserved and restarted by its policy.
- dedicated `zenxdeploy` key and account created.
- direct Docker access denied to `zenxdeploy`.
- root-owned restricted deployment command installed.
- staging Compose definition installed.
- Docker MySQL, JWT, OTP, and Upstash staging configuration installed root-only.
- staging deployment readiness check passed.
- `staging-retail-api.zenxpos.com` DNS resolves to the VPS.
- Nginx reverse proxy installed for loopback port 5110.
- Let's Encrypt certificate installed with automatic renewal.
- immutable staging image `ghcr.io/vedaloop-software-projects/zenx-pos@sha256:293ca467ec0bc7e540dd796933189455f017080f32519d5ca9774fbc6f0e2a0e` deployed successfully.
- digest-pinned MySQL 8.4.11 runs as `zenxpos-staging-mysql`, persists in `zenxpos_staging_mysql`, and exposes only `127.0.0.1:3310` for host administration.
- the legacy MySQL dump was mapped into the Prisma schema and 8,184 rows were committed; post-deploy checks include `users=2`, `products=1020`, `audits=2520`, and `admins=1`.
- the application reports `mysql` as its database hostname and emits Pino `http_request` JSON for every completed request.
- the staging `HOSTINGER_SSH_PRIVATE_KEY` secret was replaced with the verified dedicated key and the failed deploy job reran successfully.
- `zenxpos-staging` reports healthy on `127.0.0.1:5110`.
- local and public `/api/ready` checks return `Database is ready`.

Remaining staging verification:

1. Test login, client create/edit, logo preview/upload, business data, Redis caching, and administrative workflows manually.
2. Complete the backup/restore drill before production promotion.

## 22. Actual rollout flow used for ZenxPOS

This is the chronological flow followed from 2026-10-08 through 2026-10-12. The earlier sections are reusable instructions; this section records what actually happened during this deployment.

1. **Obtained VPS access from Hostinger.**
   - Hostinger provided the root SSH username, VPS address `185.199.52.159`, and the downloadable Ed25519 private key.
   - The downloaded root key was saved as `C:\Users\sasid\Downloads\185.199.52.159_id_ed25519`.
   - aaPanel did not issue this key. Hostinger provides VPS access; aaPanel is the control panel running inside the VPS.

2. **Restricted the downloaded key on Windows.**
   - Windows OpenSSH initially rejected the key because its ACL allowed another local group to read it.
   - Inheritance was removed and read access was granted only to the current Windows account.
   - Root SSH was then verified with `ssh -i <root-key> root@185.199.52.159`.

3. **Pinned the VPS identity.**
   - The ED25519 host key was recorded instead of disabling strict verification.
   - Its verified fingerprint is `SHA256:BfOPoh1VGyWMYJJypfBYFRZYJIvm4uIDvbHs4Ahhelo`.

4. **Inspected the existing VPS before deploying.**
   - Confirmed Ubuntu 24.04, 4 CPU cores, 15 GiB RAM, disk availability, aaPanel, Nginx, UFW, MySQL, Redis, and occupied ports.
   - Found the existing `drcita_app` Docker container and preserved it.
   - Confirmed ports 5100 and 5110 were available for ZenxPOS.

5. **Repaired the existing Docker installation.**
   - Docker CLI and Compose were installed, but `docker.service` had failed because socket activation was unavailable.
   - Reset `docker.service` and `docker.socket`, restarted the socket first, started Docker, and enabled both units.
   - Confirmed the existing container resumed through its restart policy.

6. **Created a separate CI deployment key.**
   - Generated `C:\Users\sasid\Downloads\zenxpos_github_actions_ed25519` without a passphrase for GitHub Actions.
   - Installed only its public key for the new `zenxdeploy` VPS account.
   - The dedicated key fingerprint is `SHA256:COgbyHgZW5D5eHg1HKNcQBLusOyzpYM4smQ2yYppoo0`.

7. **Created a restricted VPS deployment account.**
   - Created `zenxdeploy` with its own home directory and `authorized_keys`.
   - Did not add it to the Docker group because Docker membership is root-equivalent.
   - Installed a root-owned `/usr/local/sbin/zenxpos-deploy` command and allowed `zenxdeploy` to run only that command through passwordless sudo.

8. **Prepared the VPS application directories.**
   - Created `/opt/zenxpos/staging` and `/opt/zenxpos/production` as root-owned directories.
   - Installed root-owned Compose definitions.
   - Installed Docker MySQL credentials in `/opt/zenxpos/staging/mysql.env` and application, JWT, OTP, and Upstash configuration in `/opt/zenxpos/staging/app.env`, both root-owned with mode 600.
   - Applied staging values for `PUBLIC_BASE_URL`, cache prefix, runtime host, port, and upload directory.

9. **Built the repository deployment system.**
   - Added the production Dockerfile and `.dockerignore`.
   - Added CI, staging CD, and guarded manual production CD workflows.
   - Configured the image to contain the compiled Node backend and built super-admin frontend.
   - Configured the container as read-only with dropped capabilities, resource limits, a persistent uploads volume, log rotation, and a readiness health check.

10. **Configured GitHub Container Registry.**
    - GitHub Actions uses its repository `GITHUB_TOKEN` to publish `ghcr.io/vedaloop-software-projects/zenx-pos`.
    - Root Docker on the VPS was authenticated with a classic GitHub token limited to `read:packages`.
    - Confirmed that the VPS could pull the private staging image.

11. **Configured the staging GitHub environment.**
    - Created the `staging` environment.
    - Added `HOSTINGER_SSH_PRIVATE_KEY` and the staging URL/port configuration.
    - The VPS address, `zenxdeploy` username, host key, and expected deployment-key fingerprint were later pinned in the workflows because they are public deployment identity data.

12. **Created public DNS.**
    - Added the `staging-retail-api` A record for `zenxpos.com` pointing to `185.199.52.159`.
    - Verified `staging-retail-api.zenxpos.com` resolved to the VPS.

13. **Created the aaPanel/Nginx reverse proxy.**
    - Added a vhost for `staging-retail-api.zenxpos.com`.
    - Proxied requests to `http://127.0.0.1:5110`.
    - Kept port 5110 private to the VPS loopback interface.
    - Forwarded the host, real IP, forwarded IP chain, and original scheme headers.

14. **Enabled HTTPS.**
    - Used the existing Certbot installation to issue a Let's Encrypt certificate.
    - Enabled HTTP-to-HTTPS redirection and automatic renewal.
    - Validated Nginx before every reload.

15. **Pushed the first deployment attempt to `sasi-dev`.**
    - CI and staging CD started without merging into `main`.
    - CI failed because three conversion-era tests expected the private legacy `dev/` Laravel checkout.
    - Removed legacy migration parity from runtime CI because the converted Node application is now the deployment source.
    - Re-ran the current backend suite: build passed and all 124 Node tests passed.

16. **Removed the retired mobile application.**
    - The already-deleted `zenx-pos/ZENX_POS` directory contained 405 tracked files and approximately 106,827 deleted lines.
    - Committed the directory removal once and added `/zenx-pos/ZENX_POS/` to the root `.gitignore` so it cannot be accidentally restored.
    - Kept the unrelated local `dev` submodule changes out of the commit.

17. **Diagnosed the first CD SSH failure.**
    - Validation and GHCR publication passed, but CD stopped at `Host key verification failed`.
    - The `HOSTINGER_SSH_KNOWN_HOSTS` environment secret did not match the SSH destination format.
    - Pinned the already-verified public host key directly in the workflows and removed that unnecessary secret.

18. **Diagnosed the second CD SSH failure.**
    - Host verification passed, but SSH returned `Permission denied (publickey,password)`.
    - Confirmed the local dedicated key and VPS `authorized_keys` both had fingerprint `SHA256:COgbyHgZW5D5eHg1HKNcQBLusOyzpYM4smQ2yYppoo0`.
    - Added a workflow fingerprint check so CD fails before SSH with a precise message when GitHub loads a different private key.
    - Replaced the staging environment secret with the complete dedicated private-key file and verified the expected fingerprint before rerunning CD.

19. **Monitored workflows without relying on the browser.**
    - Queried private GitHub Actions runs and job steps through the GitHub REST API using the existing Git credential without printing it.
    - Downloaded failed job logs temporarily, filtered relevant errors, and deleted the temporary logs.
    - Used SSH to monitor Docker images, containers, ports, local readiness, and the public HTTPS endpoint.
    - The reusable commands are in section 16.

20. **Recovered the deployment using the published immutable image.**
    - GHCR publication had already succeeded even though GitHub-to-VPS SSH failed.
    - Pulled the published `staging` tag through the root bootstrap connection.
    - Resolved and deployed immutable digest `sha256:ac52cd01d5fcad535136dd2cf2125334d0d749eda528cd878e4fb60041db00d8` through the same root-owned deployment command used by CD.

21. **Verified the live staging application.**
    - Confirmed `zenxpos-staging` was healthy.
    - Confirmed its only published port was `127.0.0.1:5110->5100/tcp`.
    - Confirmed both `http://127.0.0.1:5110/api/ready` and `https://staging-retail-api.zenxpos.com/api/ready` returned `Database is ready`.

22. **Moved staging from TiDB to Docker MySQL.**
    - Added a digest-pinned MySQL 8.4 service, private Docker networking, loopback-only administration on port 3310, health checks, resource limits, log rotation, and the persistent `zenxpos_staging_mysql` volume.
    - Installed separate root-owned `app.env` and `mysql.env` files with mode 600.
    - Imported the compatible legacy dump into the Prisma-managed schema and verified key table counts after container recreation.

23. **Reduced client-update transaction work.**
    - Moved bcrypt hashing outside interactive transactions.
    - Replaced per-grant query loops with bulk reads, updates, and `createMany` writes to address Prisma `P2028` timeout failures.

24. **Enabled Pino request logging.**
    - Every completed request now records method, path, status, duration, request ID, aborted state, and remote address as structured JSON.
    - Passwords, tokens, authorization headers, cookies, secrets, and database URLs remain redacted.

25. **Restored automatic staging CD.**
    - The first deploy attempt failed before SSH because the GitHub secret contained a different private key.
    - Deployed the already-published immutable digest through the root recovery path, replaced the encrypted staging secret with the verified dedicated key, and reran the failed deploy job successfully.

## 23. Problems encountered and what fixed them

| Symptom | Cause | Resolution | Reusable lesson |
|---|---|---|---|
| SSH initially appeared unreachable | The restricted execution environment blocked the first network probe | Retried the authorized SSH probe with network permission | Distinguish a local execution restriction from a VPS firewall failure |
| `UNPROTECTED PRIVATE KEY FILE` | The downloaded Windows key ACL was too broad | Removed inherited permissions and granted only the current user read access | Fix private-key permissions before debugging server authentication |
| Docker CLI existed but the daemon was unavailable | `docker.socket` had failed, while Docker used `-H fd://` socket activation | Reset and restarted the socket before starting Docker | Inspect systemd units and logs before reinstalling Docker |
| Proposed CI user had Docker-group access | Docker-group membership is effectively root access | Used a root-owned validated deploy command with narrow sudo permission | CI accounts should invoke a controlled deployment entry point |
| GitHub tests could not find `dev/app/Models` and other Laravel files | Runtime CI still ran conversion-era tests against a private legacy checkout | Removed legacy parity checks from runtime CI; retained current Node tests | Deployment CI should validate the deployable application, not retired source |
| IDE showed more than 10,000 changes after deleting the old mobile app | Git represented 405 tracked file deletions as 106,827 removed lines | Committed the removal once and added a root ignore rule | `.gitignore` cannot hide deletions of tracked files; commit the removal |
| `Host key verification failed` | The known-hosts secret did not match the actual SSH destination entry | Verified the fingerprint and pinned the public host key in workflow code | Host keys are public identity data and should be reviewed and pinned |
| `Permission denied (publickey,password)` or dedicated-key fingerprint mismatch | GitHub loaded a private key different from the key authorized for `zenxdeploy` | Added an expected fingerprint check and replaced the staging environment secret with the verified dedicated key | Validate a CI private key's derived public fingerprint before opening SSH |
| Prisma update failed with `P2028` | Password hashing and many per-feature/per-role queries kept an interactive transaction open too long | Hashed outside the transaction and batched feature/grant reads and writes | Keep interactive transactions short and avoid network-sized query loops inside them |
| aaPanel showed no ZenxPOS container while Actions looked active | The workflow was still validating or publishing and had not reached deploy | Queried run jobs and checked Docker directly | A container can appear only after the deploy job starts successfully |
| Public API returned `502` during setup | Nginx and TLS worked, but nothing listened on loopback port 5110 | Deployed the container and verified readiness locally first | A proxy `502` is an upstream availability signal, not a DNS or certificate failure |
| CD failed after the image was published | Validation/publish and deployment are separate jobs | Pulled and deployed the immutable published digest through the root recovery path | Preserve immutable artifacts so a failed delivery step can be recovered safely |

