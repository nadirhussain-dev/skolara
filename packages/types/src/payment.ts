import { z } from "zod";
import { httpUrlSchema } from "./common";

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

/** An invoice as the fees screen lists it, with who it is for. */
export const invoiceRowSchema = invoiceSchema.extend({
  studentName: z.string(),
  admissionNumber: z.string(),
  classId: z.string().uuid().nullable(),
  className: z.string().nullable(),
  classSection: z.string().nullable(),
  /** What is still owed; never below 0. */
  balance: z.number().nonnegative(),
  /** Not fully paid and past its due date. */
  overdue: z.boolean(),
});
export type InvoiceRow = z.infer<typeof invoiceRowSchema>;

export const invoiceFilterSchema = z.enum(["ALL", "UNPAID", "OVERDUE", "PAID"]);
export type InvoiceFilter = z.infer<typeof invoiceFilterSchema>;

export const invoiceListSchema = z.object({
  invoices: z.array(invoiceRowSchema),
  totals: z.object({
    invoiced: z.number(),
    collected: z.number(),
    outstanding: z.number(),
    overdue: z.number(),
    overdueCount: z.number(),
  }),
});
export type InvoiceList = z.infer<typeof invoiceListSchema>;

const invoiceAmountSchema = z
  .number()
  .positive()
  .max(9_999_999_999.99)
  .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, {
    message: "Amounts can have at most 2 decimal places",
  });

/** Raise the same invoice for a whole class, or the whole school. */
export const bulkInvoiceSchema = z.object({
  /** Omit to bill every student in the school. */
  classId: z.string().uuid().optional(),
  term: z.string().trim().min(1).max(60),
  amountDue: invoiceAmountSchema,
  dueDate: z.coerce.date(),
});
export type BulkInvoiceInput = z.infer<typeof bulkInvoiceSchema>;

export const bulkInvoiceResultSchema = z.object({
  created: z.number(),
  /** Students who already had an invoice for this term. */
  skipped: z.number(),
});
export type BulkInvoiceResult = z.infer<typeof bulkInvoiceResultSchema>;

/** One family behind on fees. */
export const defaulterSchema = z.object({
  studentId: z.string().uuid(),
  studentName: z.string(),
  admissionNumber: z.string(),
  className: z.string().nullable(),
  classSection: z.string().nullable(),
  overdueAmount: z.number(),
  overdueInvoiceCount: z.number(),
  oldestDueDate: z.coerce.date(),
  /** How many parent accounts can be notified. 0 means nobody will see a reminder. */
  parentCount: z.number(),
});
export type Defaulter = z.infer<typeof defaulterSchema>;

export const feeReminderSchema = z.object({
  studentIds: z.array(z.string().uuid()).min(1).max(500),
});
export type FeeReminderInput = z.infer<typeof feeReminderSchema>;

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
  /** Rendered on verification; null until then. */
  receiptUrl: z.string().url().nullable(),
  createdAt: z.coerce.date(),
});
export type PaymentSubmission = z.infer<typeof paymentSubmissionSchema>;

export const submitPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amountClaimed: z.number().positive().max(9_999_999_999.99),
  // Shown to the reviewing admin as an image and a link.
  screenshotUrl: httpUrlSchema,
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
