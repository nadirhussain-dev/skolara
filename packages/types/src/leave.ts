import { z } from "zod";

export const leaveKindSchema = z.enum([
  "CASUAL",
  "SICK",
  "UNPAID",
  "MATERNITY",
  "OTHER",
]);
export type LeaveKind = z.infer<typeof leaveKindSchema>;

export const leaveStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
]);
export type LeaveStatus = z.infer<typeof leaveStatusSchema>;

export const LEAVE_KIND_LABELS: Record<LeaveKind, string> = {
  CASUAL: "Casual leave",
  SICK: "Sick leave",
  UNPAID: "Unpaid leave",
  MATERNITY: "Maternity leave",
  OTHER: "Other",
};

/**
 * Annual entitlement in working days, per kind.
 *
 * A constant rather than a per-school table, for the same reason pricing is:
 * this is policy, and every school in the pilot uses the same figures. When
 * one needs different numbers it becomes school configuration — but a table
 * and an editor for it now would be building for a customer who doesn't exist.
 *
 * UNPAID has no cap: the point of unpaid leave is that it isn't rationed.
 */
export const LEAVE_ALLOWANCE_DAYS: Record<LeaveKind, number | null> = {
  CASUAL: 15,
  SICK: 10,
  UNPAID: null,
  MATERNITY: 90,
  OTHER: 5,
};

export const requestLeaveSchema = z
  .object({
    kind: leaveKindSchema,
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    reason: z.string().max(500).optional(),
  })
  .refine((leave) => leave.endDate >= leave.startDate, {
    message: "Leave can't end before it starts",
    path: ["endDate"],
  });
export type RequestLeaveInput = z.infer<typeof requestLeaveSchema>;

export const reviewLeaveSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("APPROVED"), reviewNote: z.string().max(500).optional() }),
  z.object({ status: z.literal("REJECTED"), reviewNote: z.string().min(1).max(500) }),
]);
export type ReviewLeaveInput = z.infer<typeof reviewLeaveSchema>;

export const leaveRequestSchema = z.object({
  id: z.string().uuid(),
  schoolId: z.string().uuid(),
  requesterUserId: z.string().uuid(),
  kind: leaveKindSchema,
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: z.string().nullable(),
  status: leaveStatusSchema,
  reviewedByUserId: z.string().uuid().nullable(),
  reviewedAt: z.coerce.date().nullable(),
  reviewNote: z.string().nullable(),
  createdAt: z.coerce.date(),
});
export type LeaveRequest = z.infer<typeof leaveRequestSchema>;

export interface LeaveBalance {
  kind: LeaveKind;
  /** Null means uncapped. */
  allowanceDays: number | null;
  usedDays: number;
  /** Null when the allowance is uncapped. */
  remainingDays: number | null;
}
