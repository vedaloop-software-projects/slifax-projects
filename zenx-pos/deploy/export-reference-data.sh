#!/usr/bin/env bash
# Exports the platform-wide reference tables (menus/permissions, states, business types, lookups)
# from an existing environment as an idempotent migration (INSERT IGNORE keeps existing rows).
# These tables hold no tenant or personal data. Run as root on the VPS:
#   sudo bash export-reference-data.sh staging > 20261102_platform_reference_data.sql
# then commit the file to zenx-pos/deploy/sql/.
set -Eeuo pipefail

environment="${1:-staging}"
case "$environment" in staging|production) ;; *) echo "Environment must be staging or production." >&2; exit 2 ;; esac
container="zenxpos-$environment-mysql"
tables=(features sub_features business_types states coupon_usage_types key_mapping_masters bill_col_masters gsts)

docker inspect "$container" >/dev/null
printf '%s\n' "-- Platform reference data exported from $environment by deploy/export-reference-data.sh." \
  '-- Global tables only (no client_id): menus and permissions, states, business types and lookups.' \
  '-- INSERT IGNORE: a no-op where the rows already exist (staging), complete data on a new database.' ''
docker exec "$container" sh -c 'exec mysqldump --no-create-info --insert-ignore --complete-insert --skip-extended-insert --skip-comments --skip-dump-date --no-tablespaces --skip-add-locks --skip-triggers -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" "$@"' sh "${tables[@]}" 2> >(grep -v 'Using a password' >&2)
