import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import type { NotificationsService } from "../notifications/notifications.service";
import type { PrismaService } from "../prisma/prisma.service";
import { FinanceService, addMonths, monthKey, monthStart, sumMoney } from "./finance.service";

const SCHOOL = "school-1";
const USER = "user-1";
const person = { firstName: "Asif", lastName: "Ali" };

function expenseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "exp-1",
    categoryId: "cat-1",
    category: { name: "Supplies" },
    payee: "Al-Madina Printers",
    description: null,
    amount: 31000,
    spentOn: new Date("2026-10-05T00:00:00.000Z"),
    billUrl: null,
    status: "PENDING",
    raisedByUser: person,
    reviewedByUser: null,
    reviewedAt: null,
    reviewNote: null,
    createdAt: new Date("2026-10-05T08:00:00.000Z"),
    ...overrides,
  };
}

function makePrisma() {
  return {
    budgetCategory: {
      count: jest.fn().mockResolvedValue(1),
      createMany: jest.fn().mockResolvedValue({ count: 7 }),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
    },
    budgetLine: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    expense: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve(expenseRow(data))),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    paymentSubmission: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findMany: jest.fn().mockResolvedValue([{ id: "admin-1" }, { id: "admin-2" }]) },
    invoice: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn().mockImplementation((ops: unknown[]) => Promise.all(ops)),
  };
}

