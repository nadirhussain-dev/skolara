#!/usr/bin/env bash
# Creates a migration in both trees at once, with a correct UTC timestamp.
#
# Prisma Migrate is the source of truth (apps/api/prisma/migrations); the
# supabase/migrations copy exists so the Supabase CLI and dashboard can see the
# same history. CI fails if the two ever drift, so they must be created and
# edited together — this script is the only sanctioned way to add one by hand.
#
# Usage: ./scripts/new-migration.sh add_hostel_module
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: $0 <snake_case_migration_name>" >&2
  exit 1
fi

NAME="$1"
if [[ ! "$NAME" =~ ^[a-z0-9]+(_[a-z0-9]+)*$ ]]; then
  echo "error: migration name must be lower_snake_case (got '$NAME')" >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Prisma stamps migration directories with a UTC timestamp. Matching that
# keeps hand-written migrations ordered correctly against generated ones.
STAMP="$(date -u '+%Y%m%d%H%M%S')"
DIR_NAME="${STAMP}_${NAME}"

PRISMA_DIR="${REPO_ROOT}/apps/api/prisma/migrations/${DIR_NAME}"
SUPABASE_FILE="${REPO_ROOT}/supabase/migrations/${DIR_NAME}.sql"

mkdir -p "$PRISMA_DIR"
cat > "${PRISMA_DIR}/migration.sql" <<SQL
-- ${NAME}
--
-- Every new table needs RLS enabled to match the stance set in
-- 20260806125602_enable_row_level_security: Supabase auto-exposes public
-- tables through PostgREST, and a table without RLS is readable by anyone
-- holding the anon key. Prisma's connection role has BYPASSRLS, so this does
-- not affect the API.

SQL

cp "${PRISMA_DIR}/migration.sql" "$SUPABASE_FILE"

echo "Created:"
echo "  ${PRISMA_DIR#"$REPO_ROOT"/}/migration.sql"
echo "  ${SUPABASE_FILE#"$REPO_ROOT"/}"
echo
echo "Edit the Prisma copy, then mirror it exactly:"
echo "  cp ${PRISMA_DIR#"$REPO_ROOT"/}/migration.sql ${SUPABASE_FILE#"$REPO_ROOT"/}"
