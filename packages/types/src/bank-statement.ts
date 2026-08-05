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

export const suggestedMatchSchema = z.object({
  paymentSubmissionId: z.string().uuid(),
  referenceId: z.string(),
  amountClaimed: z.number(),
  bankStatementLine: bankStatementLineSchema,
});
export type SuggestedMatch = z.infer<typeof suggestedMatchSchema>;
