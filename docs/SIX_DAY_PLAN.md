# Six-Day Delivery Plan

Sequencing the 21 unbuilt modules and 9 partials from [FEATURE_STATUS.md](./FEATURE_STATUS.md)
into six days. Each day is a coherent theme that lands green, in several commits, so any day
can stop early without leaving the tree broken.

Planned against `main` at `54eb576`.

---

## Read this before day 1

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

## Day 3 — People workflows

**Closes 5 rows.**

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

**Cut line:** Staff directory and global broadcast — both small, both easy to pick up on day 6.

---

## Day 4 — Learning & insight

**Closes 5 rows.**

The teacher's web depth, which the proposal identifies as the half competitors underinvest in.
Quizzes are the largest item here and the one with real logic in it.

| # | Chunk | Detail |
|---|---|---|
| 1 | Study materials library | Class-scoped files on the existing storage layer, upgrading materials from assignment attachments to a real library. |
| 2 | Quizzes with MCQ auto-grading | Authoring, timed attempts, automatic scoring, results into the gradebook. |
| 3 | Lesson planning & syllabus tracker | Per class and subject, with coverage against the term. |
| 4 | Live class links | Scheduled links surfaced to the right class at the right time. Deliberately not a video stack. |
| 5 | Student performance graphs | Marks over time by subject, for parents and teachers. |

**Closes:** Study materials · Quizzes · Lesson planning · Live class links · Performance graphs

**Cut line:** Quiz question types beyond MCQ. Auto-grading is the differentiator and MCQ is what
auto-grades.

---

## Day 5 — Operations & tenancy

**Closes 5 rows.**

The remaining standalone modules, plus the two tenancy tools a platform owner needs once real
schools are on it.

| # | Chunk | Detail |
|---|---|---|
| 1 | Hostel management | Rooms, allocations, occupancy. |
| 2 | Inventory / asset management | Items, assignment, condition. |
| 3 | Data export & backup per tenant | A school can take its own data out. Matters commercially — it removes the lock-in objection during a sale. |
| 4 | Role & permission template editor | Custom roles per school on top of the four built-in ones. |
| 5 | Infra health monitor | A dashboard over the health endpoints that already answer. |

**Closes:** Hostel · Inventory · Data export/backup · Role templates · Health monitor

**Cut line:** Hostel and inventory — see [Where to push back](#where-to-push-back).

---

## Day 6 — Ship-readiness

**Closes the remaining partials.**

Everything that makes the previous five days deployable rather than merely merged. This day is
not optional padding — without it nothing reaches a school.

| # | Chunk | Detail |
|---|---|---|
| 1 | Wire 26 admin pages to i18n | The translator, both locales and RTL are built and tested; no admin page calls `t()` yet. This is wiring plus Urdu copy, and it is bigger than "translation content". |
| 2 | Deploy workflow | API container and web app. CI validates today and ships nothing. |
| 3 | Tests for the money paths | Payments, invoices, grades, attendance. Money-handling code with no coverage is the riskiest thing left in the repo. |
| 4 | SMS channel | Alongside WhatsApp, email and push. |
| 5 | Super Admin mobile companion | Approve signups and read revenue on the move. The proposal marks it optional; it is last for that reason. |

**Closes:** Bilingual UI · Scalable infrastructure · Communication centre · Super Admin mobile

**Cut line:** Super Admin mobile, then SMS. The deploy workflow and the money-path tests do not
get cut — if those slip, the honest answer is that day 6 needs a day 7.

---

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

**Four of these thirty are on the list for the wrong reason.**

Hostel, inventory, live classes and quizzes are each substantial builds, and none of them
appears anywhere in the gap analysis in `PROPOSAL.md` as a wedge. They are on the roadmap
because full-featured competitors list them — not because a small Multan private school is
choosing a platform on them.

Building all four costs roughly a day and a half of these six. Dropping them would let days 4
and 5 absorb the slack the other days will almost certainly need, and would buy back the polish
time that makes the difference between "feature complete" and "a school will actually use this".

Recommendation: hold them until a pilot school asks. That is a recommendation, not a decision.

---

## How each day runs

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
