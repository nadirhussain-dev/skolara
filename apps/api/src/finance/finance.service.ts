import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  BudgetCategory,
  CreateBudgetCategoryInput,
  CreateExpenseInput,
  Expense,
  ExpenseStatus,
  FinanceOverview,
  ReviewExpenseInput,
  SetBudgetInput,
} from "@skolara/types";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

/** Headings a new school starts with, so the budget page is never blank. */
export const DEFAULT_BUDGET_CATEGORIES = [
  "Salaries",
  "Rent",
  "Utilities",
  "Transport",
  "Supplies",
  "Maintenance",
  "Other",
];

/** First instant of a "YYYY-MM" month, in UTC. */
export function monthStart(month: string): Date {
  return new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1));
}

export function addMonths(date: Date, count: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + count, 1));
}

export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Sums rupee amounts in whole paisa. Adding floats directly drifts
 * (0.1 + 0.2), and a statement that is one paisa out is a statement nobody
 * trusts.
 */
export function sumMoney(values: Array<{ toString(): string } | number>): number {
  const paisa = values.reduce<number>((sum, v) => sum + Math.round(Number(v) * 100), 0);
  return paisa / 100;
}

const expenseInclude = {
  category: { select: { name: true } },
  raisedByUser: { select: { firstName: true, lastName: true } },
  reviewedByUser: { select: { firstName: true, lastName: true } },
} as const;

type ExpenseRow = {
  id: string;
  categoryId: string;
  category: { name: string };
  payee: string;
  description: string | null;
  amount: { toString(): string };
  spentOn: Date;
  billUrl: string | null;
  status: ExpenseStatus;
  raisedByUser: { firstName: string; lastName: string };
  reviewedByUser: { firstName: string; lastName: string } | null;
  reviewedAt: Date | null;
  reviewNote: string | null;
  createdAt: Date;
};

function toExpense(row: ExpenseRow): Expense {
  const fullName = (u: { firstName: string; lastName: string }) =>
    `${u.firstName} ${u.lastName}`.trim();
  return {
    id: row.id,
    categoryId: row.categoryId,
    categoryName: row.category.name,
    payee: row.payee,
    description: row.description,
    amount: Number(row.amount),
    spentOn: row.spentOn,
    billUrl: row.billUrl,
    status: row.status,
    raisedByName: fullName(row.raisedByUser),
    reviewedByName: row.reviewedByUser ? fullName(row.reviewedByUser) : null,
    reviewedAt: row.reviewedAt,
    reviewNote: row.reviewNote,
    createdAt: row.createdAt,
  };
}

/**
 * Budgets, expenses and the monthly picture built from them.
 *
 * Every query filters by `schoolId`, and every caller-supplied id
 * (category, expense) is looked up together with it, so one school can never
 * read or write another school's money.
 */
