-- lesson_planning
--
-- Every new table needs RLS enabled to match the stance set in
-- 005_enable_row_level_security: Supabase auto-exposes public
-- tables through PostgREST, and a table without RLS is readable by anyone
-- holding the anon key. Prisma's connection role has BYPASSRLS, so this does
-- not affect the API.

-- CreateEnum
CREATE TYPE "SyllabusTopicStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "SyllabusTopic" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "status" "SyllabusTopicStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "plannedForDate" TIMESTAMP(3),
    "completedOn" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyllabusTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonPlan" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "topicId" TEXT,
    "title" TEXT NOT NULL,
    "objectives" TEXT,
    "activities" TEXT,
    "resources" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "periodId" TEXT,
    "teacherUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonPlan_pkey" PRIMARY KEY ("id")
);

-- The same topic listed twice in one term is a typo, not a plan.
CREATE UNIQUE INDEX "SyllabusTopic_classId_subject_term_title_key" ON "SyllabusTopic"("classId", "subject", "term", "title");

-- CreateIndex
CREATE INDEX "SyllabusTopic_schoolId_idx" ON "SyllabusTopic"("schoolId");

-- CreateIndex
CREATE INDEX "SyllabusTopic_classId_subject_term_idx" ON "SyllabusTopic"("classId", "subject", "term");

-- CreateIndex
CREATE INDEX "LessonPlan_schoolId_idx" ON "LessonPlan"("schoolId");

-- CreateIndex
CREATE INDEX "LessonPlan_classId_date_idx" ON "LessonPlan"("classId", "date");

-- CreateIndex
CREATE INDEX "LessonPlan_teacherUserId_date_idx" ON "LessonPlan"("teacherUserId", "date");

-- CreateIndex
CREATE INDEX "LessonPlan_topicId_idx" ON "LessonPlan"("topicId");

-- AddForeignKey
ALTER TABLE "SyllabusTopic" ADD CONSTRAINT "SyllabusTopic_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyllabusTopic" ADD CONSTRAINT "SyllabusTopic_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyllabusTopic" ADD CONSTRAINT "SyllabusTopic_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonPlan" ADD CONSTRAINT "LessonPlan_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonPlan" ADD CONSTRAINT "LessonPlan_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A deleted topic leaves its lessons in place, unpinned: the lesson happened
-- whether or not the syllabus still lists what it was for.
ALTER TABLE "LessonPlan" ADD CONSTRAINT "LessonPlan_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "SyllabusTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonPlan" ADD CONSTRAINT "LessonPlan_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonPlan" ADD CONSTRAINT "LessonPlan_teacherUserId_fkey" FOREIGN KEY ("teacherUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SyllabusTopic" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LessonPlan" ENABLE ROW LEVEL SECURITY;
