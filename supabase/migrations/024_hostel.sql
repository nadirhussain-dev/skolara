-- hostel
--
-- Every new table needs RLS enabled to match the stance set in
-- 005_enable_row_level_security: Supabase auto-exposes public
-- tables through PostgREST, and a table without RLS is readable by anyone
-- holding the anon key. Prisma's connection role has BYPASSRLS, so this does
-- not affect the API.

-- CreateTable
CREATE TABLE "HostelRoom" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "blockName" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "floor" INTEGER,
    "capacity" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostelRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostelAllocation" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "bedNumber" INTEGER NOT NULL,
    "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vacatedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "HostelAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HostelRoom_schoolId_blockName_roomNumber_key" ON "HostelRoom"("schoolId", "blockName", "roomNumber");

-- CreateIndex
CREATE INDEX "HostelRoom_schoolId_idx" ON "HostelRoom"("schoolId");

-- CreateIndex
CREATE INDEX "HostelAllocation_schoolId_idx" ON "HostelAllocation"("schoolId");

-- CreateIndex
CREATE INDEX "HostelAllocation_roomId_idx" ON "HostelAllocation"("roomId");

-- CreateIndex
CREATE INDEX "HostelAllocation_studentId_idx" ON "HostelAllocation"("studentId");

-- The two rules that matter, enforced by the database rather than by the
-- service counting occupants and hoping nothing else counts at the same time.
-- Both are scoped to current residents (vacatedAt IS NULL), so allocation
-- history is free to repeat a bed or a student. Prisma cannot express a partial
-- unique index, so neither is declared in schema.prisma.

-- One bed holds one student.
CREATE UNIQUE INDEX "HostelAllocation_room_bed_current_key"
    ON "HostelAllocation"("roomId", "bedNumber")
    WHERE "vacatedAt" IS NULL;

-- One student holds one bed. Without this a student could be resident in two
-- rooms at once, which reads as an occupancy overcount and a missing child.
CREATE UNIQUE INDEX "HostelAllocation_student_current_key"
    ON "HostelAllocation"("studentId")
    WHERE "vacatedAt" IS NULL;

-- AddForeignKey
ALTER TABLE "HostelRoom" ADD CONSTRAINT "HostelRoom_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostelAllocation" ADD CONSTRAINT "HostelAllocation_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostelAllocation" ADD CONSTRAINT "HostelAllocation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "HostelRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostelAllocation" ADD CONSTRAINT "HostelAllocation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HostelRoom" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HostelAllocation" ENABLE ROW LEVEL SECURITY;
