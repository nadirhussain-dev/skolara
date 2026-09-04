-- role_templates
--
-- Every new table needs RLS enabled to match the stance set in
-- 005_enable_row_level_security: Supabase auto-exposes public
-- tables through PostgREST, and a table without RLS is readable by anyone
-- holding the anon key. Prisma's connection role has BYPASSRLS, so this does
-- not affect the API.

-- CreateTable
CREATE TABLE "RoleTemplate" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseRole" "Role" NOT NULL,
    "permissions" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleTemplate_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "User" ADD COLUMN "roleTemplateId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "RoleTemplate_schoolId_name_key" ON "RoleTemplate"("schoolId", "name");

-- CreateIndex
CREATE INDEX "RoleTemplate_schoolId_idx" ON "RoleTemplate"("schoolId");

-- CreateIndex
CREATE INDEX "User_roleTemplateId_idx" ON "User"("roleTemplateId");

-- SUPER_ADMIN can never be a template's base role. The platform owner belongs
-- to no school, so a school admin must not be able to mint a template pointing
-- at that role — even though templates only ever narrow.
ALTER TABLE "RoleTemplate" ADD CONSTRAINT "RoleTemplate_baseRole_not_platform"
    CHECK ("baseRole" <> 'SUPER_ADMIN');

-- AddForeignKey
ALTER TABLE "RoleTemplate" ADD CONSTRAINT "RoleTemplate_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- SET NULL, not RESTRICT: deleting a template must fail open, returning its
-- users to their unrestricted role rather than blocking the delete. A template
-- only ever removes access, so losing one can't grant anything the role
-- doesn't already carry.
ALTER TABLE "User" ADD CONSTRAINT "User_roleTemplateId_fkey" FOREIGN KEY ("roleTemplateId") REFERENCES "RoleTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RoleTemplate" ENABLE ROW LEVEL SECURITY;
