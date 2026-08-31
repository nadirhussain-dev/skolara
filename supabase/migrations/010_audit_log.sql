-- audit_log
--
-- Append-only record of every state-changing request, for security and
-- compliance review. Written by AuditInterceptor rather than by individual
-- services, so a new endpoint is covered as soon as it exists.
--
-- Actor columns are deliberately denormalised: `actorLabel` and `actorRole`
-- are copied in at write time so the trail still reads correctly after a user
-- is renamed or deactivated, and so non-user actors (API keys) can be named.

-- CreateEnum
CREATE TYPE "AuditOutcome" AS ENUM ('SUCCESS', 'FAILURE');

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT,
    "actorUserId" TEXT,
    "actorLabel" TEXT NOT NULL,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "entityId" TEXT,
    "outcome" "AuditOutcome" NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "ipAddress" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- Matches the only read pattern: one school's trail, newest first.
CREATE INDEX "AuditLog_schoolId_createdAt_idx" ON "AuditLog"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
-- SET NULL, not CASCADE: deleting a user must never erase what they did.
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Same RLS stance as every other table (see the enable_row_level_security
-- migration): deny-by-default for anon/authenticated, Prisma's connection role
-- bypasses RLS regardless.
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
