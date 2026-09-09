import { z } from "zod";

export const bankStatementLineSchema = z.object({
  id: z.string().uuid(),
  schoolId: z.string().uuid(),
  transactionDate: z.coerce.date(),
  amount: z.number(),
  description: z.string(),
  matchedPaymentSubmissionId: z.string().uuid().nullable(),
  importedAt: z.coerce.date(),
});
export type BankStatementLine = z.infer<typeof bankStatementLineSchema>;

export const importBankStatementSchema = z.object({
  csvContent: z.string().min(1),
});
export type ImportBankStatementInput = z.infer<typeof importBankStatementSchema>;

/**
 * Why one row of a statement couldn't be imported.
 *
 * An enum rather than a sentence so the client can translate it — the reason
 * is shown to a school admin who may be reading the app in Urdu, and
 * everything the server phrases itself is still English.
 */
export const bankStatementRejectionReasonSchema = z.enum([
  /** Fewer than the three expected fields. */
  "MALFORMED",
  /** The first field isn't a date. */
  "BAD_DATE",
  /** The second field is empty or isn't a number. */
  "BAD_AMOUNT",
  /**
   * The amount looks like it was split across two fields by an unquoted
   * thousands separator — `1,000.00` read as `1`. Refused rather than guessed:
   * importing a 1,000 rupee transfer as 1 rupee is worse than not importing it.
   */
  "AMBIGUOUS_AMOUNT",
]);
export type BankStatementRejectionReason = z.infer<
  typeof bankStatementRejectionReasonSchema
>;

export const bankStatementRejectionSchema = z.object({
  /** 1-based line number in the submitted file, so the admin can find it. */
  line: z.number().int().positive(),
  /** The row as submitted, truncated, to identify it at a glance. */
  content: z.string(),
  reason: bankStatementRejectionReasonSchema,
});
export type BankStatementRejection = z.infer<typeof bankStatementRejectionSchema>;

export const bankStatementImportResultSchema = z.object({
  imported: z.number().int().nonnegative(),
  /**
   * Every row that wasn't imported. A recognised header row is not counted —
   * it isn't a problem — so this is the number of rows that should have worked
   * and didn't.
   */
  skipped: z.number().int().nonnegative(),
  /**
   * Detail for the skipped rows, capped so a large paste of garbage can't
   * return a response the size of the request. `skipped` is the true count.
   */
  rejections: z.array(bankStatementRejectionSchema),
});
export type BankStatementImportResult = z.infer<
  typeof bankStatementImportResultSchema
>;

export const suggestedMatchSchema = z.object({
  paymentSubmissionId: z.string().uuid(),
  referenceId: z.string(),
  amountClaimed: z.number(),
  bankStatementLine: bankStatementLineSchema,
});
export type SuggestedMatch = z.infer<typeof suggestedMatchSchema>;
