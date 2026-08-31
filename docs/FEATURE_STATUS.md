# Feature Status

Every feature in [`PROPOSAL.md`](../PROPOSAL.md) §6–§10, checked against what is actually on
`main` at `655ee3a`.

| State | Count | Meaning |
|---|---|---|
| ✅ Shipped | 63 | Built, tenant-scoped, guarded |
| 🟡 Partial | 9 | Mechanism exists, surface incomplete |
| ⬜ Not built | 16 | No code |

**Partial** is the cheapest column to finish — the plumbing is done, the content or UI is not.

Delivery sequencing for everything not shipped: [SIX_DAY_PLAN.md](./SIX_DAY_PLAN.md).

---

## Super Admin — platform owner

The commercial layer: who gets in, what they pay, what they can reach.

| Feature | State | Notes |
|---|---|---|
| School approval / rejection workflow | ✅ | |
| Subscription status with auto-lock | ✅ | Login refuses anything outside `TRIAL`/`ACTIVE`, so a suspended school is locked out at the door rather than per-endpoint |
| Feature flags per plan | ✅ | Twelve gated capabilities; the guard *refuses* requests, so tier boundaries are enforced not advisory |
| White-label — logo, colour, subdomain | ✅ | |
| Platform analytics — schools, users, MRR/ARR | ✅ | |
| Multi-campus / school groups | ✅ | |
| Audit logs across all schools | ✅ | Every state-changing request, credential fields redacted before write |
| API key management | ✅ | Keys previously did nothing — no guard read them. Now authenticate, read-only by construction |
| Revenue dashboard with downloadable reports | 🟡 | MRR and ARR computed and displayed; no CSV or PDF export |
| Server / infra health monitor | 🟡 | `/health` and `/health/ready` answer for a load balancer; no dashboard |
| Support / helpdesk ticket system | ⬜ | |
| Global broadcast announcements | ⬜ | Notices exist but are school-scoped |
| Role & permission template editor | ⬜ | Roles fixed in code — fine for four roles |
| Data export / backup per tenant | ⬜ | |
| Super Admin mobile companion | ⬜ | Proposal marks this optional |

## School Management — principal & admin

The daily operations surface. Deepest area, and the most complete.

| Feature | State | Notes |
|---|---|---|
| School profile, classes, sections, academic years | ✅ | |
| Student admission with document upload | ✅ | |
| Teacher & staff management | ✅ | |
| Fee invoices, partial payments, running balance | ✅ | |
| Payment verification queue | ✅ | The MVP's core loop — was broken end to end until the audit-gap branch; screenshots pointed at the parent's own phone |
| Bank statement CSV import with suggested matches | ✅ | |
| AI defaulter-risk flagging | ✅ | |
| Payroll & payslip generation | ✅ | |
| School-wide attendance oversight | ✅ | |
| Exams, grading scale, rank lists | ✅ | |
| Library management | ✅ | |
| Transport with live bus tracking config | ✅ | |
| Structured complaints with resolution log | ✅ | The gap only one competitor covered |
| Multi-branch support for chains | ✅ | |
| Reports & analytics | ✅ | |
| Communication centre — notices, WhatsApp, push | 🟡 | No SMS channel; email is transactional only |
| Report card generator | 🟡 | Grades, rank lists and AI comments exist; nothing assembles a printable card |
| Digital fee receipts | 🟡 | Reference ID and status exist; no rendered receipt document |
| Timetable builder with conflict detection | ✅ | Week grid per class. Clashes are refused by database constraints, not warned about, so concurrent edits can't both win |
| Academic calendar & event management | ✅ | School-wide or class-scoped; mobile shows what's ahead |
| Certificate / document generator | ⬜ | |
| Hostel management | ⬜ | |
| Inventory / asset management | ⬜ | |
| Staff leave approval | ⬜ | |
| Staff directory with click-to-call | ⬜ | |

## Teacher

Where the proposal says competitors underinvest. The mobile half is done; the web depth is not.

