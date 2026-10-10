/**
 * What the sidebar shows during the MVP.
 *
 * The MVP goes deep on six loops — onboarding, fees, attendance, results,
 * communication and finance — and keeps everything else out of sight until
 * it has been redesigned to the same standard. The pages below still exist
 * and still work; they are only removed from navigation.
 *
 * This is presentation, not access control. What a school may actually use
 * is decided by the API's per-plan feature flags.
 *
 * Set NEXT_PUBLIC_SHOW_ALL_MODULES=true to bring every link back, e.g. while
 * working on one of the deferred modules.
 */
const DEFERRED_HREFS: ReadonlySet<string> = new Set([
  // Platform
  "/super-admin/school-groups",
  "/super-admin/broadcasts",
  "/super-admin/health",
  "/support",
  // Learning
  "/school/materials",
  "/school/quizzes",
  "/school/lesson-plans",
  "/school/live-classes",
  "/school/performance",
  "/school/calendar",
  "/teacher/meetings",
  // Operations
  "/school/library",
  "/school/hostel",
  "/school/inventory",
  "/school/transport",
  "/school/payroll",
  "/school/directory",
  // Finance and admin extras
  "/school/bank-statement",
  "/school/api-keys",
  "/school/audit-logs",
  "/school/data-export",
]);

const SHOW_ALL = process.env.NEXT_PUBLIC_SHOW_ALL_MODULES === "true";

export function isInMvpNav(href: string): boolean {
  return SHOW_ALL || !DEFERRED_HREFS.has(href);
}
