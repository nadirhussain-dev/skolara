-- platform_broadcasts
--
-- Every new table needs RLS enabled to match the stance set in
-- 005_enable_row_level_security: Supabase auto-exposes public tables through
-- PostgREST, and a table without RLS is readable by anyone holding the anon
-- key. Prisma's connection role has BYPASSRLS, so this does not affect the API.

-- CreateTable
CREATE TABLE "PlatformBroadcast" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audienceRoles" "Role"[],
    "publishedByUserId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformBroadcast_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlatformBroadcast_expiresAt_idx" ON "PlatformBroadcast"("expiresAt");

-- AddForeignKey
ALTER TABLE "PlatformBroadcast" ADD CONSTRAINT "PlatformBroadcast_publishedByUserId_fkey" FOREIGN KEY ("publishedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlatformBroadcast" ENABLE ROW LEVEL SECURITY;
