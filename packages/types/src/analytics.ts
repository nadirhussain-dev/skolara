import { z } from "zod";

export const platformAnalyticsSchema = z.object({
  totalSchools: z.number(),
  schoolsByStatus: z.record(z.string(), z.number()),
  schoolsByPlan: z.record(z.string(), z.number()),
  totalActiveUsers: z.number(),
  /** PKR per month from ACTIVE schools only — trials aren't revenue yet. */
  mrrPkr: z.number(),
  arrPkr: z.number(),
  /** Trials that will lapse within the next 7 days, i.e. the conversion queue. */
  trialsEndingSoon: z.number(),
  /** Signups awaiting approval — the platform owner's inbox. */
  pendingApprovals: z.number(),
  schoolsAddedLast30Days: z.number(),
  /** Schools whose plan is quoted individually and excluded from MRR above. */
  enterpriseSchoolsExcludedFromMrr: z.number(),
});
export type PlatformAnalytics = z.infer<typeof platformAnalyticsSchema>;

export const schoolAnalyticsSchema = z.object({
  studentCount: z.number(),
  teacherCount: z.number(),
  attendanceRateLast30Days: z.number(),
  feeCollectionRate: z.number(),
  pendingPaymentSubmissions: z.number(),
});
export type SchoolAnalytics = z.infer<typeof schoolAnalyticsSchema>;

/**
 * What a school admin needs to act on right now — the dashboard home page.
 * Counts and totals only; each one links to the screen that deals with it.
 */
export const schoolTodaySchema = z.object({
  payments: z.object({
    /** Submissions waiting for someone to check them against the bank. */
    pendingCount: z.number(),
    pendingAmount: z.number(),
    /** Null when the queue is empty. */
    oldestPendingAt: z.coerce.date().nullable(),
  }),
  /** Invoices falling due in the current calendar month. */
  feesThisMonth: z.object({
    invoicedAmount: z.number(),
    collectedAmount: z.number(),
    /** 0–100, or null when nothing was invoiced — "0%" would read as a failure. */
    collectionRate: z.number().nullable(),
    paidInvoiceCount: z.number(),
    unpaidInvoiceCount: z.number(),
  }),
  pendingLeaveRequests: z.number(),
  complaints: z.object({
    openCount: z.number(),
    oldestOpenAt: z.coerce.date().nullable(),
  }),
});
export type SchoolToday = z.infer<typeof schoolTodaySchema>;

export const defaulterRiskSchema = z.object({
  studentId: z.string().uuid(),
  riskScore: z.number().min(0).max(100),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]),
  reasons: z.array(z.string()),
});
export type DefaulterRisk = z.infer<typeof defaulterRiskSchema>;
