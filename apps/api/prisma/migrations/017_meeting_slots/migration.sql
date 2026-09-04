-- meeting_slots
--
-- Every new table needs RLS enabled to match the stance set in
-- 005_enable_row_level_security: Supabase auto-exposes public tables through
-- PostgREST, and a table without RLS is readable by anyone holding the anon
-- key. Prisma's connection role has BYPASSRLS, so this does not affect the API.

-- CreateTable
CREATE TABLE "MeetingSlot" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "teacherUserId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "bookedByParentUserId" TEXT,
    "studentId" TEXT,
    "bookedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingSlot_pkey" PRIMARY KEY ("id")
);

-- A teacher can't offer two slots starting at the same moment.
CREATE UNIQUE INDEX "MeetingSlot_teacherUserId_startsAt_key" ON "MeetingSlot"("teacherUserId", "startsAt");

-- CreateIndex
CREATE INDEX "MeetingSlot_schoolId_startsAt_idx" ON "MeetingSlot"("schoolId", "startsAt");

-- CreateIndex
CREATE INDEX "MeetingSlot_bookedByParentUserId_idx" ON "MeetingSlot"("bookedByParentUserId");

-- AddForeignKey
ALTER TABLE "MeetingSlot" ADD CONSTRAINT "MeetingSlot_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingSlot" ADD CONSTRAINT "MeetingSlot_teacherUserId_fkey" FOREIGN KEY ("teacherUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingSlot" ADD CONSTRAINT "MeetingSlot_bookedByParentUserId_fkey" FOREIGN KEY ("bookedByParentUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingSlot" ADD CONSTRAINT "MeetingSlot_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MeetingSlot" ENABLE ROW LEVEL SECURITY;
