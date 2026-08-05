import { z } from "zod";

export const platformAnalyticsSchema = z.object({
  totalSchools: z.number(),
  schoolsByStatus: z.record(z.string(), z.number()),
  schoolsByPlan: z.record(z.string(), z.number()),
  totalActiveUsers: z.number(),
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

export const defaulterRiskSchema = z.object({
  studentId: z.string().uuid(),
  riskScore: z.number().min(0).max(100),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]),
  reasons: z.array(z.string()),
});
export type DefaulterRisk = z.infer<typeof defaulterRiskSchema>;