| Feature | State | Notes |
|---|---|---|
| Mark attendance, offline with auto-sync | ✅ | Queued to device storage, drained on app foreground. Was a flag with no implementation |
| Enter and update grades | ✅ | |
| Assign & review homework with file submission | ✅ | |
| Push notifications | ✅ | |
| Chat with parents, school-scoped | ✅ | |
| View payslips | ✅ | |
| Gradebook & per-class analytics | ✅ | |
| AI report-card comment generator | ✅ | Falls back to deterministic comments with no API key, so it never hard-fails |
| Scoped to own classes | ✅ | Any teacher could previously take any register or overwrite a colleague's marks |
| Upload class materials | 🟡 | Files attach to assignments; no standalone materials library |
| Personal timetable | ✅ | Web grid and mobile day list |
| Apply for leave, check balance | ⬜ | |
| Lesson planning & syllabus tracker | ⬜ | |
| Online quizzes with MCQ auto-grading | ⬜ | |
| Schedule live / online class links | ⬜ | |

## Student & Parent

The parent app is the product most families will judge you on.

| Feature | State | Notes |
|---|---|---|
| Submit fee payment — screenshot, reference ID, live status | ✅ | |
| Homework and assignment submission | ✅ | |
| Attendance history and real-time absence alerts | ✅ | |
| Exam results | ✅ | |
| Notice board | ✅ | |
| Direct chat with teachers | ✅ | |
| Library status | ✅ | |
| Live bus tracking | ✅ | Genuinely under-served in this market, per the proposal's own research |
| Push notifications | ✅ | |
| Multi-child switcher | ✅ | |
| In-app complaint submission with status tracking | ✅ | |
| Digital report card | 🟡 | Results viewable; no assembled card to download or print |
| Study materials access | 🟡 | Reachable through assignment attachments only |
| Timetable | ✅ | Mobile, scoped through the multi-child switcher |
| Performance graphs over time | ⬜ | |
| Leave application | ⬜ | |
| Book parent–teacher meeting slots | ⬜ | |
| School events calendar | ✅ | Mobile, grouped by month, filtered from today |
| Join live / online classes | ⬜ | |

> The parent/student **web** portal is deferred by design — those accounts redirect to
> `/mobile-only`. The proposal makes the parent experience mobile-first.

## Cross-cutting platform

`PROPOSAL.md` §10. Nearly all are in.

| Requirement | State | Notes |
|---|---|---|
| Granular role-based access control | ✅ | |
| Manual bank-transfer verification as primary method | ✅ | |
| WhatsApp alerts | ✅ | Table stakes in this market. Meta Cloud API, console fallback in development |
| Push notifications | ✅ | Expo rather than raw FCM — same delivery, far less native config |
| Offline mode for mobile attendance | ✅ | |
| Custom subdomain per school | ✅ | Middleware resolves tenant from request host; was previously just a login form field nothing read |
| Self-serve onboarding with published pricing | ✅ | The clearest differentiator against this market's "contact us for pricing" norm |
| File storage for uploads | ✅ | |
| Optional Stripe gateway as per-school add-on | ✅ | |
| Bilingual UI — Urdu and English with RTL | 🟡 | 152 keys, both locales complete and integrity-tested. **No admin page calls `t()` yet** — remaining work is wiring 26 pages plus copy |
| Scalable cloud infrastructure | 🟡 | API containerised, web deploys as standard Next.js. No CD workflow |
| Automated backups and data export tools | ⬜ | Supabase takes managed backups; nothing tenant-facing |

---

## Engineering health

Not proposal features, but they gate everything above.

| Metric | Value | Notes |
|---|---|---|
| Tests passing | 147 | Up from 66. Targets what actually breaks — audit redaction, entitlement boundaries, class scoping, MRR arithmetic |
| Services untested | 24 of 31 | Payments, invoices, grades and attendance are worth covering first |
| Migrations | 14 (`001`–`014`) | CI applies all to a real Postgres and seeds through the generated client |
| Deploy workflows | 0 | CI validates on every push; nothing ships automatically |

---

## Before a pilot school touches it

1. **Set the two business values** in `packages/types/src/pricing.ts`. The PKR prices and tier
   boundaries are estimates from the competitor research. The entitlement guard refuses
   requests, so a wrong tier locks paying schools out of features they expect.
2. **Configure storage and push.** A Supabase Storage bucket plus three env vars, and an EAS
   project id in `apps/mobile/app.json`. Without them uploads fall back to local disk and push
   logs to console — fine in development, silently wrong in production.
3. **Add a deploy workflow.** Nothing ships today.

## Worth questioning before building

**Hostel, inventory, live classes and quizzes** are each substantial modules that no part of the
gap analysis in `PROPOSAL.md` identifies as a wedge. They are on the list because full-featured
competitors have them, not because a small Multan private school is choosing a platform on them.
Worth validating demand with pilot schools before spending build time there.
