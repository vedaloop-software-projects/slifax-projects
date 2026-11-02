#!/usr/bin/env bash
set -Eeuo pipefail

environment="${1:-}"
image="${2:-}"
case "$environment" in
  staging|production) ;;
  *) echo "Environment must be staging or production." >&2; exit 2 ;;
esac

app_container="zenxpos-$environment"
mysql_container="zenxpos-$environment-mysql"
# Overridable only for local verification; sudo on the server resets the environment.
deploy_root="${ZENXPOS_DEPLOY_ROOT:-/opt/zenxpos}"
backup_root="$deploy_root/$environment/backups"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

docker inspect "$mysql_container" >/dev/null
mkdir -p "$backup_root"
chmod 700 "$backup_root"

if [[ -n "$image" ]]; then
  [[ "$image" =~ ^ghcr\.io/[a-z0-9._/-]+@sha256:[a-f0-9]{64}$ ]] || { echo "Migration image must use an immutable GHCR digest." >&2; exit 2; }
  migration_container="$(docker create "$image")"
  trap 'docker rm -f "${migration_container:-}" >/dev/null 2>&1 || true; rm -rf "$work"' EXIT
  docker cp "$migration_container:/app/migrations/." "$work/"
  docker rm "$migration_container" >/dev/null
  migration_container=""
elif docker inspect "$app_container" >/dev/null 2>&1 && docker cp "$app_container:/app/migrations/." "$work/" 2>/dev/null; then
  :
else
  fallback="$deploy_root/$environment/migrations"
  test -d "$fallback" || { echo "No packaged or host migration directory is available." >&2; exit 1; }
  cp -a "$fallback/." "$work/"
fi
mapfile -t migrations < <(find "$work" -maxdepth 1 -type f -name '*.sql' -printf '%f\n' | LC_ALL=C sort)
if (( ${#migrations[@]} == 0 )); then
  echo "No versioned SQL migrations were found in $app_container." >&2
  exit 1
fi

mysql_exec() {
  docker exec -i "$mysql_container" sh -lc 'exec mysql --batch --skip-column-names -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' 
}

printf '%s\n' 'CREATE TABLE IF NOT EXISTS `zenxpos_schema_migrations` (`name` VARCHAR(255) NOT NULL, `checksum` CHAR(64) NOT NULL, `applied_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (`name`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;' | mysql_exec

pending=()
for name in "${migrations[@]}"; do
  [[ "$name" =~ ^[0-9]{8,14}_[a-z0-9_]+\.sql$ ]] || { echo "Invalid migration filename: $name" >&2; exit 1; }
  file="$work/$name"
  checksum="$(sha256sum "$file" | awk '{print $1}')"
  recorded="$(printf "SELECT checksum FROM zenxpos_schema_migrations WHERE name='%s';\n" "$name" | mysql_exec)"
  if [[ -n "$recorded" ]]; then
    [[ "$recorded" == "$checksum" ]] || { echo "Migration $name changed after it was applied." >&2; exit 1; }
    echo "Already applied: $name"
    continue
  fi
  pending+=("$name")
done

if (( ${#pending[@]} == 0 )); then
  echo "All database migrations were already applied."
  exit 0
fi

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup="$backup_root/pre-migration-$timestamp.sql.gz"
docker exec "$mysql_container" sh -lc 'exec mysqldump --single-transaction --routines --triggers --events -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' | gzip -9 > "$backup"
gzip -t "$backup"
chmod 600 "$backup"

for name in "${pending[@]}"; do
  file="$work/$name"
  checksum="$(sha256sum "$file" | awk '{print $1}')"
  mysql_exec < "$file"
  printf "INSERT INTO zenxpos_schema_migrations (name, checksum) VALUES ('%s', '%s');\n" "$name" "$checksum" | mysql_exec
  echo "Applied: $name"
done

find "$backup_root" -maxdepth 1 -type f -name 'pre-migration-*.sql.gz' -mtime +14 -delete
echo "All database migrations are applied. Backup: $backup"
