# Six-Day Delivery Plan

Sequencing the unbuilt modules and partials from [FEATURE_STATUS.md](./FEATURE_STATUS.md)
into six days. Each day is a coherent theme that lands green, in several commits, so any day
can stop early without leaving the tree broken.

Planned against `main` at `54eb576`.

---

## Read this before day 1

> **All six days are done.** Every row in `PROPOSAL.md` is built; what remains is verification
> and the server-side half of i18n, both listed in
> [FEATURE_STATUS.md](./FEATURE_STATUS.md#what-to-do-next-in-order). Each day's entry below
> records what actually happened, including what it got wrong.

Thirty items in six days is aggressive. This estimate is not padded to look comfortable, and
scope will not be quietly dropped to hit a day — if something slips it gets called out at the
end of that day and carried forward explicitly.

Each day names a **cut line**: the part to drop first if time runs out. Cut lines are always
depth, never correctness. A shipped feature is tenant-scoped, permission-guarded and tested,
or it does not ship.

---

## Day 1 — Timetable & the calendar spine ✅ done

**Closed 5 rows** (one more than planned — the mobile calendar screen also closed the parent-facing events calendar).

First because it unblocks the most. Teacher timetables, student timetables and the events
calendar all sit behind this one module — nothing else in the backlog clears four rows at once.

| # | Chunk | Detail |
|---|---|---|
| 1 | Schema & migration | `Period`, `TimetableEntry`, `CalendarEvent`. Unique slot per class, per teacher, per room. RLS on all three. |
| 2 | Timetable API with conflict detection | Rejects teacher double-booking, room clash and class clash at write time — a constraint, not a warning the admin can click past. |
| 3 | Admin builder UI | Week grid, click a cell to assign subject + teacher. Conflicts surface inline against the specific cell. |
| 4 | Teacher personal timetable | Web and mobile, derived from the same entries. |
| 5 | Student & parent timetable | Mobile, scoped through the multi-child switcher. |
| 6 | Academic calendar & events | Term dates and school events; feeds the parent app's events view. |

**Closes:** Timetable builder · Teacher personal timetable · Student timetable · Academic calendar & events

**Cut line taken:** Drag-and-drop, in favour of a click-to-assign grid — as planned. The value
is in conflict detection, not the gesture, and the gesture is the expensive half.

**Landed as 5 commits, not 6.** Chunks 4 and 5 merged: the teacher and student timetables differ
only in which query feeds the list and which side of the lesson gets named, so one mobile screen
serves both. The calendar API moved forward into chunk 2 so the API client never shipped a method
with no route behind it.

---

## Day 2 — Documents: report cards, receipts, certificates ✅ done

**Closed 5 rows** — the parent-facing digital report card closed alongside the admin generator.

Three unbuilt modules and two partials all need the same thing: a way to render a document.
Build that once and four rows close behind it. Best ratio of rows cleared to new concepts
introduced anywhere in the backlog.

| # | Chunk | Detail |
|---|---|---|
| 1 | Document rendering service | Server-side HTML → PDF, stored through the existing storage layer so documents get the same unguessable-URL treatment as uploads. |
| 2 | Report card generator | Grades, attendance and AI comments assembled per student per term. Bulk generate for a whole class. |
| 3 | Digital fee receipts | Rendered automatically on payment verification, attached to the submission, visible to the parent. |
| 4 | Certificate generator | Enrolment, character and leaving certificates from school-branded templates. |
| 5 | Downloadable financial reports | CSV export of collections and outstanding fees, closing the Super Admin revenue partial. |

**Closes:** Report card generator · Digital receipts · Certificate generator · Revenue reports download

**Risk resolved:** no headless browser. `pdfmake` 0.2.x takes a declarative document definition
and renders without one — 13MB rather than the ~300MB Chromium would have added. Using the
standard-14 PDF fonts avoids embedding a font family too.

Pinned to 0.2.x deliberately: 0.3 is a rewrite whose Node path expects a URL resolver it never
constructs, so `createPdfKitDocument` throws before producing anything.

**Known limitation:** the standard-14 fonts are Latin-only, so a name in Urdu script renders
blank. Fine for the pilot; needs an embedded font before that stops being true. This is the one
piece of day 2 that isn't finished, and it interacts with the day-6 Urdu work.

---

## Day 3 — People workflows ✅ done

**Closed 6 rows** — leave counts twice, since applying and approving are separate board entries.

Five request-and-approve loops that share one shape: someone asks, someone with authority
responds, both sides get notified. The notification and audit layers they need are already in.

| # | Chunk | Detail |
|---|---|---|
| 1 | Staff leave requests | Apply and check balance on mobile; approve or reject on web. Both sides of one module. |
| 2 | Parent–teacher meeting booking | Teachers publish slots, parents book one. Prevents double-booking the same slot. |
| 3 | Support / helpdesk tickets | Schools raise, platform owner responds. Same resolution-log shape as complaints, one tier up. |
| 4 | Global broadcast announcements | Platform-wide message across every tenant, distinct from school-scoped notices. |
| 5 | Staff directory with click-to-call | Small, and the last row in the School Management block. |

**Closes:** Staff leave approval · Teacher leave application · PTM booking · Support tickets ·
Global broadcast · Staff directory

**Cut line not needed** — everything planned landed, including the two items marked as first to
drop.

**Found on the way:** the staff directory needed a new endpoint. `GET /users` is school-admin only,
and widening it for teachers would have exposed every parent and student in the school. The new
route returns staff rows only, with the role filter fixed in the service rather than taken from a
caller-supplied parameter.

---

## Day 4 — Learning & insight ✅ done

**Closed 7 rows** — two more than planned. Study materials and live classes each close a teacher
row *and* a parent row, because both features are only finished when the family side can read
them.

The teacher's web depth, which the proposal identifies as the half competitors underinvest in.
Quizzes were the largest item and the one with real logic in it.

| # | Chunk | Detail |
|---|---|---|
| 1 | Study materials library | Class-scoped files on the existing storage layer, upgrading materials from assignment attachments to a real library. |
| 2 | Quizzes with MCQ auto-grading | Authoring, timed attempts, automatic scoring, results into the gradebook. |
| 3 | Lesson planning & syllabus tracker | Per class and subject, with coverage against the term. |
| 4 | Live class links | Scheduled links surfaced to the right class at the right time. Deliberately not a video stack. |
| 5 | Student performance graphs | Marks over time by subject, for parents and teachers. |

**Closes:** Study materials (teacher upload · family access) · Quizzes · Lesson planning ·
Live class links (teacher schedule · family join) · Performance graphs

**Cut line taken:** Quiz question types beyond MCQ, as planned. Auto-grading is the
differentiator and MCQ is what auto-grades.

**The design question quizzes actually posed** wasn't the grading — comparing an index to an
answer key is trivial. It was what a timed paper does when the clock runs out. Posting every
answer in one request at submit forces a choice between penalising network lag and letting the
client's clock decide, and both are wrong. Saving each answer as it is chosen removes the
dilemma: the deadline is fixed by the server when the paper opens, and an expired attempt is
graded on whatever arrived in time. It cost one extra endpoint and made a dead battery cost the
remaining questions rather than the whole sitting.

**Quiz marks go into `GradeEntry`,** not a parallel score table. That is why the performance
graphs picked quizzes up for free, and why a quiz mark reaches a report card through the same
path an exam mark does. The cost is that two quizzes could claim one gradebook cell; a unique
index refuses that rather than letting one silently overwrite the other.

**Rendering the chart found two bugs that reading the code had not.** A subject with a single
assessment drew no class-average line, because a one-point SVG path has no stroke length — the
comparison silently vanished. And the endpoint label was struck through by the class-average
line whenever a student sat just below their class. Both were fixed only because the chart was
rendered and looked at, which is now the last step of any chart work here.

**Lesson planning is web-only.** The plan framed day 4 as the teacher's web depth and that is
where it landed; a teacher's own plans are not yet on mobile. Small, and worth adding, but it
was not in scope and is not being counted as done.

**Two rows were widened deliberately.** The upload allowlist is now per-purpose so the materials
library accepts Office documents — a library that refuses a `.docx` is a library nobody uses —
and `GET /grades/student/:id/performance` is ungated, unlike the analytics dashboard, so a
family on the cheapest plan can still see their own child's progress.

---

## Day 5 — Operations & tenancy ✅ done

**Closed 7 rows** — two more than planned. The tenant export also answers the cross-cutting
"automated backups and data export tools" row, and the health monitor closed a partial rather
than an unbuilt row.

| # | Chunk | Detail |
|---|---|---|
| 1 | Hostel management | Rooms, allocations, occupancy. |
| 2 | Inventory / asset management | Items, assignment, condition. |
| 3 | Data export & backup per tenant | A school can take its own data out. Matters commercially — it removes the lock-in objection during a sale. |
| 4 | Role & permission template editor | Custom roles per school on top of the four built-in ones. |
| 5 | Infra health monitor | A dashboard over the health endpoints that already answer. |

**Closes:** Hostel · Inventory · Data export/backup · Automated backups & export tools ·
Role templates · Health monitor

**Cut line not taken.** Hostel and inventory were named as the first things to drop, and the
recommendation to drop them was restated at the end of day 4. They were built because the
instruction was to work the day's list, and the recommendation was a recommendation. What that
cost is visible: they are two of the five chunks and the two with no strategic argument behind
them.

**The day's real problem was chunk 4, and it wasn't the editor.** "Custom roles per school" reads
like a schema change and is actually an authorisation rewrite: four roles are baked into every
`@Roles` check and into the JWT, so replacing them means touching ninety endpoints at once in code
that currently enforces tenancy correctly. The way out was to make a template **narrow** a role
instead of replacing it — the user keeps their role, so every existing check still governs them,
and a template only subtracts. That is a one-directional change with a bounded blast radius: the
worst a bad template does is lock someone out.

Two rules carry it, and both are tested. A template's base role must equal its holder's actual
role, or a SCHOOL_ADMIN template on a teacher would read as an escalation. And nobody may template
themselves, or an admin could narrow their own account out of the editor with no way back.
`role-templates` is deliberately absent from the capability catalogue so a templated account is
refused the editor by construction, with a clear-only escape hatch for the platform owner.

**Two races were closed by making the database decide, not the service.** Hostel beds are claimed
by two partial unique indexes rather than by counting occupants, and inventory stock is reserved in
the same UPDATE that checks it. Both replace a read-then-write that looks safe inside a transaction
and isn't: at Postgres' default READ COMMITTED isolation two callers read the same figure and both
commit.

**Found on the way:** the library's borrow path has exactly that bug — `availableCopies < 1`
checked and then decremented inside a transaction. Not fixed here; flagged for day 6 rather than
smuggled into an inventory commit.

**The export's security design is an allowlist**, not a denylist. Every table names its columns, so
a column added later is absent until someone adds it deliberately — failing open with a missing
field beats failing open with a disclosure. Credentials, platform-internal support notes and
operational logs are excluded, and the spec asserts each exclusion rather than trusting the
comment.

---

## Day 6 — Ship-readiness ✅ done

**Closed 5 rows** — the three partials plus the Super Admin companion and the family leave
application that belonged to no day. Every row in `PROPOSAL.md` is now built.

| # | Chunk | Detail |
|---|---|---|
| 1 | Wire the admin pages to i18n | 46 dashboard pages and, after measuring, all 33 mobile screens. |
| 2 | Deploy workflow | Image → migrations → API → web, gated on a `production` environment. |
| 3 | Tests for the money paths | Payments, invoices, attendance. Found four concurrency bugs and two disclosures. |
| 4 | SMS channel | A fourth channel, routed by a per-school preference. |
| 5 | Super Admin mobile companion | Approval queue and revenue headline. |
| 6 | Family absence requests | The orphan row, added on purpose. |

**Chunks were reordered, deliberately.** The plan numbered i18n first, but chunks 2 and 3 were
the two named uncuttable and chunk 1 was by far the largest. Doing the uncuttable work first
meant it could not be squeezed by the wiring job. Nothing was cut.

**Chunk 3 was the day's real work, and not because of the tests.** Covering the money paths
surfaced four concurrency bugs and two disclosures:

- **Payment verification lost money.** `amountPaid` was read, added to in JavaScript and
  written back, so two submissions against one invoice verified at the same moment both read
  the same balance and the second overwrote the first. The invoice showed one transfer, both
  submissions read VERIFIED, and a parent who had paid had no record of it. The addition is one
  statement now.
- **The library over-borrow race** flagged on day 5, plus the mirror of it on return, where two
  concurrent returns of one loan both incremented and invented a copy.
- **`GET /invoices/student/:id` and `GET /attendance/student/:id`** were open to parents and
  scoped only to the school, so any parent could read another family's fee balance or their
  child's absences by changing the id in the URL. Fourteen other modules route student-scoped
  reads through `StudentAccessService`; these two didn't.

The pattern in all of them is the same one day 5 named: a check and a write that look atomic
inside a transaction and aren't. Finding it twice more in the *money* code is the argument for
covering the three services still untested.

**The i18n chunk was a wiring job that kept finding assumptions.** English grammar assembled at
runtime — "Mark " plus a lower-cased enum, `role.replace("_", " ")`, `DAY_LABEL[day].slice(0, 3)`,
`LEAVE_KIND_LABELS[kind].replace(" leave", "")`. Each reads correctly in English by accident of
word order or Latin script. Enum labels come from the catalogue now, day names carry explicit
short forms, and screen-reader text on the performance charts translates along with the chart it
describes. 152 keys became 1,208.

**Day 6 nearly under-delivered on its own promise.** Chunk 1 was scoped as "26 admin pages", and
that shipped. But the row it was meant to close is "Bilingual UI", and measuring afterwards found
28 of 33 mobile screens with no `t()` call at all. Closing the row meant doing mobile too. Worth
noticing that the chunk description and the row it closed had drifted apart — the chunk was
satisfiable without the row being true.

**What is still English, and named rather than hidden:** everything the server generates.
WhatsApp and SMS bodies, push text, and the report card, receipt and certificate PDFs. There is
no reader locale to consult server-side, because nothing stores a language preference against a
user. That is a schema change, and it is first on the list in `FEATURE_STATUS.md`.

**The absence request was the orphan row, and it is not staff leave.** The leave module already
said why in a comment: staff leave draws down an annual allowance, a pupil's absence has no
allowance and exists to change what the register says. So it is its own table, reusing only the
status enum. Approval converts ABSENT to EXCUSED for days already marked, and the register
consults approved requests when it is taken — the forward half a purely retroactive fix would
have missed for every absence reported in advance.

**Cut line not taken.** Super Admin mobile and SMS were named as first to drop; both shipped.
Building the companion also fixed a platform owner signing in on mobile and landing on the
parent dashboard, where every link 403'd.

**Not verified locally:** no Docker daemon on this machine, so migrations 027 and 028 have never
been applied to a real Postgres, and the API image has never been built. CI does both on push —
and the Dockerfile is now built on every pull request, unpushed, because nothing had ever built
it and the first deploy would otherwise have been its first test.

## Two things needed from you

Neither is code, and both block a pilot.

1. **Pricing and tier boundaries** in `packages/types/src/pricing.ts`. The PKR figures are
   estimates drawn from the competitor research in `PROPOSAL.md`, and the entitlement guard
   refuses requests — a wrong tier locks paying schools out of features they expect.
2. **Storage and push configuration.** A Supabase Storage bucket plus `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_STORAGE_BUCKET`, and an EAS project id in
   `apps/mobile/app.json`. Without them uploads fall back to local disk and push logs to
   console: fine in development, silently wrong in production.

---

## Where to push back

**Four of these thirty were on the list for the wrong reason**, and all four were built anyway.

Hostel, inventory, live classes and quizzes are each substantial builds, and none appears
anywhere in the gap analysis in `PROPOSAL.md` as a wedge. They are on the roadmap because
full-featured competitors list them — not because a small Multan private school is choosing a
platform on them.

Live classes and quizzes turned out cheap in this codebase: live classes are one table plus a
release-window rule, and quizzes reuse `GradeEntry` instead of inventing a parallel score store,
which is also why they showed up in the performance graphs for free. Hostel and inventory had no
such lever — they are new domains, not new views of existing ones. They landed on day 5 despite
the recommendation, because the instruction was to work the day's list. Validate demand for them
with a pilot school before investing further.

**The estimate held, and it shouldn't be read as a comfortable one.** Thirty items in six days
was called aggressive at the start. Thirty-five rows closed, no cut line taken on any day, and
every day green. But two of the six days found bugs in code that had shipped days earlier — day
5 found the library race, day 6 found four more in the money paths — and both were found by
writing tests, not by reading. The lesson isn't that the pace was fine; it's that untested code
was carrying defects the whole time and the schedule was quietly borrowing against them.

**What the six days were actually short of was verification, not time.** No Docker on the
machine, so no migration after 026 has been applied locally and the deployment image has never
been built here. Nothing has been run against a real host. The tests are honest about logic and
say nothing about whether this deploys.

---

## How each day ran

- Say **"do day N"**. The whole day's list gets worked.
- Each numbered chunk becomes its own commit, pushed as it lands — so progress is visible and
  stopping at any point never leaves a broken tree.
- Every commit is green: typecheck, lint, tests, and `./scripts/check-migrations.sh`.
- New tables get RLS and new endpoints get tenant scoping and a permission guard. Neither is
  negotiable, and neither is ever the cut line.
- At the end: what shipped, what got cut and why, and what that means for the days after.

---

Day boundaries follow dependency order, not equal size — day 1 unblocks four later rows, day 6
is what makes the rest deployable.
