#!/usr/bin/env bash
# Proves that a brand-new environment works before an image is published:
#   1. the pinned MySQL image initialises an empty volume from deploy/mysql-init;
#   2. deploy/apply-migrations.sh applies every pending migration, and a second run is a no-op;
#   3. the resulting schema matches the backend's Prisma schema (only allow-listed differences);
#   4. platform reference data is present (--require-reference-data);
#   5. the application image boots against it, creates the first super-admin, passes /api/ready,
#      and the super-admin can sign in and load the client-onboarding prerequisites.
# Usage (CI, from the zenx-pos directory, with Docker, Node and backend node_modules available):
#   deploy/verify-fresh-database.sh <app-image> [--require-reference-data]
set -Eeuo pipefail

app_image="${1:?Usage: verify-fresh-database.sh <app-image> [--require-reference-data]}"
require_reference=false
[[ "${2:-}" == --require-reference-data ]] && require_reference=true

deploy_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
backend_dir="$(cd "$deploy_dir/../zenx-pos-backend" && pwd)"
environment=production
database="zenxpos_$environment"
mysql_container="zenxpos-$environment-mysql"
app_container="zenxpos-verify-app"
network="zenxpos-verify"
mysql_image="$(grep -oE 'mysql@sha256:[a-f0-9]{64}' "$deploy_dir/remote-deploy.sh" | head -1)"
app_password="$(openssl rand -hex 18)"
root_password="$(openssl rand -hex 18)"
admin_mobile=9000000001
admin_password="Verify-$(openssl rand -hex 8)#A1"
db_port=33060
app_port=51990

fail() { echo "::error::$*" >&2; exit 1; }
cleanup() {
  docker rm -f "$app_container" "$mysql_container" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
}
trap cleanup EXIT
cleanup

[[ -n "$mysql_image" ]] || fail 'Could not read the pinned MySQL image from remote-deploy.sh.'
docker inspect "$mysql_container" >/dev/null 2>&1 && fail "$mysql_container already exists; refusing to run on a host with a real environment."

echo '== 1. Initialise an empty MySQL volume from deploy/mysql-init'
docker network create "$network" >/dev/null
docker run -d --name "$mysql_container" --network "$network" --network-alias mysql \
  -e MYSQL_DATABASE="$database" -e MYSQL_USER=zenxpos_app -e MYSQL_PASSWORD="$app_password" -e MYSQL_ROOT_PASSWORD="$root_password" \
  -p "127.0.0.1:$db_port:3306" -v "$deploy_dir/mysql-init:/docker-entrypoint-initdb.d:ro" \
  "$mysql_image" mysqld --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci --skip-name-resolve >/dev/null
for _ in {1..90}; do
  if docker logs "$mysql_container" 2>&1 | grep -q 'MySQL init process done' &&
     docker exec "$mysql_container" mysqladmin ping -h 127.0.0.1 -uzenxpos_app -p"$app_password" --silent >/dev/null 2>&1; then
    initialised=true; break
  fi
  if docker logs "$mysql_container" 2>&1 | grep -qE '\[ERROR\]|ERROR [0-9]{4}'; then docker logs --tail 40 "$mysql_container" >&2; fail 'mysql-init failed.'; fi
  sleep 2
done
[[ "${initialised:-}" == true ]] || { docker logs --tail 40 "$mysql_container" >&2; fail 'MySQL did not finish initialising.'; }