@Injectable()
export class FinanceService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /** Lists categories, creating the starter set the first time a school looks. */
  async categories(schoolId: string): Promise<BudgetCategory[]> {
    const existing = await this.prisma.budgetCategory.count({ where: { schoolId } });
    if (existing === 0) {
      await this.prisma.budgetCategory.createMany({
        data: DEFAULT_BUDGET_CATEGORIES.map((name) => ({ schoolId, name })),
        // Two admins opening the page at once must not fail each other.
        skipDuplicates: true,
      });
    }
    return this.prisma.budgetCategory.findMany({
      where: { schoolId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, archivedAt: true },
    });
  }

  async createCategory(schoolId: string, input: CreateBudgetCategoryInput): Promise<BudgetCategory> {
    const clash = await this.prisma.budgetCategory.findFirst({
      where: { schoolId, name: { equals: input.name, mode: "insensitive" } },
      select: { id: true },
    });
    if (clash) throw new ConflictException("A category with this name already exists");
    return this.prisma.budgetCategory.create({
      data: { schoolId, name: input.name },
      select: { id: true, name: true, archivedAt: true },
    });
  }

  async setCategoryArchived(schoolId: string, id: string, archived: boolean): Promise<BudgetCategory> {
    const category = await this.prisma.budgetCategory.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });
    if (!category) throw new NotFoundException("Category not found");
    return this.prisma.budgetCategory.update({
      where: { id },
      data: { archivedAt: archived ? new Date() : null },
      select: { id: true, name: true, archivedAt: true },
    });
  }

  /** Sets the planned amount for each listed category in one month. */
  async setBudget(schoolId: string, input: SetBudgetInput): Promise<{ updated: number }> {
    const ids = [...new Set(input.lines.map((l) => l.categoryId))];
    if (ids.length !== input.lines.length) {
      throw new BadRequestException("Each category can appear only once");
    }
    const owned = await this.prisma.budgetCategory.count({
      where: { schoolId, id: { in: ids } },
    });
    if (owned !== ids.length) throw new NotFoundException("Category not found");

    const month = monthStart(input.month);
    await this.prisma.$transaction(
      input.lines.map((line) =>
        this.prisma.budgetLine.upsert({
          where: { categoryId_month: { categoryId: line.categoryId, month } },
          create: { schoolId, categoryId: line.categoryId, month, amount: line.amount },
          update: { amount: line.amount },
        }),
      ),
    );
    return { updated: input.lines.length };
  }

  /** Copies last month's budget into `month` for categories that have none yet. */
  async copyPreviousBudget(schoolId: string, monthValue: string): Promise<{ copied: number }> {
    const month = monthStart(monthValue);
    const [previous, current] = await Promise.all([
      this.prisma.budgetLine.findMany({
        where: { schoolId, month: addMonths(month, -1), category: { archivedAt: null } },
        select: { categoryId: true, amount: true },
      }),
      this.prisma.budgetLine.findMany({
        where: { schoolId, month },
        select: { categoryId: true },
      }),
    ]);
    const have = new Set(current.map((l) => l.categoryId));
    const missing = previous.filter((l) => !have.has(l.categoryId));
    if (missing.length === 0) return { copied: 0 };
    const result = await this.prisma.budgetLine.createMany({
      data: missing.map((l) => ({ schoolId, categoryId: l.categoryId, month, amount: l.amount })),
      skipDuplicates: true,
    });
    return { copied: result.count };
  }

  async expenses(
    schoolId: string,
    filter: { month?: string; status?: ExpenseStatus },
  ): Promise<Expense[]> {
    const range = filter.month
      ? { gte: monthStart(filter.month), lt: addMonths(monthStart(filter.month), 1) }
      : undefined;
    const rows = await this.prisma.expense.findMany({
      where: { schoolId, status: filter.status, spentOn: range },
      orderBy: [{ spentOn: "desc" }, { createdAt: "desc" }],
      include: expenseInclude,
      // A school's month is tens of rows; this is a ceiling, not a page size.
      take: 500,
    });
    return rows.map(toExpense);
  }

  /**
   * Records an expense.
   *
   * It is approved straight away when the category stays inside its budget
   * for the month. If it would take the category over budget, or no budget is
   * set, it waits as PENDING so someone has to look at it.
   */
  async createExpense(schoolId: string, userId: string, input: CreateExpenseInput): Promise<Expense> {
    const category = await this.prisma.budgetCategory.findFirst({
      where: { id: input.categoryId, schoolId },
      select: { id: true, archivedAt: true },
    });
    if (!category) throw new NotFoundException("Category not found");
    if (category.archivedAt) throw new BadRequestException("This category is archived");

    const spentOn = new Date(`${input.spentOn}T00:00:00.000Z`);
    if (Number.isNaN(spentOn.getTime()) || spentOn.toISOString().slice(0, 10) !== input.spentOn) {
      throw new BadRequestException("That date does not exist");
    }

    const month = new Date(Date.UTC(spentOn.getUTCFullYear(), spentOn.getUTCMonth(), 1));
    const [line, approved] = await Promise.all([
      this.prisma.budgetLine.findUnique({
        where: { categoryId_month: { categoryId: category.id, month } },
        select: { amount: true },
      }),
      this.prisma.expense.findMany({
        where: {
          schoolId,
          categoryId: category.id,
          status: "APPROVED",
          spentOn: { gte: month, lt: addMonths(month, 1) },
        },
        select: { amount: true },
      }),
    ]);
    const withinBudget =
      line !== null && sumMoney(approved.map((e) => e.amount)) + input.amount <= Number(line.amount);

    const row = await this.prisma.expense.create({
      data: {
        schoolId,
        categoryId: category.id,
        payee: input.payee,
        description: input.description ?? null,
        amount: input.amount,
        spentOn,
        billUrl: input.billUrl ?? null,
        raisedByUserId: userId,
        status: withinBudget ? "APPROVED" : "PENDING",
        reviewedAt: withinBudget ? new Date() : null,
        reviewNote: withinBudget ? "Within budget" : null,
      },
      include: expenseInclude,
    });

    if (!withinBudget) {
      // Someone has to decide, so tell the school's admins where they will see it.
      const admins = await this.prisma.user.findMany({
        where: { schoolId, role: "SCHOOL_ADMIN", isActive: true },
        select: { id: true },
      });
      await this.notifications.sendPush(
        admins.map((admin) => admin.id),
        {
          title: "Expense to approve",
          body: `${input.payee}: Rs ${input.amount.toLocaleString("en-PK")} is over budget and needs a decision.`,
          data: { type: "EXPENSE", expenseId: row.id },
        },
      );
    }
    return toExpense(row);
  }

  async reviewExpense(
    schoolId: string,
    userId: string,
    id: string,
    input: ReviewExpenseInput,
  ): Promise<Expense> {
    // Conditional on PENDING so two admins deciding at once can't both win,
    // and a decided expense can't be quietly flipped.
    const result = await this.prisma.expense.updateMany({
      where: { id, schoolId, status: "PENDING" },
      data: {
        status: input.decision,
        reviewedByUserId: userId,
        reviewedAt: new Date(),
        reviewNote: input.note ?? null,
      },
    });
    const row = await this.prisma.expense.findFirst({
      where: { id, schoolId },
      include: expenseInclude,
    });
    if (!row) throw new NotFoundException("Expense not found");
    if (result.count === 0) throw new ConflictException("This expense has already been decided");
    return toExpense(row);
  }

  /** Removes an expense that is still waiting. Decided ones stay on the record. */
  async deleteExpense(schoolId: string, id: string): Promise<{ deleted: true }> {
    const result = await this.prisma.expense.deleteMany({
      where: { id, schoolId, status: "PENDING" },
    });
    if (result.count === 0) {
      throw new NotFoundException("Only an expense that is still waiting can be removed");
    }
    return { deleted: true };
  }

  async overview(schoolId: string, monthValue: string, now: Date = new Date()): Promise<FinanceOverview> {
    const month = monthStart(monthValue);
    const next = addMonths(month, 1);
    const trendStart = addMonths(month, -5);

    const [categories, lines, expenses, payments, overdue] = await Promise.all([
      this.categories(schoolId),
      this.prisma.budgetLine.findMany({
        where: { schoolId, month },
        select: { categoryId: true, amount: true },
      }),
      this.prisma.expense.findMany({
        where: { schoolId, status: { in: ["APPROVED", "PENDING"] }, spentOn: { gte: trendStart, lt: next } },
        select: { categoryId: true, amount: true, status: true, spentOn: true },
      }),
      this.prisma.paymentSubmission.findMany({
        where: { schoolId, status: "VERIFIED", reviewedAt: { gte: trendStart, lt: next } },
        select: { amountClaimed: true, reviewedAt: true },
      }),
      this.prisma.invoice.findMany({
        where: { schoolId, status: { not: "PAID" }, dueDate: { lt: now } },
        select: { amountDue: true, amountPaid: true },
      }),
    ]);

    const inMonth = expenses.filter((e) => e.spentOn >= month);
    const budgetByCategory = new Map(lines.map((l) => [l.categoryId, Number(l.amount)]));

    const rows = categories
      .map((c) => {
        const own = inMonth.filter((e) => e.categoryId === c.id);
        return {
          categoryId: c.id,
          name: c.name,
          archived: c.archivedAt !== null,
          budget: budgetByCategory.get(c.id) ?? null,
          spent: sumMoney(own.filter((e) => e.status === "APPROVED").map((e) => e.amount)),
          pending: sumMoney(own.filter((e) => e.status === "PENDING").map((e) => e.amount)),
        };
      })
      // An archived category only matters in a month it actually has figures in.
      .filter((r) => !r.archived || r.budget !== null || r.spent > 0 || r.pending > 0);

    const monthPayments = payments.filter((p) => p.reviewedAt !== null && p.reviewedAt >= month);
    const income = sumMoney(monthPayments.map((p) => p.amountClaimed));
    const spent = sumMoney(rows.map((r) => r.spent));
    const budgetTotal = sumMoney(rows.map((r) => r.budget ?? 0));
    const pendingRows = inMonth.filter((e) => e.status === "PENDING");

    const trend = Array.from({ length: 6 }, (_, i) => {
      const start = addMonths(trendStart, i);
      const end = addMonths(start, 1);
      return {
        month: monthKey(start),
        income: sumMoney(
          payments
            .filter((p) => p.reviewedAt !== null && p.reviewedAt >= start && p.reviewedAt < end)
            .map((p) => p.amountClaimed),
        ),
        spent: sumMoney(
          expenses
            .filter((e) => e.status === "APPROVED" && e.spentOn >= start && e.spentOn < end)
            .map((e) => e.amount),
        ),
      };
    });

    return {
      month: monthValue,
      income,
      verifiedPaymentCount: monthPayments.length,
      spent,
      net: sumMoney([income, -spent]),
      budgetTotal,
      budgetUsedPercent: budgetTotal > 0 ? (spent / budgetTotal) * 100 : null,
      pendingExpenseCount: pendingRows.length,
      pendingExpenseAmount: sumMoney(pendingRows.map((e) => e.amount)),
      // An overpaid invoice owes nothing; it must not reduce what others owe.
      unpaidFees: sumMoney(
        overdue.map((i) => Math.max(0, Number(i.amountDue) - Number(i.amountPaid))),
      ),
      unpaidInvoiceCount: overdue.length,
      categories: rows,
      trend,
    };
  }
}
