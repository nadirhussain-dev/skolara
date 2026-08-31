-- per_school_email_uniqueness
--
-- User.email was globally unique, which is wrong for a multi-tenant product:
-- the same person can legitimately be a parent at one school and a teacher at
-- another, and two unrelated schools can each have a "office@school.pk".
-- A global constraint means whichever school onboards first silently blocks
-- the other, with no way for support to resolve it.
--
-- Replaced with uniqueness scoped to the school. Platform admins have a NULL
-- schoolId, and Postgres treats NULLs as distinct in a unique constraint, so
-- (NULL, 'a@b.com') would be insertable twice — a partial index covers them.

-- DropIndex
DROP INDEX "User_email_key";

-- CreateIndex
CREATE UNIQUE INDEX "User_schoolId_email_key" ON "User"("schoolId", "email");

-- CreateIndex
-- Login resolves a user by email before it knows the school, so email needs
-- its own index now that it is no longer the leading column of a unique one.
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
-- Covers the NULL-schoolId rows the composite constraint above cannot: there
-- must never be two platform admins sharing an email address.
CREATE UNIQUE INDEX "User_email_platform_key" ON "User"("email") WHERE "schoolId" IS NULL;
