# Security

What protects Skolara today, how to configure it, and what is still open.
No system is unbreakable; this file exists so the gaps are known rather than
discovered. Update it whenever a control is added or a gap is closed.

## Reporting a problem

Email the maintainer privately rather than opening a public issue. Include
steps to reproduce.

## Controls in place

### Rate limiting
- Every route: 100 requests per minute per client IP.
- Tighter limits on sensitive routes: sign-in 10/min, password reset request
  5/min, reset 10/min, token refresh 20/min, school signup 5/hour, uploads
  20/min, data export 10/hour.
- **Per-account sign-in lockout:** five wrong passwords in a row lock that
  account for 15 minutes, doubling to a maximum of one hour. This is separate
  from the per-IP limit, so guesses spread across many addresses still stop.
- `TRUST_PROXY` must match the deployment (see below) or per-IP limits are
  wrong.

### SQL injection
- All database access goes through Prisma, which sends values as parameters.
- The handful of raw statements (`$executeRaw`, `$queryRaw`) use tagged
  templates, which are parameterised as well. There is no `$queryRawUnsafe`
  or string-built SQL. Keep it that way: never build SQL with `+` or a plain
  template string.

### Input validation
- Every request body is parsed with a Zod schema before a controller sees it.
- Uploads: type allowlist per purpose, 10MB cap, and a content check — the
  file's leading bytes must match its declared type, so an HTML page cannot be
  stored as an image.
- **Submitted web addresses are http or https only** (`httpUrlSchema`):
  payment screenshots, homework files, study materials, expense bills, school
  logos and meeting links. Without this a parent could submit a `javascript:`
  address as a payment screenshot and have it run in the admin's session when
  they opened it. The web app applies the same check again (`safeHttpUrl`)
  before any stored address reaches an `href` or `src`.
- Money amounts are capped to what the database column holds and to two
  decimal places; text fields that are shown to other people have length caps.

### Who can see what
- School money (budgets, expenses, statements) is for school admins only.
- A teacher can load the roster, register and marks only for classes they are
  assigned to. A parent sees only their linked children; a student only
  themself.
- Notifications are read and marked by the user id in the caller's token, so
  nobody can read or clear anyone else's.
- `GET /schools/public/:code` is the one unauthenticated read. It returns a
  school's name, code, logo and colour, for active schools only, answers
  suspended and unknown codes identically, and is limited to 30 a minute.
- Bulk actions are throttled: class billing 10 a minute, fee reminders 5 a
  minute.

### Notifications
- Skolara notifies people inside its own apps: an inbox entry plus a push.
  WhatsApp and SMS are off unless `PHONE_ALERTS_ENABLED=true`, so no phone
  numbers leave the system by default.

### Authentication and sessions
- Passwords hashed with bcrypt. Refresh and reset tokens are stored hashed.
- Access tokens last 15 minutes; refresh tokens rotate on use and are revoked
  on logout and on password reset.
- Sign-in gives the same answer, in the same time, for an unknown email and a
  wrong password, and does not reveal a school's status without the password.
- In production the API refuses to start with a placeholder, short (under 32
  characters) or shared JWT secret.

### Tenant isolation
- Every query is scoped by the `schoolId` in the caller's token.
- Postgres row-level security is enabled with no policies as a second line of
  defence (see `SUPABASE.md`).

### Transport and browser
- API: `helmet` headers, CORS closed in production unless `CORS_ORIGINS` is
  set, error responses never include stack traces.
- Web: clickjacking protection (`frame-ancestors 'none'`), `nosniff`, HSTS,
  referrer and permissions policies, restricted `base-uri` and `form-action`.
- CSV exports neutralise spreadsheet formulas.

### Dependencies
- `pnpm audit --prod` reports no critical or high advisories for the API or
  the web app as of this change. Transitive fixes are pinned under
  `overrides` in `pnpm-workspace.yaml`.

## Required production configuration

| Setting | Why |
|---|---|
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | 32+ characters each, different. `openssl rand -base64 48` |
| `TRUST_PROXY` | Number of proxies in front of the API. Usually `1` behind one load balancer |
| `CORS_ORIGINS` | The web app's origin(s). CORS is closed without it |
| `PHONE_ALERTS_ENABLED` | Leave `false`. Skolara notifies inside its apps only |
| HTTPS | Terminate TLS at the load balancer; never serve the API over plain http |
| Supabase storage vars | The local-disk fallback is for development only |

## Known gaps

Open items, most important first.

1. **No independent review.** These controls were written and unit-tested,
   not penetration-tested. Get an outside test before holding real schools'
   data.
2. **Tenant isolation is audited by sample, not exhaustively.** A spot check
   of ten write paths found every one scoped to the caller's school. There is
   no automated test that proves it for all ~45 modules.
3. **Rate limits and lockouts are per process.** They live in memory. With
   more than one API instance each instance keeps its own counters. Move both
   to Redis before scaling out.
4. **Session token in localStorage.** A cross-site-scripting bug anywhere in
   the web app could read it. Mitigations: React escapes output by default and
   the headers above. The stronger fix is an httpOnly cookie plus CSRF
   protection, and a nonce-based `script-src` policy.
5. **A deactivated user keeps access until their access token expires** (up
   to 15 minutes). Their refresh tokens are revoked at once, and an admin
   cannot deactivate their own account.
6. **Lockout can be used to annoy.** Anyone who knows an email can lock that
   account for 15 minutes by failing five times. The alternative — no lockout
   — is worse.
7. **Password rule is length only** (8 characters). No breached-password
   check, no two-factor sign-in.
8. **Mobile build tooling advisories.** `pnpm audit` still lists critical and
   high advisories under `apps/mobile`, all in Expo SDK 52's build-time
   dependencies. They are not shipped in the app; clearing them means
   upgrading the Expo SDK.
9. **Moderate advisories in the API** (`qs`, `file-type`, `js-yaml`,
   `@nestjs/core` 10). Clearing them means moving to NestJS 11.
10. **No virus scanning of uploads.** The content check confirms format only.
11. **The mobile apps have not been run on a physical phone as part of this
    work.** They were typechecked, linted, bundled for Android and exercised
    in a browser build against sample data. Test on real iOS and Android
    devices before a store release.
12. **Font loading.** The web app loads Manrope from Google Fonts at run
    time. Self-host it if your schools' networks block Google or your privacy
    policy rules out third-party requests.
