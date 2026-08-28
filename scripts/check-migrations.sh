#!/usr/bin/env bash
# Verifies supabase/migrations is an exact mirror of apps/api/prisma/migrations.
#
# Name-only checking isn't enough: a migration edited in one tree and not the
# other leaves two databases with genuinely different schemas while CI stays
# green. This compares contents too.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PRISMA_DIR="${REPO_ROOT}/apps/api/prisma/migrations"
SUPABASE_DIR="${REPO_ROOT}/supabase/migrations"

status=0

prisma_names="$(ls "$PRISMA_DIR" | grep -v '^migration_lock.toml$' | sort)"
supabase_names="$(ls "$SUPABASE_DIR" | sed 's/\.sql$//' | sort)"

if ! diff <(echo "$prisma_names") <(echo "$supabase_names") > /tmp/skolara-mig-names.diff; then
  echo "error: migration sets differ between the two trees:" >&2
  sed 's/^/  /' /tmp/skolara-mig-names.diff >&2
  status=1
fi

while IFS= read -r name; do
  [[ -z "$name" ]] && continue
  prisma_file="${PRISMA_DIR}/${name}/migration.sql"
  supabase_file="${SUPABASE_DIR}/${name}.sql"
  [[ -f "$prisma_file" && -f "$supabase_file" ]] || continue

  if ! diff -q "$prisma_file" "$supabase_file" > /dev/null; then
    echo "error: ${name} differs between the two trees:" >&2
    diff "$prisma_file" "$supabase_file" | sed 's/^/  /' >&2
    status=1
  fi
done <<< "$prisma_names"

# Prisma stamps directories YYYYMMDDHHMMSS_name. A malformed stamp sorts
# wrongly and silently applies out of order.
while IFS= read -r name; do
  [[ -z "$name" ]] && continue
  if [[ ! "$name" =~ ^[0-9]{14}_[a-z0-9]+(_[a-z0-9]+)*$ ]]; then
    echo "error: '${name}' is not <14-digit UTC timestamp>_<lower_snake_case>" >&2
    status=1
  fi
done <<< "$prisma_names"

if [[ $status -eq 0 ]]; then
  echo "Migrations are in sync ($(echo "$prisma_names" | grep -c .) migrations, contents identical)."
fi
exit $status