describe("finance date and money helpers", () => {
  it("builds month boundaries in UTC", () => {
    expect(monthStart("2026-10").toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(addMonths(monthStart("2026-12"), 1).toISOString()).toBe("2027-01-01T00:00:00.000Z");
    expect(addMonths(monthStart("2026-01"), -1).toISOString()).toBe("2025-12-01T00:00:00.000Z");
    expect(monthKey(new Date("2026-03-31T23:59:59.000Z"))).toBe("2026-03");
  });

  it("adds money without float drift", () => {
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
    expect(sumMoney(["1000.10", "2000.20", 0.05])).toBe(3000.35);
    expect(sumMoney([])).toBe(0);
  });
});

describe("FinanceService", () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: FinanceService;
  let notifications: { sendPush: jest.Mock };

  beforeEach(() => {
    prisma = makePrisma();
    notifications = { sendPush: jest.fn() };
    service = new FinanceService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
    );
  });

  describe("categories", () => {
    it("creates the starter set the first time a school looks", async () => {
      prisma.budgetCategory.count.mockResolvedValue(0);
      await service.categories(SCHOOL);
      const call = prisma.budgetCategory.createMany.mock.calls[0][0];
      expect(call.data).toHaveLength(7);
      expect(call.data.every((c: { schoolId: string }) => c.schoolId === SCHOOL)).toBe(true);
      expect(call.skipDuplicates).toBe(true);
    });

    it("does not re-create them afterwards", async () => {
      await service.categories(SCHOOL);
      expect(prisma.budgetCategory.createMany).not.toHaveBeenCalled();
    });

    it("refuses a duplicate name regardless of case", async () => {
      prisma.budgetCategory.findFirst.mockResolvedValue({ id: "cat-1" });
      await expect(service.createCategory(SCHOOL, { name: "salaries" })).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.budgetCategory.create).not.toHaveBeenCalled();
    });

    it("cannot archive another school's category", async () => {
      await expect(service.setCategoryArchived(SCHOOL, "cat-x", true)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.budgetCategory.findFirst.mock.calls[0][0].where).toEqual({
        id: "cat-x",
        schoolId: SCHOOL,
      });
      expect(prisma.budgetCategory.update).not.toHaveBeenCalled();
    });
  });

  describe("setBudget", () => {
    it("refuses a category that belongs to another school", async () => {
      prisma.budgetCategory.count.mockResolvedValue(1);
      await expect(
        service.setBudget(SCHOOL, {
          month: "2026-10",
          lines: [
            { categoryId: "mine", amount: 100 },
            { categoryId: "theirs", amount: 100 },
          ],
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.budgetLine.upsert).not.toHaveBeenCalled();
    });

    it("refuses the same category twice", async () => {
      await expect(
        service.setBudget(SCHOOL, {
          month: "2026-10",
          lines: [
            { categoryId: "a", amount: 1 },
            { categoryId: "a", amount: 2 },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("upserts each line for the first of the month", async () => {
      prisma.budgetCategory.count.mockResolvedValue(1);
      await service.setBudget(SCHOOL, { month: "2026-10", lines: [{ categoryId: "a", amount: 90000 }] });
      const arg = prisma.budgetLine.upsert.mock.calls[0][0];
      expect(arg.where.categoryId_month.month.toISOString()).toBe("2026-10-01T00:00:00.000Z");
      expect(arg.create).toMatchObject({ schoolId: SCHOOL, categoryId: "a", amount: 90000 });
    });
  });

  describe("copyPreviousBudget", () => {
    it("copies only categories that have no line yet", async () => {
      prisma.budgetLine.findMany
        .mockResolvedValueOnce([
          { categoryId: "a", amount: 100 },
          { categoryId: "b", amount: 200 },
        ])
        .mockResolvedValueOnce([{ categoryId: "a" }]);
      prisma.budgetLine.createMany.mockResolvedValue({ count: 1 });
      const result = await service.copyPreviousBudget(SCHOOL, "2026-10");
      expect(result).toEqual({ copied: 1 });
      expect(prisma.budgetLine.createMany.mock.calls[0][0].data).toEqual([
        expect.objectContaining({ schoolId: SCHOOL, categoryId: "b", amount: 200 }),
      ]);
    });
  });

  describe("createExpense", () => {
    const input = {
      categoryId: "cat-1",
      payee: "Al-Madina Printers",
      amount: 31000,
      spentOn: "2026-10-05",
    };

    it("refuses another school's category", async () => {
      await expect(service.createExpense(SCHOOL, USER, input)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.expense.create).not.toHaveBeenCalled();
    });

    it("refuses an archived category", async () => {
      prisma.budgetCategory.findFirst.mockResolvedValue({ id: "cat-1", archivedAt: new Date() });
      await expect(service.createExpense(SCHOOL, USER, input)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it("refuses a date that does not exist", async () => {
      prisma.budgetCategory.findFirst.mockResolvedValue({ id: "cat-1", archivedAt: null });
      await expect(
        service.createExpense(SCHOOL, USER, { ...input, spentOn: "2026-02-30" }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("approves straight away when the category stays inside its budget", async () => {
      prisma.budgetCategory.findFirst.mockResolvedValue({ id: "cat-1", archivedAt: null });
      prisma.budgetLine.findUnique.mockResolvedValue({ amount: 90000 });
      prisma.expense.findMany.mockResolvedValue([{ amount: 59000 }]);
      const result = await service.createExpense(SCHOOL, USER, input);
      expect(result.status).toBe("APPROVED");
    });

    it("waits for approval when it would go over budget", async () => {
      prisma.budgetCategory.findFirst.mockResolvedValue({ id: "cat-1", archivedAt: null });
      prisma.budgetLine.findUnique.mockResolvedValue({ amount: 90000 });
      prisma.expense.findMany.mockResolvedValue([{ amount: 62000 }]);
      const result = await service.createExpense(SCHOOL, USER, input);
      expect(result.status).toBe("PENDING");
      expect(prisma.expense.create.mock.calls[0][0].data.reviewedAt).toBeNull();
    });

    it("tells the school's admins when an expense needs a decision", async () => {
      prisma.budgetCategory.findFirst.mockResolvedValue({ id: "cat-1", archivedAt: null });
      await service.createExpense(SCHOOL, USER, input);
      expect(prisma.user.findMany.mock.calls[0][0].where).toEqual({ schoolId: SCHOOL, role: "SCHOOL_ADMIN", isActive: true });
      const [userIds, payload] = notifications.sendPush.mock.calls[0];
      expect(userIds).toEqual(["admin-1", "admin-2"]);
      expect(payload.data).toMatchObject({ type: "EXPENSE" });
    });

    it("notifies nobody for an expense that is inside budget", async () => {
      prisma.budgetCategory.findFirst.mockResolvedValue({ id: "cat-1", archivedAt: null });
      prisma.budgetLine.findUnique.mockResolvedValue({ amount: 90000 });
      await service.createExpense(SCHOOL, USER, input);
      expect(notifications.sendPush).not.toHaveBeenCalled();
    });

    it("waits for approval when no budget is set", async () => {
      prisma.budgetCategory.findFirst.mockResolvedValue({ id: "cat-1", archivedAt: null });
      const result = await service.createExpense(SCHOOL, USER, input);
      expect(result.status).toBe("PENDING");
    });
  });

  describe("reviewExpense", () => {
    it("only decides an expense that is still pending, inside the school", async () => {
      prisma.expense.findFirst.mockResolvedValue(expenseRow({ status: "APPROVED" }));
      await service.reviewExpense(SCHOOL, USER, "exp-1", { decision: "APPROVED" });
      expect(prisma.expense.updateMany.mock.calls[0][0].where).toEqual({
        id: "exp-1",
        schoolId: SCHOOL,
        status: "PENDING",
      });
    });

    it("says so when someone else already decided", async () => {
      prisma.expense.updateMany.mockResolvedValue({ count: 0 });
      prisma.expense.findFirst.mockResolvedValue(expenseRow({ status: "DECLINED" }));
      await expect(
        service.reviewExpense(SCHOOL, USER, "exp-1", { decision: "APPROVED" }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("reports not found for another school's expense", async () => {
      prisma.expense.updateMany.mockResolvedValue({ count: 0 });
      await expect(
        service.reviewExpense(SCHOOL, USER, "exp-x", { decision: "APPROVED" }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  it("deletes only a pending expense in the caller's school", async () => {
    await service.deleteExpense(SCHOOL, "exp-1");
    expect(prisma.expense.deleteMany.mock.calls[0][0].where).toEqual({
      id: "exp-1",
      schoolId: SCHOOL,
      status: "PENDING",
    });
    prisma.expense.deleteMany.mockResolvedValue({ count: 0 });
    await expect(service.deleteExpense(SCHOOL, "exp-1")).rejects.toBeInstanceOf(NotFoundException);
  });

  describe("overview", () => {
    const now = new Date("2026-10-12T10:00:00.000Z");

    beforeEach(() => {
      prisma.budgetCategory.findMany.mockResolvedValue([
        { id: "sup", name: "Supplies", archivedAt: null },
        { id: "old", name: "Old heading", archivedAt: new Date() },
      ]);
      prisma.budgetLine.findMany.mockResolvedValue([{ categoryId: "sup", amount: 90000 }]);
      prisma.expense.findMany.mockResolvedValue([
        { categoryId: "sup", amount: 62000, status: "APPROVED", spentOn: new Date("2026-10-03T00:00:00Z") },
        { categoryId: "sup", amount: 31000, status: "PENDING", spentOn: new Date("2026-10-05T00:00:00Z") },
        { categoryId: "sup", amount: 40000, status: "APPROVED", spentOn: new Date("2026-09-20T00:00:00Z") },
      ]);
      prisma.paymentSubmission.findMany.mockResolvedValue([
        { amountClaimed: 150000.5, reviewedAt: new Date("2026-10-02T09:00:00Z") },
        { amountClaimed: 100000, reviewedAt: new Date("2026-09-15T09:00:00Z") },
      ]);
      prisma.invoice.findMany.mockResolvedValue([
        { amountDue: 5000, amountPaid: 2000 },
        { amountDue: 5000, amountPaid: 6000 },
      ]);
    });

    it("counts only approved spending and this month's verified payments", async () => {
      const result = await service.overview(SCHOOL, "2026-10", now);
      expect(result.income).toBe(150000.5);
      expect(result.verifiedPaymentCount).toBe(1);
      expect(result.spent).toBe(62000);
      expect(result.net).toBe(88000.5);
      expect(result.pendingExpenseCount).toBe(1);
      expect(result.pendingExpenseAmount).toBe(31000);
    });

    it("reports budget use and hides idle archived categories", async () => {
      const result = await service.overview(SCHOOL, "2026-10", now);
      expect(result.categories).toEqual([
        { categoryId: "sup", name: "Supplies", archived: false, budget: 90000, spent: 62000, pending: 31000 },
      ]);
      expect(result.budgetTotal).toBe(90000);
      expect(result.budgetUsedPercent).toBeCloseTo(68.89, 1);
    });

    it("does not let an overpaid invoice shrink what others owe", async () => {
      const result = await service.overview(SCHOOL, "2026-10", now);
      expect(result.unpaidFees).toBe(3000);
    });

    it("gives six months of trend ending with the chosen month", async () => {
      const result = await service.overview(SCHOOL, "2026-10", now);
      expect(result.trend.map((t) => t.month)).toEqual([
        "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10",
      ]);
      expect(result.trend[4]).toEqual({ month: "2026-09", income: 100000, spent: 40000 });
      expect(result.trend[5]).toEqual({ month: "2026-10", income: 150000.5, spent: 62000 });
    });

    it("has no budget percentage when nothing is budgeted", async () => {
      prisma.budgetLine.findMany.mockResolvedValue([]);
      const result = await service.overview(SCHOOL, "2026-10", now);
      expect(result.budgetUsedPercent).toBeNull();
    });

    it("scopes every query to the school", async () => {
      await service.overview(SCHOOL, "2026-10", now);
      for (const mock of [
        prisma.budgetLine.findMany,
        prisma.expense.findMany,
        prisma.paymentSubmission.findMany,
        prisma.invoice.findMany,
      ]) {
        expect(mock.mock.calls[0][0].where.schoolId).toBe(SCHOOL);
      }
    });
  });
});
