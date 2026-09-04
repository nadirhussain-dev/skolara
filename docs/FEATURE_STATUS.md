# Feature Status

Every feature in [`PROPOSAL.md`](../PROPOSAL.md) §6–§10, checked against what is actually on
`main` at `655ee3a`, plus the day-2 through day-6 branches.

| State | Count | Meaning |
|---|---|---|
| ✅ Shipped | 86 | Built, tenant-scoped, guarded |
| 🟡 Partial | 0 | Mechanism exists, surface incomplete |
| ⬜ Not built | 0 | No code |

> Recomputed from the rows below at the end of each day. They disagreed once —
> before day 4 the summary said 73/6/9 against a table holding 68/6/12 — so
> they are now recounted rather than incremented.

**Every row in the proposal is built.** That is not the same as finished, and
three things are worth reading before treating it as such.

**Server-generated text is English regardless of the reader's language.** The
UI is fully bilingual — 1,208 keys, 46 dashboard pages, 33 mobile screens. But
WhatsApp and SMS bodies, push notification text, and the report card, receipt
and certificate PDFs are all assembled server-side, where there is no reader
locale to consult: nothing stores a language preference against a user. So a
parent using the app in Urdu still gets an English text message about their
child's absence. Closing that is a schema change and a pass over every
outgoing message, not more wiring.

**The deploy workflow has never run.** It is written, its checks are CI's own
by reference, and its ordering is deliberate — but no secrets are configured
and it has never pushed an image to a real host. The first run is still a
first run.

**The two business values are still estimates.** See below.

Delivery sequencing and how each day went: [SIX_DAY_PLAN.md](./SIX_DAY_PLAN.md).

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
| Super Admin mobile companion | ✅ | Approval queue and revenue headline. Also fixed a platform owner landing on the parent dashboard, where every link 403'd |

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
| Communication centre — notices, WhatsApp, push | ✅ | SMS is a fourth channel now, routed by a per-school WhatsApp/SMS/both preference so nobody is billed for a channel they didn't choose |
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
| Leave application | ✅ | A family reports an absence and approval reaches the register — ABSENT becomes EXCUSED, both retroactively and when the register is taken |
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
| Bilingual UI — Urdu and English with RTL | ✅ | 1,208 keys, both locales complete and parity-tested. All 46 dashboard pages and all 33 mobile screens translate. **Server-generated text is still English** — see the note below |
| Scalable cloud infrastructure | ✅ | Deploy workflow ships image → migrations → API → web on every push to `main`, gated on a `production` environment. Never yet run against a real host |
| Automated backups and data export tools | ✅ | Supabase takes managed backups; a school can now also export everything itself, with the limits stated on the page |

---

## Engineering health

Not proposal features, but they gate everything above.

| Metric | Value | Notes |
|---|---|---|
| Tests passing | 531 across the repo (503 API) | Up from 66. Targets what actually breaks — audit redaction, entitlement boundaries, class scoping, quiz grading and expiry, stock, bed and copy races, payment double-crediting, export field allowlists, template escalation |
| Services untested | 20 of 52 | The money paths are covered now. What's left is mostly thin CRUD; `bank-statement`, `messaging` and `payment-gateway` are the three with logic worth covering next |
| Migrations | 28 (`001`–`028`) | CI applies all to a real Postgres and seeds through the generated client. 027 and 028 have only been applied by CI, never locally — no Docker on the machine they were written on |
| Deploy workflows | 1 | Ships on every push to `main`, gated on a `production` environment. Never yet run |
| i18n coverage | 1,208 keys | Both locales complete, parity and placeholder-preservation asserted by test. UI only — server-generated text is English |

---

## Before a pilot school touches it

1. **Set the two business values** in `packages/types/src/pricing.ts`. The PKR prices and tier
   boundaries are estimates from the competitor research. The entitlement guard refuses
   requests, so a wrong tier locks paying schools out of features they expect.
2. **Configure storage and push.** A Supabase Storage bucket plus three env vars, and an EAS
   project id in `apps/mobile/app.json`. Without them uploads fall back to local disk and push
   logs to console — fine in development, silently wrong in production.
3. **Configure the deploy workflow.** The workflow exists; its secrets don't. It fails fast and
   names what's missing — see [DEPLOYMENT.md](./DEPLOYMENT.md).
4. **Decide about SMS.** Every school defaults to WhatsApp, so SMS costs nothing until one opts
   in. If any pilot school wants it, Twilio needs three env vars.

## What to do next, in order

Nothing here is a proposal row. All of those are built.

1. **Run the deploy workflow.** Everything else is guesswork until an image has reached a host
   and a migration has been applied to a database that has real data in it.
2. **Translate what the server sends.** The most visible remaining gap, and the one a pilot
   school will notice first: a parent reading the app in Urdu gets English text messages. Needs
   a language column on `User`, then a pass over the WhatsApp, SMS, push and PDF paths.
3. **Cover `bank-statement`, `messaging` and `payment-gateway`.** The three untested services
   with real logic left in them. The money-path pass on day 6 found four concurrency bugs in
   the three services it covered, which is the argument for doing these too.
4. **Validate hostel and inventory with a pilot school before investing further.** Both were
   built on day 5 against the recommendation in this file. Nothing in the gap analysis in
   `PROPOSAL.md` identifies either as a wedge, and that hasn't changed by their existing.
5. **Lesson planning is still web-only.** Flagged on day 4, unchanged: a teacher's own plans
   aren't on mobile. Small, and worth adding when a teacher asks for it.
