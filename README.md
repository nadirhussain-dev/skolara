# Skolara

A multi-tenant school management platform: schools sign up as tenants, run their
own students, fees, attendance, exams and parent communication inside it, and the
platform owner manages the whole estate from a super-admin console.

Positioned for small-to-mid private schools in South Asia — modern and
mobile-first at small-school pricing, with published self-serve pricing rather
than the "book a demo" norm in that market. See [PROPOSAL.md](PROPOSAL.md) for
the full product thinking.

## Stack

| Layer | Choice |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| Web | Next.js 15 (App Router) — super-admin and school-admin dashboards |
| Mobile | Expo / React Native — teacher, student and parent apps |
| API | NestJS + Prisma |
| Database | PostgreSQL (Supabase in production) |
| Auth | JWT access + rotating refresh tokens, RBAC |
| Storage | Supabase Storage, local disk in development |
| Push | Expo push notifications |
| AI | Claude (report-card comments, fee-defaulter risk) |

```
apps/
  api/        NestJS API — the only thing that talks to the database
  web/        Next.js dashboards
  mobile/     Expo app
packages/
  types/      Zod schemas — the single source of truth for API contracts
  api-client/ Typed client + React Query hooks, shared by web and mobile
  ui/         Shared web component library
  utils/      Date, currency, reference-id helpers
  config/     Shared ESLint / TS / Tailwind config
```

## Getting started

Requires Node 22.13+, pnpm 11, and Docker (for the local database).

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env

pnpm dev:db        # start Postgres, wait for it to be healthy
pnpm db:migrate    # apply migrations
pnpm db:seed       # demo school, admin, teachers, students

pnpm dev           # api :4000 · web :3000 · expo
```

Everything optional (Supabase Storage, WhatsApp, Resend, Anthropic, Stripe)
falls back to a console or local-disk stub when unconfigured, so a clean
checkout runs end to end with no third-party accounts. `apps/api/.env.example`
documents each one.

## Multi-tenancy

Tenants are resolved by subdomain: `acme.skolara.app` signs into Acme. Locally,
`acme.localhost:3000` works without DNS. Reserved hosts (`www`, `app`, `api`,
the apex, `localhost`, raw IPs) are the platform, not a school.

Email addresses are unique *per school*, not globally — the same person can be a
parent at one school and a teacher at another. An email used at two schools is
ambiguous without a subdomain and is rejected rather than guessed at.

Isolation is enforced in the API service layer: every query is scoped by the
`schoolId` on the caller's JWT. Postgres RLS is enabled with no policies on
every table as a second line of defence — see
[docs/SUPABASE.md](docs/SUPABASE.md#4-row-level-security) for why.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Run api, web and mobile together |
| `pnpm build` | Build everything |
| `pnpm typecheck` / `pnpm lint` / `pnpm test` | What CI runs |
| `pnpm dev:db` / `dev:db:stop` / `dev:db:reset` | Local Postgres lifecycle |
| `pnpm db:migrate` / `db:deploy` / `db:seed` / `db:studio` | Prisma |
| `pnpm new:migration <name>` | Scaffold a migration in both trees |
| `pnpm check:migrations` | Verify the Supabase mirror is in sync |

## Migrations

Prisma Migrate is the source of truth; `supabase/migrations/` is a byte-for-byte
mirror so the Supabase CLI and dashboard see the same history. CI fails if they
drift. **Every new table must enable RLS.** Full conventions in
[docs/SUPABASE.md](docs/SUPABASE.md#0-migration-conventions).

## API docs

Swagger UI is served at `/docs` in development. It's off in production unless
`ENABLE_API_DOCS=true` — this is a B2B API, not a public one. `packages/types/src`
is the authoritative description of payload shapes.

## Deployment

- **API** — container, built from the repo root:
  `docker build -f apps/api/Dockerfile -t skolara-api .`
- **Web** — Vercel, or any Next.js host. Set `NEXT_PUBLIC_API_URL`.
- **Mobile** — EAS Build. Set `expo.extra.eas.projectId` in `app.json`; push
  notifications need it.
- **Database** — Supabase. Deploy schema with `pnpm db:deploy`, never
  `supabase db push` against the same database.

In production, set `CORS_ORIGINS` to your web app's URL — CORS is closed by
default there — and use real `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` values.
The API refuses to boot with placeholder secrets.

## Project status & roadmap

- [docs/FEATURE_STATUS.md](docs/FEATURE_STATUS.md) — every feature in `PROPOSAL.md`
  checked against what's on `main`: 75 shipped, 4 partial, 7 not built.
- [docs/SIX_DAY_PLAN.md](docs/SIX_DAY_PLAN.md) — how the remaining work is sequenced,
  in dependency order, with an explicit cut line per day.
