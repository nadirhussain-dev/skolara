import { z } from "zod";
import { leaveStatusSchema } from "./leave";

/**
 * A family telling the school a child will be away.
 *
 * Shares `leaveStatusSchema` with staff leave — the four states mean exactly
 * the same thing — but nothing else. Staff leave is about an annual
 * entitlement; this exists to change what the register says.
 */
export const requestAbsenceSchema = z
  .object({
    studentId: z.string().uuid(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    /**
     * Required, unlike staff leave. A school is being asked to excuse a
     * child's absence, and there is nothing to weigh without a reason.
     */
    reason: z.string().min(3).max(500),
  })
  .refine((absence) => absence.endDate >= absence.startDate, {
    message: "The last day can't come before the first",
    path: ["endDate"],
  });
export type RequestAbsenceInput = z.infer<typeof requestAbsenceSchema>;

export const reviewAbsenceSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("APPROVED"), reviewNote: z.string().max(500).optional() }),
  z.object({ status: z.literal("REJECTED"), reviewNote: z.string().min(1).max(500) }),
]);
export type ReviewAbsenceInput = z.infer<typeof reviewAbsenceSchema>;

export const absenceRequestSchema = z.object({
  id: z.string().uuid(),
  schoolId: z.string().uuid(),
  studentId: z.string().uuid(),
  raisedByUserId: z.string().uuid(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: z.string(),
  status: leaveStatusSchema,
  reviewedByUserId: z.string().uuid().nullable(),
  reviewedAt: z.coerce.date().nullable(),
  reviewNote: z.string().nullable(),
  createdAt: z.coerce.date(),
});
export type AbsenceRequest = z.infer<typeof absenceRequestSchema>;

/**
 * The longest absence a family can ask for in one request.
 *
 * Not a policy limit so much as a typo guard: a slipped year in the end date
 * would otherwise excuse a child for months and quietly rewrite a term of
 * registers on approval.
 */
export const MAX_ABSENCE_REQUEST_DAYS = 30;
