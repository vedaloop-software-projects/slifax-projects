#!/usr/bin/env bash
set -Eeuo pipefail

check_only=false
if [[ "${1:-}" == "--check" ]]; then
  check_only=true
  shift
fi

environment="${1:-}"
image="${2:-}"
case "$environment" in
  # Both environments share the VPS, so each needs its own loopback API and MySQL ports.
  staging) port=5110; mysql_port=3310 ;;
  production) port=5100; mysql_port=3311 ;;
  *) echo "Environment must be staging or production." >&2; exit 2 ;;
esac
if [[ "$check_only" != true && ! "$image" =~ ^ghcr\.io/[a-z0-9._/-]+@sha256:[a-f0-9]{64}$ ]]; then
  echo "Deployment requires an immutable GHCR image digest." >&2
  exit 2
fi

directory="/opt/zenxpos/$environment"
compose="$directory/compose.yml"
runtime="$directory/runtime.env"
app_env="$directory/app.env"
mysql_env="$directory/mysql.env"
container="zenxpos-$environment"
mysql_container="zenxpos-$environment-mysql"
expected_upload_mount="volume|zenxpos_${environment}_uploads|true"
expected_mysql_mount="volume|zenxpos_${environment}_mysql|true"
expected_log_mount="volume|zenxpos_${environment}_logs|true"

test -f "$compose" || { echo "Missing $compose" >&2; exit 2; }
test -f "$app_env" || { echo "Missing $app_env; create it from app.env.example first." >&2; exit 2; }
test -f "$mysql_env" || { echo "Missing $mysql_env; create it from mysql.env.example first." >&2; exit 2; }
test "$(stat -c '%a' "$app_env")" = "600" || { echo "$app_env must have mode 600." >&2; exit 2; }
test "$(stat -c '%a' "$mysql_env")" = "600" || { echo "$mysql_env must have mode 600." >&2; exit 2; }
test "$(stat -c '%U' "$compose")" = "root" || { echo "$compose must be owned by root." >&2; exit 2; }
test "$(stat -c '%U' "$app_env")" = "root" || { echo "$app_env must be owned by root." >&2; exit 2; }
test "$(stat -c '%U' "$mysql_env")" = "root" || { echo "$mysql_env must be owned by root." >&2; exit 2; }
docker info >/dev/null
test -x /usr/local/sbin/zenxpos-apply-migrations || { echo "Missing /usr/local/sbin/zenxpos-apply-migrations." >&2; exit 2; }

if docker inspect "$container" >/dev/null 2>&1; then
  current_upload_mount="$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/app/public/uploads"}}{{.Type}}|{{.Name}}|{{.RW}}{{end}}{{end}}' "$container")"
  if [[ "$current_upload_mount" != "$expected_upload_mount" ]]; then
    echo "Refusing to replace $container: current uploads use ${current_upload_mount:-no persistent mount}; expected $expected_upload_mount. Recover or migrate the files first." >&2
    exit 1
  fi
  current_log_mount="$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/app/logs"}}{{.Type}}|{{.Name}}|{{.RW}}{{end}}{{end}}' "$container")"
  if [[ -n "$current_log_mount" && "$current_log_mount" != "$expected_log_mount" ]]; then
    echo "Refusing to replace $container: current logs use $current_log_mount; expected $expected_log_mount. Recover or migrate the logs first." >&2
    exit 1
  fi
fi
if docker inspect "$mysql_container" >/dev/null 2>&1; then
  current_mysql_mount="$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/var/lib/mysql"}}{{.Type}}|{{.Name}}|{{.RW}}{{end}}{{end}}' "$mysql_container")"
  if [[ "$current_mysql_mount" != "$expected_mysql_mount" ]]; then
    echo "Refusing to replace $mysql_container: current database uses ${current_mysql_mount:-no persistent mount}; expected $expected_mysql_mount. Recover or migrate the database first." >&2
    exit 1
  fi
fi

if [[ "$check_only" == true ]]; then
  echo "$environment deployment configuration is ready."
  exit 0
fi

