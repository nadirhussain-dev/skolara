import { z } from "zod";

export const invoiceStatusSchema = z.enum([
  "UNPAID",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
]);
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;

export const invoiceSchema = z.object({
  id: z.string().uuid(),
  schoolId: z.string().uuid(),
  studentId: z.string().uuid(),
  term: z.string(), // e.g. "Term 1 2026"
  amountDue: z.number().positive(),
  amountPaid: z.number().nonnegative(),
  status: invoiceStatusSchema,
  dueDate: z.coerce.date(),
});
export type Invoice = z.infer<typeof invoiceSchema>;

export const createInvoiceSchema = invoiceSchema.pick({
  schoolId: true,
  studentId: true,
  term: true,
  amountDue: true,
  dueDate: true,
});
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const paymentSubmissionStatusSchema = z.enum([
  "PENDING_VERIFICATION",
  "VERIFIED",
  "REJECTED",
  "NEEDS_INFO",
]);
export type PaymentSubmissionStatus = z.infer<
  typeof paymentSubmissionStatusSchema
>;

export const paymentRejectionReasonSchema = z.enum([
  "AMOUNT_MISMATCH",
  "SCREENSHOT_UNCLEAR",
  "WRONG_ACCOUNT",
  "DUPLICATE_SUBMISSION",
  "OTHER",
]);
export type PaymentRejectionReason = z.infer<
  typeof paymentRejectionReasonSchema
>;

export const paymentSubmissionSchema = z.object({
  id: z.string().uuid(),
  referenceId: z.string(), // e.g. "SKL-2026-000482"
  schoolId: z.string().uuid(),
  studentId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  submittedByUserId: z.string().uuid(),
  amountClaimed: z.number().positive(),
  screenshotUrl: z.string().url(),
  status: paymentSubmissionStatusSchema,
  rejectionReason: paymentRejectionReasonSchema.nullable(),
  reviewNote: z.string().nullable(),
  reviewedByUserId: z.string().uuid().nullable(),
  reviewedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
});
export type PaymentSubmission = z.infer<typeof paymentSubmissionSchema>;

export const submitPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amountClaimed: z.number().positive(),
  screenshotUrl: z.string().url(),
});
export type SubmitPaymentInput = z.infer<typeof submitPaymentSchema>;

export const reviewPaymentSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("VERIFIED") }),
  z.object({
    status: z.literal("REJECTED"),
    rejectionReason: paymentRejectionReasonSchema,
    reviewNote: z.string().optional(),
  }),
  z.object({
    status: z.literal("NEEDS_INFO"),
    reviewNote: z.string().min(1),
  }),
]);
export type ReviewPaymentInput = z.infer<typeof reviewPaymentSchema>;
