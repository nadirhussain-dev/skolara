/**
 * What the sidebar shows during the MVP.
 *
 * The MVP goes deep on six loops — onboarding, fees, attendance, results,
 * communication and finance — plus the everyday school screens redesigned to
 * the same standard: timetable, homework, calendar, messages, meetings,
 * concerns, staff leave and pupil absences. Everything else stays out of
 * sight until it has been brought up to that standard. The pages below still exist
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
  // Outside the six loops for now
  "/school/analytics",
  "/school/roles",
  // Learning
  "/school/materials",
  "/school/quizzes",
  "/school/lesson-plans",
  "/school/live-classes",
  "/school/performance",
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