previous="$(docker inspect --format '{{.Config.Image}}' "$container" 2>/dev/null || true)"
temporary="$(mktemp "$directory/runtime.env.XXXXXX")"
trap 'rm -f "$temporary"' EXIT
{
  printf 'ZENXPOS_ENVIRONMENT=%s\n' "$environment"
  printf 'ZENXPOS_IMAGE=%s\n' "$image"
  printf 'ZENXPOS_PORT=%s\n' "$port"
  printf 'ZENXPOS_MEMORY_LIMIT=%s\n' "${ZENXPOS_MEMORY_LIMIT:-2g}"
  printf 'ZENXPOS_CPU_LIMIT=%s\n' "${ZENXPOS_CPU_LIMIT:-2.0}"
  printf 'ZENXPOS_MYSQL_IMAGE=%s\n' "${ZENXPOS_MYSQL_IMAGE:-mysql@sha256:6ea90827b1100f8f2ae306a539f86d2c264a26ed435a2a9f75551dd5c3aeb242}"
  printf 'ZENXPOS_MYSQL_PORT=%s\n' "${ZENXPOS_MYSQL_PORT:-$mysql_port}"
  printf 'ZENXPOS_MYSQL_MEMORY_LIMIT=%s\n' "${ZENXPOS_MYSQL_MEMORY_LIMIT:-4g}"
  printf 'ZENXPOS_MYSQL_CPU_LIMIT=%s\n' "${ZENXPOS_MYSQL_CPU_LIMIT:-2.0}"
} > "$temporary"
chmod 600 "$temporary"
mv -f "$temporary" "$runtime"

compose_command=(docker compose --project-name "zenxpos-$environment" --env-file "$runtime" --file "$compose")
"${compose_command[@]}" config --quiet
rendered_config="$("${compose_command[@]}" config)"
if ! grep -Fq 'target: /app/public/uploads' <<< "$rendered_config" ||
   ! grep -Fq "name: zenxpos_${environment}_uploads" <<< "$rendered_config" ||
   ! grep -Fq 'target: /var/lib/mysql' <<< "$rendered_config" ||
   ! grep -Fq "name: zenxpos_${environment}_mysql" <<< "$rendered_config" ||
   ! grep -Fq 'target: /app/logs' <<< "$rendered_config" ||
   ! grep -Fq "name: zenxpos_${environment}_logs" <<< "$rendered_config"; then
  echo "Deployment configuration is missing the required database, upload, or log volume." >&2
  exit 1
fi
"${compose_command[@]}" pull
# On an empty volume MySQL first runs mysql-init on a temporary, socket-only server; it reports
# healthy only after that finishes, so migrations never run against a half-initialised database.
"${compose_command[@]}" up -d --wait --wait-timeout 600 mysql

# The image contains the complete ordered migration set. Apply every pending
# migration before replacing the application so a new image cannot receive
# traffic against a partially promoted schema.
/usr/local/sbin/zenxpos-apply-migrations "$environment" "$image"
"${compose_command[@]}" up -d --remove-orphans

actual_upload_mount="$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/app/public/uploads"}}{{.Type}}|{{.Name}}|{{.RW}}{{end}}{{end}}' "$container" 2>/dev/null || true)"
actual_mysql_mount="$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/var/lib/mysql"}}{{.Type}}|{{.Name}}|{{.RW}}{{end}}{{end}}' "$mysql_container" 2>/dev/null || true)"
actual_log_mount="$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/app/logs"}}{{.Type}}|{{.Name}}|{{.RW}}{{end}}{{end}}' "$container" 2>/dev/null || true)"
if [[ "$actual_upload_mount" != "$expected_upload_mount" || "$actual_mysql_mount" != "$expected_mysql_mount" || "$actual_log_mount" != "$expected_log_mount" ]]; then
  echo "Persistence check failed. uploads=${actual_upload_mount:-missing}, mysql=${actual_mysql_mount:-missing}, logs=${actual_log_mount:-missing}." >&2
  exit 1
fi

healthy=false
for _ in {1..30}; do
  status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container" 2>/dev/null || true)"
  if [[ "$status" == healthy ]] && curl --fail --silent --show-error "http://127.0.0.1:$port/api/ready" >/dev/null; then
    healthy=true
    break
  fi
  sleep 2
done

if [[ "$healthy" != true ]]; then
  docker logs --tail 100 "$container" >&2 || true
  if [[ "$previous" =~ ^ghcr\.io/[a-z0-9._/-]+(@sha256:[a-f0-9]{64}|:[A-Za-z0-9._-]+)$ ]]; then
    sed -i "s|^ZENXPOS_IMAGE=.*$|ZENXPOS_IMAGE=$previous|" "$runtime"
    "${compose_command[@]}" up -d --remove-orphans || true
  fi
  echo "Deployment failed readiness checks; rollback was attempted." >&2
  exit 1
fi

echo "Deployed $image to $environment on loopback port $port."
