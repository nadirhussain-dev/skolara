-- student_absence_requests
--
-- Every new table needs RLS enabled to match the stance set in
-- 005_enable_row_level_security: Supabase auto-exposes public
-- tables through PostgREST, and a table without RLS is readable by anyone
-- holding the anon key. Prisma's connection role has BYPASSRLS, so this does
-- not affect the API.

-- A family telling the school in advance that a child will be away.
--
-- Deliberately not a LeaveRequest. Staff leave draws down an annual allowance
-- and is about entitlement; a pupil's absence has no allowance and exists to
-- change what the register says — an approved request turns ABSENT into
-- EXCUSED. Sharing the table would have meant a nullable requester, a
-- nullable student and a `kind` that means nothing on half the rows.
--
-- Reuses "LeaveStatus": the four states and their meanings are identical, and
-- a second enum spelling PENDING/APPROVED/REJECTED/CANCELLED would drift.
CREATE TABLE "AbsenceRequest" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "raisedByUserId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AbsenceRequest_pkey" PRIMARY KEY ("id")
);

-- The end can't precede the start. Checked here as well as in the API,
-- because a reversed range silently covers no days and would look like the
-- feature quietly doing nothing.
ALTER TABLE "AbsenceRequest"
  ADD CONSTRAINT "AbsenceRequest_range_ordered" CHECK ("endDate" >= "startDate");

-- CreateIndex
CREATE INDEX "AbsenceRequest_schoolId_status_idx" ON "AbsenceRequest"("schoolId", "status");

-- CreateIndex
CREATE INDEX "AbsenceRequest_studentId_status_idx" ON "AbsenceRequest"("studentId", "status");

-- CreateIndex
CREATE INDEX "AbsenceRequest_raisedByUserId_idx" ON "AbsenceRequest"("raisedByUserId");

-- AddForeignKey
ALTER TABLE "AbsenceRequest" ADD CONSTRAINT "AbsenceRequest_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenceRequest" ADD CONSTRAINT "AbsenceRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenceRequest" ADD CONSTRAINT "AbsenceRequest_raisedByUserId_fkey" FOREIGN KEY ("raisedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenceRequest" ADD CONSTRAINT "AbsenceRequest_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS: no policies, matching every other table.
ALTER TABLE "AbsenceRequest" ENABLE ROW LEVEL SECURITY;
