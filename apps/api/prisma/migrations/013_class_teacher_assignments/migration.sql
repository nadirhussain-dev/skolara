-- class_teacher_assignments
--
-- Teachers were scoped to their school but not to their classes: any teacher
-- could mark the register or enter grades for any class in the school. In a
-- small school that's tolerable; in a 2,000-student one it means a teacher can
-- silently overwrite a colleague's marks.
--
-- SchoolClass.classTeacherId already existed but was never written or read,
-- and a single column can't express the real relationship anyway — a teacher
-- takes several classes and a class has several teachers. That column stays as
-- the form teacher; this table governs who may act on a class.

-- CreateTable
CREATE TABLE "ClassTeacher" (
    "classId" TEXT NOT NULL,
    "teacherUserId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassTeacher_pkey" PRIMARY KEY ("classId","teacherUserId")
);

-- CreateIndex
-- Backs "which classes does this teacher take", the lookup every teacher
-- request makes; the composite primary key already covers the other direction.
CREATE INDEX "ClassTeacher_teacherUserId_idx" ON "ClassTeacher"("teacherUserId");

-- AddForeignKey
ALTER TABLE "ClassTeacher" ADD CONSTRAINT "ClassTeacher_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTeacher" ADD CONSTRAINT "ClassTeacher_teacherUserId_fkey" FOREIGN KEY ("teacherUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Same RLS stance as every other table (see the enable_row_level_security
-- migration): deny-by-default for anon/authenticated, Prisma's connection role
-- bypasses RLS regardless.
ALTER TABLE "ClassTeacher" ENABLE ROW LEVEL SECURITY;
