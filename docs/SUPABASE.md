# Running Skolara on Supabase

Skolara's schema is defined once, in [`apps/api/prisma/schema.prisma`](../apps/api/prisma/schema.prisma),
and Prisma Migrate is the source of truth for applying it. Supabase is just Postgres underneath, so no
schema changes were needed to move onto it — only connection wiring.

The [`supabase/migrations/`](../supabase/migrations/) folder is a 1:1 SQL mirror of
[`apps/api/prisma/migrations/`](../apps/api/prisma/migrations/), kept in sync so the Supabase CLI/dashboard
(schema visualizer, `supabase db diff`, branching/previews) can see the same history. **Don't apply both** —
pick one deploy path per environment (see below) or you'll get "relation already exists" errors from running
the same DDL twice under two different migration-tracking tables.

## 0. Migration conventions

Prisma Migrate is the source of truth. `supabase/migrations/` is a byte-for-byte mirror kept only so
the Supabase CLI and dashboard can see the same history — never edit one without the other.

**Naming.** `<3-digit sequence>_<lower_snake_case_name>` — `001_init`,
`002_add_subscription_status_enum_values`, and so on. Prisma applies migrations in lexicographic
order of directory name, so a zero-padded counter orders correctly and reads far better than
Prisma's default 14-digit UTC timestamp.

Numbers must be contiguous. A gap is harmless to Postgres but almost always means a migration was
dropped, or two branches wrote against the same number and one got lost — so the checker treats it
as an error.

⚠️ `prisma migrate dev` still *generates* timestamp-named directories. Rename anything it produces
to the next number in sequence, in both trees, before committing.

**Creating one.**

- Schema-driven (preferred): edit `schema.prisma`, then run `pnpm --filter @skolara/api prisma:migrate`
  from a machine with a database. Rename the generated directory from its timestamp to the next
  sequence number, then mirror the SQL:
  `cp apps/api/prisma/migrations/<name>/migration.sql supabase/migrations/<name>.sql`
- By hand (no database available): `./scripts/new-migration.sh <name>` creates both files at the
  next number and seeds the RLS reminder. Edit the Prisma copy, then mirror it.

**Every new table needs `ENABLE ROW LEVEL SECURITY`.** Supabase auto-exposes every `public` table
through PostgREST, so a table without RLS is readable by anyone holding the project's anon key —
see section 4 below. This is easy to forget on a hand-written migration and impossible to notice
until it matters.

**Renaming a migration that a database has already applied.** Prisma records applied migrations in
`_prisma_migrations` by directory name. A database that ran the old timestamp-named migrations will
see the renamed ones as brand new, try to re-apply them, and fail with "relation already exists".
On a database you can't rebuild, update the recorded names rather than re-running any DDL:

```sql
UPDATE "_prisma_migrations" SET migration_name = '001_init'
  WHERE migration_name = '20260805103205_init';
-- ...one row per renamed migration
```

Any database created after this change needs none of that.

**Checking.** `./scripts/check-migrations.sh` verifies both trees hold the same migrations with
identical contents, well-formed names, and no gaps in the sequence. CI runs it on every push.

---

## 1. Create the project

Create a project at [supabase.com](https://supabase.com/dashboard), then go to
**Project Settings → Database → Connection string** and copy both variants:

- **Connection pooling** (port `6543`, transaction mode) → `DATABASE_URL`
- **Direct connection** (port `5432`) → `DIRECT_URL`

Put them in `apps/api/.env` (see `.env.example`):

```bash
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"
```

The pooled URL is what the running app uses for every query; the direct URL is only used by
`prisma migrate` (the pooler's transaction mode can't hold the advisory lock migrations need).

## 2. Apply the schema

From `apps/api`:

```bash
pnpm prisma:deploy   # prisma migrate deploy — applies apps/api/prisma/migrations/* in order
pnpm prisma:generate # regenerate the Prisma Client
```

This is the one and only path that should touch schema in a real Supabase project. If you also want the
Supabase CLI linked to the project for dashboard/branching purposes:

```bash
supabase link --project-ref <project-ref>
```

Don't run `supabase db push`/`db reset` against the same database you're deploying to with Prisma — it
tracks history in its own `supabase_migrations.schema_migrations` table and will re-run DDL Prisma already
applied.

## 3. Seed data

```bash
pnpm prisma:seed
```

## 4. Row Level Security

Every table has RLS enabled with **no policies** (migration `005_enable_row_level_security`).
That's deliberate, not a placeholder to fill in later:

- Supabase auto-exposes every `public` table through its PostgREST API and the `supabase-js` client to the
  `anon`/`authenticated` Postgres roles. Without RLS, anyone holding the project's anon/publishable key could
  read or write any row directly — bypassing the NestJS API's auth entirely.
- With RLS on and zero policies, Postgres denies every command for any role subject to row security. Verified
  live: `curl .../rest/v1/User` with the anon key returns `[]` even though the table has real rows.
- This app has no legitimate use for that API surface — the NestJS backend is the only intended access path —
  so deny-by-default is exactly right, and there's nothing more to configure here.
- **The app itself is unaffected.** Prisma connects as the `postgres` role, which has `BYPASSRLS` on this
  project (confirmed via `pg_roles`), so it continues to see and modify every row exactly as before.
  Tenant isolation stays enforced in the NestJS service layer, same as always.
- If you ever add a table that genuinely should be reachable via Supabase's client-side API (e.g. driving a
  realtime feature straight from the mobile app), give it actual policies scoped to `auth.uid()` — don't just
  leave it policy-less expecting inherited access from elsewhere; RLS is per-table.

## 5. Optional: file uploads via Supabase Storage

Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_STORAGE_BUCKET` in `apps/api/.env` to route
payment-screenshot / assignment-submission / book-cover / logo uploads through a Supabase Storage bucket
instead of raw client-supplied URIs. Leave them unset to keep the current behavior (clients pass a URL/URI
directly).

## Local development without Supabase

Nothing changes for local dev — keep `DATABASE_URL`/`DIRECT_URL` pointed at your local Postgres (see the
default in `.env.example`) and use `pnpm prisma:migrate` (`prisma migrate dev`) as before.
