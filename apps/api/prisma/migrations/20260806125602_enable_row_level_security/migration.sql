-- Enable Row Level Security on every table, with no policies defined.
--
-- Why: Supabase auto-exposes every `public` schema table through its
-- PostgREST API (and the supabase-js client) to the `anon`/`authenticated`
-- Postgres roles by default. Without RLS, anyone holding this project's
-- anon/publishable key could read or write any row directly — including
-- users' password hashes, payment submissions, and every school's data —
-- completely bypassing the NestJS API's auth/tenant-isolation checks.
--
-- With RLS enabled and zero policies attached, Postgres defaults to
-- deny-all for every command (SELECT/INSERT/UPDATE/DELETE) for any role
-- subject to row security. That's exactly what we want: this app has no
-- legitimate use for the PostgREST/client-side API, so `anon` and
-- `authenticated` should never see a row via that path.
--
-- This does NOT affect the application itself. The API's own database
-- role (`postgres`, used via Prisma) has BYPASSRLS — confirmed live on
-- this project — so it continues to see and modify every row exactly as
-- before; all tenant-isolation/authorization stays enforced in the NestJS
-- service layer as it already is. Supabase's `service_role` key (used only
-- if/when Storage integration is wired up) also bypasses RLS by design.

ALTER TABLE "School" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ParentStudentLink" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SchoolClass" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TeacherProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AttendanceRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentSubmission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentReferenceSequence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GradeEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SchoolGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Assignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AssignmentSubmission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MessageThread" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Complaint" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ComplaintComment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BankStatementLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Exam" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Book" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BookLoan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Bus" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BusAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BusLocationPing" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payslip" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApiKey" ENABLE ROW LEVEL SECURITY;

-- Prisma's own internal migration-tracking table — not app data, but there's
-- no reason to leave it exposed via the API either.
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