echo '== 2. Apply migrations with the deployment script (twice)'
# CI runners use sudo and /opt/zenxpos like the server; ZENXPOS_DEPLOY_ROOT allows a local run.
deploy_root="${ZENXPOS_DEPLOY_ROOT:-/opt/zenxpos}"
as_root=(sudo env ZENXPOS_DEPLOY_ROOT="$deploy_root"); [[ -n "${ZENXPOS_DEPLOY_ROOT:-}" ]] && as_root=(env)
"${as_root[@]}" mkdir -p "$deploy_root/$environment/migrations"
"${as_root[@]}" find "$deploy_root/$environment/migrations" -maxdepth 1 -name '*.sql' -delete
"${as_root[@]}" cp "$deploy_dir"/sql/*.sql "$deploy_root/$environment/migrations/"
"${as_root[@]}" bash "$deploy_dir/apply-migrations.sh" "$environment"
second="$("${as_root[@]}" bash "$deploy_dir/apply-migrations.sh" "$environment")"
grep -q 'All database migrations were already applied.' <<< "$second" || { echo "$second" >&2; fail 'A second migration run was not a no-op.'; }

echo '== 3. Compare the schema with the Prisma schema'
diff_output="$(cd "$backend_dir" && DB_SSL=false DATABASE_URL="mysql://zenxpos_app:$app_password@127.0.0.1:$db_port/$database" \
  npx prisma migrate diff --from-config-datasource --to-schema models/database/schema/schema.prisma --script 2>&1)" || { echo "$diff_output" >&2; fail 'prisma migrate diff failed.'; }
actual="$(grep -vE '^\s*$|^--|Loaded Prisma config' <<< "$diff_output" | LC_ALL=C sort)"
expected="$(grep -vE '^\s*$|^--' "$deploy_dir/schema-drift-allowlist.sql" | LC_ALL=C sort)"
if [[ "$actual" != "$expected" ]]; then
  diff <(echo "$expected") <(echo "$actual") >&2 || true
  fail 'The new database schema does not match the Prisma schema (see the diff; update a migration, or the allow-list if intended).'
fi

echo '== 4. Reference data'
count() { docker exec "$mysql_container" mysql --batch --skip-column-names -uzenxpos_app -p"$app_password" "$database" -e "SELECT COUNT(*) FROM $1" 2>/dev/null; }
for table in features sub_features business_types states; do
  rows="$(count "$table")"
  echo "$table: $rows rows"
  if [[ "$rows" == 0 ]]; then
    if [[ "$require_reference" == true ]]; then fail "$table is empty: add the platform reference data migration (deploy/export-reference-data.sh)."; fi
    echo "::warning::$table is empty on a new database; production requires the platform reference data migration."
  fi
done

echo '== 5. Boot the application image against the new database'
docker run -d --name "$app_container" --network "$network" --read-only --tmpfs /tmp \
  -e NODE_ENV=production -e HOST=0.0.0.0 -e PORT=5100 -e LOG_LEVEL=warn \
  -e DATABASE_URL="mysql://zenxpos_app:$app_password@mysql:3306/$database" -e DB_SSL=false -e DB_ALLOW_PLAINTEXT_PRIVATE=true -e DB_TIMEZONE=+05:30 \
  -e JWT_SECRET="$(openssl rand -base64 48)" -e JWT_ISSUER=zenx-pos-api -e JWT_AUDIENCE=zenx-pos-client -e JWT_LIFETIME=8h \
  -e ADMIN_PATH=/admin -e ADMIN_SESSION_SECRET="$(openssl rand -base64 48)" -e RESET_HMAC_SECRET="$(openssl rand -base64 48)" \
  -e INTEGRATION_CREDENTIALS_MASTER_KEY="$(openssl rand -base64 32)" -e PUBLIC_BASE_URL="http://127.0.0.1:$app_port" \
  -p "127.0.0.1:$app_port:5100" "$app_image" >/dev/null
for _ in {1..45}; do curl --fail --silent "http://127.0.0.1:$app_port/api/ready" >/dev/null && ready=true && break; sleep 2; done
[[ "${ready:-}" == true ]] || { docker logs --tail 60 "$app_container" >&2; fail 'The application did not become ready.'; }

docker exec -e ADMIN_CREATE_FIRST=true -e ADMIN_RESET_MOBILE="$admin_mobile" -e ADMIN_RESET_PASSWORD="$admin_password" \
  "$app_container" node dist/models/database/reset-admin.js
jar="$(mktemp)"
status="$(curl --silent --output /dev/null --write-out '%{http_code}' --cookie-jar "$jar" -H 'Content-Type: application/json' -H 'Accept: application/json' \
  --data "{\"mobile\":\"$admin_mobile\",\"password\":\"$admin_password\"}" "http://127.0.0.1:$app_port/admin/login")"
[[ "$status" == 200 ]] || fail "Super-admin login returned HTTP $status."
prerequisites="$(curl --fail --silent --cookie "$jar" -H 'Accept: application/json' "http://127.0.0.1:$app_port/admin/prerequisites")" || fail 'Super-admin prerequisites request failed.'
rm -f "$jar"
if [[ "$require_reference" == true ]] && grep -q '"features":\[\]' <<< "$prerequisites"; then fail 'Super-admin cannot see any features for client onboarding.'; fi
curl --fail --silent --output /dev/null "http://127.0.0.1:$app_port/admin" || fail 'The super-admin app is not served.'

echo 'A new environment initialises, migrates, matches the schema and serves the API and super-admin.'
