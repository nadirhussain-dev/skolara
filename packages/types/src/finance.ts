import { z } from "zod";
import { httpUrlSchema } from "./common";

/** A calendar month as "YYYY-MM". */
export const monthKeySchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must look like 2026-10");
export type MonthKey = z.infer<typeof monthKeySchema>;

/** Rupee amounts: at most 2 decimals and within what the database column holds. */
const twoDecimals = (n: number) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;
const TWO_DECIMALS = { message: "Amounts can have at most 2 decimal places" };
const MAX_MONEY = 9_999_999_999.99;
/** 0 or more. */
const budgetAmountSchema = z.number().finite().min(0).max(MAX_MONEY).refine(twoDecimals, TWO_DECIMALS);
/** More than 0. */
const expenseAmountSchema = z.number().finite().positive().max(MAX_MONEY).refine(twoDecimals, TWO_DECIMALS);

export const expenseStatusSchema = z.enum(["PENDING", "APPROVED", "DECLINED"]);
export type ExpenseStatus = z.infer<typeof expenseStatusSchema>;

export const budgetCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  archivedAt: z.coerce.date().nullable(),
});
export type BudgetCategory = z.infer<typeof budgetCategorySchema>;

export const createBudgetCategorySchema = z.object({
  name: z.string().trim().min(1).max(60),
});
export type CreateBudgetCategoryInput = z.infer<typeof createBudgetCategorySchema>;

export const setBudgetSchema = z.object({
  month: monthKeySchema,
  lines: z
    .array(
      z.object({
        categoryId: z.string().uuid(),
        amount: budgetAmountSchema,
      }),
    )
    .min(1)
    .max(100),
});
export type SetBudgetInput = z.infer<typeof setBudgetSchema>;

export const createExpenseSchema = z.object({
  categoryId: z.string().uuid(),
  payee: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  amount: expenseAmountSchema,
  /** The day the money was spent, as YYYY-MM-DD. */
  spentOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must look like 2026-10-11"),
  billUrl: httpUrlSchema.optional(),
});
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

export const reviewExpenseSchema = z
  .object({
    decision: z.enum(["APPROVED", "DECLINED"]),
    note: z.string().trim().max(500).optional(),
  })
  .refine((d) => d.decision !== "DECLINED" || Boolean(d.note), {
    message: "Say why the expense is declined",
    path: ["note"],
  });
export type ReviewExpenseInput = z.infer<typeof reviewExpenseSchema>;

export const expenseSchema = z.object({
  id: z.string().uuid(),
  categoryId: z.string().uuid(),
  categoryName: z.string(),
  payee: z.string(),
  description: z.string().nullable(),
  amount: z.number(),
  spentOn: z.coerce.date(),
  billUrl: z.string().nullable(),
  status: expenseStatusSchema,
  raisedByName: z.string(),
  reviewedByName: z.string().nullable(),
  reviewedAt: z.coerce.date().nullable(),
  reviewNote: z.string().nullable(),
  createdAt: z.coerce.date(),
});
export type Expense = z.infer<typeof expenseSchema>;

export const financeCategoryRowSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string(),
  archived: z.boolean(),
  /** Null when no budget was set for this category this month. */
  budget: z.number().nullable(),
  /** Approved expenses only. */
  spent: z.number(),
  /** Waiting for approval; not yet counted as spent. */
  pending: z.number(),
});
export type FinanceCategoryRow = z.infer<typeof financeCategoryRowSchema>;

export const financeOverviewSchema = z.object({
  month: monthKeySchema,
  /** Fee payments the school verified in this month. */
  income: z.number(),
  verifiedPaymentCount: z.number(),
  spent: z.number(),
  net: z.number(),
  budgetTotal: z.number(),
  /** 0-100+, or null when no budget is set. */
  budgetUsedPercent: z.number().nullable(),
  pendingExpenseCount: z.number(),
  pendingExpenseAmount: z.number(),
  /** Everything still owed on invoices already due, across all months. */
  unpaidFees: z.number(),
  unpaidInvoiceCount: z.number(),
  categories: z.array(financeCategoryRowSchema),
  /** The six months ending with `month`, oldest first. */
  trend: z.array(z.object({ month: monthKeySchema, income: z.number(), spent: z.number() })),
});
export type FinanceOverview = z.infer<typeof financeOverviewSchema>;
