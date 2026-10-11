import { NotFoundException } from "@nestjs/common";
import type { NotificationsService } from "../notifications/notifications.service";
import type { PrismaService } from "../prisma/prisma.service";
import { InvoicesService } from "./invoices.service";

const SCHOOL = "school-1";
const NOW = new Date("2026-10-11T00:00:00.000Z");

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "inv-1",
    schoolId: SCHOOL,
    studentId: "stu-1",
    term: "October 2026",
    amountDue: 5000,
    amountPaid: 0,
    status: "UNPAID",
    dueDate: new Date("2026-10-05T00:00:00.000Z"),
    student: {
      admissionNumber: "GV-001",
      classId: "class-5b",
      user: { firstName: "Ali", lastName: "Raza" },
      class: { name: "5", section: "B" },
    },
    ...overrides,
  };
}

describe("InvoicesService fees", () => {
  let prisma: {
    invoice: { findMany: jest.Mock; createMany: jest.Mock };
    schoolClass: { findFirst: jest.Mock };
    studentProfile: { findMany: jest.Mock };
    parentStudentLink: { findMany: jest.Mock };
  };
  let notifications: { sendPush: jest.Mock };
  let service: InvoicesService;

  beforeEach(() => {
    prisma = {
      invoice: {
        findMany: jest.fn().mockResolvedValue([]),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      schoolClass: { findFirst: jest.fn().mockResolvedValue({ id: "class-5b" }) },
      studentProfile: { findMany: jest.fn().mockResolvedValue([]) },
      parentStudentLink: { findMany: jest.fn().mockResolvedValue([]) },
    };
    notifications = { sendPush: jest.fn() };
    service = new InvoicesService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
    );
  });

  describe("list", () => {
    it("scopes to the school and applies the overdue filter by date", async () => {
      await service.list(SCHOOL, { status: "OVERDUE", classId: "class-5b" }, NOW);
      const where = prisma.invoice.findMany.mock.calls[0][0].where;
      expect(where.schoolId).toBe(SCHOOL);
      expect(where.student).toEqual({ classId: "class-5b" });
      expect(where.status).toEqual({ not: "PAID" });
      expect(where.dueDate).toEqual({ lt: NOW });
    });

    it("works out balance and overdue per invoice and totals in whole paisa", async () => {
      prisma.invoice.findMany.mockResolvedValue([
        row({ id: "a", amountDue: 5000.1, amountPaid: 2000.2 }),
        row({ id: "b", amountDue: 5000, amountPaid: 6000, status: "PAID" }),
        row({ id: "c", amountDue: 3000, dueDate: new Date("2026-10-20T00:00:00.000Z") }),
      ]);
      const result = await service.list(SCHOOL, { status: "ALL" }, NOW);
      expect(result.invoices.map((i) => [i.id, i.balance, i.overdue])).toEqual([
        ["a", 2999.9, true],
        ["b", 0, false],
        ["c", 3000, false],
      ]);
      expect(result.invoices[0]).toMatchObject({ studentName: "Ali Raza", className: "5", classSection: "B" });
      expect(result.totals).toEqual({
        invoiced: 13000.1,
        // The overpaid invoice counts only up to what was due.
        collected: 7000.2,
        outstanding: 5999.9,
        overdue: 2999.9,
        overdueCount: 1,
      });
    });
  });

  describe("createBulk", () => {
    const input = { term: "October 2026", amountDue: 5000, dueDate: new Date("2026-10-10T00:00:00.000Z") };

    it("refuses a class from another school", async () => {
      prisma.schoolClass.findFirst.mockResolvedValue(null);
      await expect(service.createBulk(SCHOOL, { ...input, classId: "theirs" })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.schoolClass.findFirst.mock.calls[0][0].where).toEqual({ id: "theirs", schoolId: SCHOOL });
      expect(prisma.invoice.createMany).not.toHaveBeenCalled();
    });

    it("bills only students who do not already have this term's invoice", async () => {
      prisma.studentProfile.findMany.mockResolvedValue([{ id: "s1" }, { id: "s2" }, { id: "s3" }]);
      prisma.invoice.findMany.mockResolvedValue([{ studentId: "s2" }]);
      const result = await service.createBulk(SCHOOL, { ...input, classId: "class-5b" });
      expect(result).toEqual({ created: 2, skipped: 1 });
      const data = prisma.invoice.createMany.mock.calls[0][0].data;
      expect(data.map((d: { studentId: string }) => d.studentId)).toEqual(["s1", "s3"]);
      expect(data.every((d: { schoolId: string }) => d.schoolId === SCHOOL)).toBe(true);
    });

    it("only bills active students in the caller's school", async () => {
      await service.createBulk(SCHOOL, input);
      expect(prisma.studentProfile.findMany.mock.calls[0][0].where).toEqual({
        schoolId: SCHOOL,
        user: { isActive: true },
      });
    });

    it("creates nothing when everyone is already billed", async () => {
      prisma.studentProfile.findMany.mockResolvedValue([{ id: "s1" }]);
      prisma.invoice.findMany.mockResolvedValue([{ studentId: "s1" }]);
      expect(await service.createBulk(SCHOOL, input)).toEqual({ created: 0, skipped: 1 });
      expect(prisma.invoice.createMany).not.toHaveBeenCalled();
    });
  });

  describe("defaulters and reminders", () => {
    beforeEach(() => {
      prisma.invoice.findMany.mockResolvedValue([
        row({ id: "a", studentId: "stu-1", amountDue: 5000, dueDate: new Date("2026-09-05T00:00:00.000Z") }),
        row({ id: "b", studentId: "stu-1", amountDue: 5000, amountPaid: 1000 }),
        row({ id: "c", studentId: "stu-2", amountDue: 20000, student: { admissionNumber: "GV-002", classId: null, user: { firstName: "Sara", lastName: "Khan" }, class: null } }),
      ]);
      prisma.parentStudentLink.findMany.mockResolvedValue([
        { studentId: "stu-1", parentUserId: "parent-1" },
        { studentId: "stu-1", parentUserId: "parent-2" },
      ]);
    });

    it("groups overdue invoices by student, largest first", async () => {
      const result = await service.defaulters(SCHOOL, NOW);
      expect(result.map((d) => [d.studentName, d.overdueAmount, d.overdueInvoiceCount, d.parentCount])).toEqual([
        ["Sara Khan", 20000, 1, 0],
        ["Ali Raza", 9000, 2, 2],
      ]);
      expect(result[1]?.oldestDueDate.toISOString()).toBe("2026-09-05T00:00:00.000Z");
    });

    it("reminds only parents of students who are overdue in this school", async () => {
      const result = await service.remind(SCHOOL, ["stu-1", "stu-2", "not-overdue-or-not-ours"]);
      expect(result).toEqual({ reminded: 1, withoutParent: 1 });
      expect(notifications.sendPush).toHaveBeenCalledTimes(1);
      const [userIds, payload] = notifications.sendPush.mock.calls[0];
      expect(userIds).toEqual(["parent-1", "parent-2"]);
      expect(payload.data).toEqual({ type: "FEE_REMINDER", studentId: "stu-1" });
      expect(payload.body).toContain("9,000");
      for (const call of prisma.parentStudentLink.findMany.mock.calls) {
        expect(call[0].where.student).toEqual({ schoolId: SCHOOL });
      }
    });

    it("sends nothing when no id matches an overdue student", async () => {
      expect(await service.remind(SCHOOL, ["someone-else"])).toEqual({ reminded: 0, withoutParent: 0 });
      expect(notifications.sendPush).not.toHaveBeenCalled();
    });
  });
});
