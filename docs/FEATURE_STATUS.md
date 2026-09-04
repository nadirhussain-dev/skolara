# Feature Status

Every feature in [`PROPOSAL.md`](../PROPOSAL.md) §6–§10, checked against what is actually on
`main` at `655ee3a`, plus the day-2 through day-5 branches.

| State | Count | Meaning |
|---|---|---|
| ✅ Shipped | 81 | Built, tenant-scoped, guarded |
| 🟡 Partial | 3 | Mechanism exists, surface incomplete |
| ⬜ Not built | 2 | No code |

> Recomputed from the rows below at the end of each day. They disagreed once —
> before day 4 the summary said 73/6/9 against a table holding 68/6/12 — so
> they are now recounted rather than incremented.

**Everything left is day 6's, bar one row.** The three partials plus the Super
Admin mobile companion are the ship-readiness work: i18n wiring, a deploy
workflow, an SMS channel, and the optional mobile console. The one row that
belongs to no day is student and parent leave application, which needs adding
or dropping on purpose.

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
| Revenue dashboard with downloadable reports | ✅ | MRR/ARR on screen, revenue-by-school CSV export |
| Server / infra health monitor | ✅ | Guarded `/health/detail` behind the two unchanged probes; checks, integration wiring, migration state and estate counts |
| Support / helpdesk ticket system | ✅ | Schools raise, platform replies; internal notes hidden from the school in-query |
| Global broadcast announcements | ✅ | Platform-wide, role-filterable, optional expiry; banner on every dashboard page |
| Role & permission template editor | ✅ | Templates **narrow** a built-in role rather than replacing it, so no endpoint had to change. Capability derived from path + method by a global guard |
| Data export / backup per tenant | ✅ | Full JSON bundle or any table as CSV, on an explicit column allowlist |
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
| Report card generator | ✅ | Marks, attendance and remarks as a PDF, per student or per class |
| Digital fee receipts | ✅ | Rendered on verification, linked from the payment queue |
| Timetable builder with conflict detection | ✅ | Week grid per class. Clashes are refused by database constraints, not warned about, so concurrent edits can't both win |
| Academic calendar & event management | ✅ | School-wide or class-scoped; mobile shows what's ahead |
| Certificate / document generator | ✅ | Enrolment, character, leaving and bonafide, issued from the student page |
| Hostel management | ✅ | Rooms, beds and residents; double-allocation refused by two partial unique indexes rather than a counted check |
| Inventory / asset management | ✅ | Items, issue and return with condition. Stock reserved in the same statement that checks it, so concurrent issues can't over-draw |
| Staff leave approval | ✅ | Approve or decline queue, oldest first |
| Staff directory with click-to-call | ✅ | `tel:`/`mailto:` links; staff-only endpoint so teachers can use it safely |

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
| Upload class materials | ✅ | Class-and-subject library on the storage layer; accepts Office documents as well as PDF |
| Personal timetable | ✅ | Web grid and mobile day list |
| Apply for leave, check balance | ✅ | Mobile, with per-kind annual balances |
| Lesson planning & syllabus tracker | ✅ | Topics per class, subject and term; coverage derived on read, never stored |
| Online quizzes with MCQ auto-grading | ✅ | Timed attempts graded on answers saved as they're chosen, so running out of time doesn't lose the paper. Best attempt lands in the gradebook |
| Schedule live / online class links | ✅ | A link and a window, not a video stack |

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
| Digital report card | ✅ | Generated as a PDF a parent can download |
| Study materials access | ✅ | Read through the student, not the class, so a parent can't enumerate other classes |
| Timetable | ✅ | Mobile, scoped through the multi-child switcher |
| Performance graphs over time | ✅ | Percentages per subject against the class average for the same assessment; small multiples on web, bars on mobile |
| Leave application | ⬜ | |
| Book parent–teacher meeting slots | ✅ | Teachers publish an evening of slots; booking is race-safe |
| School events calendar | ✅ | Mobile, grouped by month, filtered from today |
| Join live / online classes | ✅ | The link is withheld until ten minutes before and withdrawn when the lesson ends — enforced in the payload, not by hiding a button |

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
| Automated backups and data export tools | ✅ | Supabase takes managed backups; a school can now also export everything itself, with the limits stated on the page |

---

## Engineering health

Not proposal features, but they gate everything above.

| Metric | Value | Notes |
|---|---|---|
| Tests passing | 405 | Up from 66. Targets what actually breaks — audit redaction, entitlement boundaries, class scoping, quiz grading and expiry, stock and bed races, export field allowlists, template escalation |
| Services untested | 22 of 51 | Payments, invoices and attendance are the ones still worth covering, and they are day 6's chunk 3 |
| Migrations | 26 (`001`–`026`) | CI applies all to a real Postgres and seeds through the generated client |
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

**Hostel and inventory** are each substantial modules that no part of the gap analysis in
`PROPOSAL.md` identifies as a wedge. They are on the list because full-featured competitors
have them, not because a small Multan private school is choosing a platform on them.

Live classes and quizzes carried the same warning and were built anyway on day 4, because they
were the day's cheapest half: live classes are one table and a release-window rule, and quizzes
reuse the gradebook rather than inventing a parallel score store. Hostel and inventory have no
such lever — they are new domains, not new views of existing ones. Worth validating demand with
pilot schools before spending build time there.

**One row is in no day's plan.** Student and parent *leave application* is still not built:
day 3 covered staff leave, and days 5 and 6 don't pick the family side up. It needs adding to a
day or dropping on purpose, not left to fall between them.
