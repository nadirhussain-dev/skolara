# Six-Day Delivery Plan

Sequencing the unbuilt modules and partials from [FEATURE_STATUS.md](./FEATURE_STATUS.md)
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

**Four of these thirty were on the list for the wrong reason.**

Hostel, inventory, live classes and quizzes are each substantial builds, and none of them
appears anywhere in the gap analysis in `PROPOSAL.md` as a wedge. They are on the roadmap
because full-featured competitors list them — not because a small Multan private school is
choosing a platform on them.

Two of the four are now built. Live classes and quizzes turned out cheap in this codebase:
live classes are one table plus a release-window rule, and quizzes reuse `GradeEntry` instead
of inventing a parallel score store, which is also why they showed up in the performance
graphs for free. The warning stands for the other two — hostel and inventory are new domains,
not new views of existing ones, and there is no equivalent lever to pull.

**Updated recommendation: drop hostel and inventory from day 5** and let that day absorb the
slack days 5 and 6 will need. That buys back the polish time that makes the difference between
"feature complete" and "a school will actually use this". Still a recommendation, not a
decision.

**One backlog row belongs to no day.** Student and parent *leave application* is unbuilt: day 3
covered staff leave, and neither day 5 nor day 6 picks up the family side. It needs adding to a
day or dropping on purpose — day 5 has room for it if hostel and inventory come out.

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
