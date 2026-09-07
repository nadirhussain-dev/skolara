# Deployment

[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) ships every commit that
lands on `main`: the API as a container image, the schema through
`prisma migrate deploy`, then the web app.

CI ([`ci.yml`](../.github/workflows/ci.yml)) still runs on every pull request and validates
without shipping. The deploy workflow **calls** that same file rather than restating its
checks, so a commit can never be deployed against a looser definition of green than the one
its pull request had to pass.

---

## What runs, in what order, and why

```
preflight ──▶ verify ──▶ image ──▶ migrate ──▶ release ──▶ web
   │            │           │         │           │          │
   │            │           │         │           │          └─ Vercel, last: the browser
   │            │           │         │           │             bundle is never newer than
   │            │           │         │           │             the API it calls
   │            │           │         │           └─ deploy hook, then poll /health until
   │            │           │         │              the new container actually answers
   │            │           │         └─ the only irreversible step; gated on the
   │            │           │            `production` environment
   │            │           └─ publishing an image changes nothing that is serving traffic,
   │            │              so failing here costs nothing
   │            └─ typecheck, lint, tests, migration-mirror check, image build
   └─ refuses to start at all if the secrets below are missing
```

The ordering exists so that at no moment is the API reading a schema that hasn't been applied,
or the web app calling an API that hasn't shipped.

**That guarantee is only as good as your migrations.** It assumes each migration is backward
compatible with the API version still running when it lands, because between `migrate` and
`release` the old API is live against the new schema. Add a column and backfill it in one
release; start requiring it in the next. A migration that drops or renames something the live
API still reads will take the site down in that window no matter what this workflow does.

---

## One-time setup

### 1. Repository secrets

`preflight` fails the run with the names of any that are missing, so a half-finished setup
never gets as far as pushing an image.

| Secret | What it is |
|---|---|
| `PRODUCTION_DATABASE_URL` | Supabase **connection pooling** URI, port 6543. Append `?pgbouncer=true&connection_limit=1`. |
| `PRODUCTION_DIRECT_URL` | Supabase **direct connection** URI, port 5432. `prisma migrate` needs this — it cannot run DDL through the pooler. |
| `API_DEPLOY_HOOK_URL` | A URL your host exposes that makes it pull the newest image. Render, Railway, Coolify and Dokku all provide one. |
| `VERCEL_TOKEN` | Vercel account token. |
| `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | From `.vercel/project.json` after running `vercel link` in `apps/web`. |
| `PRODUCTION_API_HEALTH_URL` | Optional but strongly recommended: `https://api.your-domain/health`. Without it the release step reports success as soon as the host *accepts* the request, which is not the same as the new container serving traffic. |

A deploy hook URL is a credential — anyone holding it can trigger a deploy. It belongs in
secrets, not in this file.

### 2. Gate the `production` environment

Repository **Settings → Environments → production**, then add required reviewers.

Worth doing deliberately. `migrate`, `release` and `web` all name this environment, so
without reviewers every merge to `main` applies migrations to the live database
unattended — which is fine until the day it isn't.

### 3. Point the host at the image

The workflow publishes to `ghcr.io/<owner>/<repo>/api`, tagged with the 12-character commit
SHA **and** `latest`. Configure the host to pull `:latest`; the SHA tags are what a rollback
names, and a registry holding only `latest` cannot roll back to anything.

The image is public or private according to the repository. A private one needs the host
authenticated to GHCR with a read-only personal access token (`read:packages`).

### 4. Runtime environment on the host

The API container needs its own environment, which this workflow does not set — it is the
host's configuration, not the pipeline's. [`apps/api/.env.example`](../apps/api/.env.example)
documents every variable. The ones that matter in production:

- `DATABASE_URL` and `DIRECT_URL` — as above.
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` — real values. The API refuses to boot in
  production with the placeholders from `.env.example`.
- `CORS_ORIGINS` — your web app's URL. CORS is closed by default in production, so leaving
  this unset means the browser can't reach the API at all.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` — without these,
  uploads fall back to local disk, and a container filesystem does not survive a redeploy.
  Payment screenshots would disappear on the next release.
- `NODE_ENV=production`.

### 5. Vercel project

`NEXT_PUBLIC_API_URL` is inlined into the browser bundle at build time, so it belongs in the
Vercel project's own environment variables — `vercel pull` fetches it during the deploy.
Setting it in the workflow would have no effect on the bundle.

Set the project's root directory to `apps/web`.

---

## Rolling back

**The API.** Point the host at an earlier SHA tag —
`ghcr.io/<owner>/<repo>/api:<sha>` — and redeploy. No rebuild, and the exact bytes that were
running before come back.

**The database does not roll back.** `prisma migrate deploy` has no inverse, and Prisma
generates no down migrations. Recovering from a bad migration means restoring from a Supabase
backup, which means losing whatever was written in between. This asymmetry is the entire
reason for the environment gate: the image is cheap to undo and the schema is not.

If a migration fails partway, `prisma migrate status` reports the history as failed and
subsequent deploys refuse to run until it is resolved — deliberately, since applying more
migrations on top of a half-applied one is how a schema becomes undescribable.

---

## First deploy

Two things about the first run specifically.

**The Dockerfile had never been built by CI before day 6.** It is now built on every pull
request (`api-image` in `ci.yml`), unpushed, so the first real deploy is no longer also the
first test of the image. If that job is red, the Dockerfile is the problem, not your secrets.

**An empty production database needs no seed.** `pnpm db:seed` creates a demo school and demo
users with known passwords; it belongs in development and nowhere near a real deployment. The
first real school arrives through the self-serve signup flow, and the platform owner account
is created by hand.
