import { z } from "zod";

export const payslipSchema = z.object({
  id: z.string().uuid(),
  schoolId: z.string().uuid(),
  staffUserId: z.string().uuid(),
  month: z.string().regex(/^\d{4}-\d{2}$/, "expected YYYY-MM"),
  basicSalary: z.number().nonnegative(),
  deductions: z.number().nonnegative(),
  netPay: z.number(),
  generatedAt: z.coerce.date(),
});
export type Payslip = z.infer<typeof payslipSchema>;

export const createPayslipSchema = z.object({
  staffUserId: z.string().uuid(),
  month: z.string().regex(/^\d{4}-\d{2}$/, "expected YYYY-MM"),
  basicSalary: z.number().nonnegative(),
  deductions: z.number().nonnegative().default(0),
});
export type CreatePayslipInput = z.infer<typeof createPayslipSchema>;
