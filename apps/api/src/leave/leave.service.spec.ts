import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { LeaveService } from "./leave.service";
import type { NotificationsService } from "../notifications/notifications.service";
import type { PrismaService } from "../prisma/prisma.service";

const SCHOOL = "school-1";
const STAFF = "teacher-1";

// Mon 7 Sep 2026 to Fri 11 Sep 2026 — five working days.
const FIVE_DAYS = {
  kind: "CASUAL" as const,
  startDate: new Date("2026-09-07T00:00:00.000Z"),
  endDate: new Date("2026-09-11T00:00:00.000Z"),
};

describe("LeaveService", () => {
  let prisma: {
    leaveRequest: { create: jest.Mock; findMany: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
    user: { findMany: jest.Mock };
  };
  let notifications: { sendPush: jest.Mock };
  let service: LeaveService;

  beforeEach(() => {
    prisma = {
      leaveRequest: {
        create: jest.fn().mockResolvedValue({
          id: "leave-1",
          requesterUser: { id: STAFF, firstName: "Sana", lastName: "Iqbal", role: "TEACHER" },
        }),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: "leave-1", status: "APPROVED" }),
      },
      user: { findMany: jest.fn().mockResolvedValue([{ id: "admin-1" }]) },
    };
    notifications = { sendPush: jest.fn() };
    service = new LeaveService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
    );
  });

  describe("request", () => {
    it("files a request and alerts the school's admins", async () => {
      await service.request(SCHOOL, STAFF, FIVE_DAYS);

      expect(prisma.leaveRequest.create).toHaveBeenCalled();
      expect(notifications.sendPush).toHaveBeenCalledWith(
        ["admin-1"],
        expect.objectContaining({ body: expect.stringContaining("5 working days") }),
      );
    });

    it("refuses a range that is only a Sunday", async () => {
      await expect(
        service.request(SCHOOL, STAFF, {
          kind: "CASUAL",
          startDate: new Date("2026-09-13T00:00:00.000Z"),
          endDate: new Date("2026-09-13T00:00:00.000Z"),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.leaveRequest.create).not.toHaveBeenCalled();
    });

    it("refuses a request exceeding the remaining allowance", async () => {
      // 13 casual days already used against an allowance of 15.
      prisma.leaveRequest.findMany.mockResolvedValue([
        { startDate: new Date("2026-01-05T00:00:00.000Z"), endDate: new Date("2026-01-19T00:00:00.000Z") },
      ]);

      const error = await service.request(SCHOOL, STAFF, FIVE_DAYS).catch((e) => e);
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toContain("casual leave");
      expect(prisma.leaveRequest.create).not.toHaveBeenCalled();
    });

    it("allows unpaid leave past any cap, since it isn't rationed", async () => {
      prisma.leaveRequest.findMany.mockResolvedValue([
        { startDate: new Date("2026-01-05T00:00:00.000Z"), endDate: new Date("2026-06-30T00:00:00.000Z") },
      ]);

      await expect(
        service.request(SCHOOL, STAFF, { ...FIVE_DAYS, kind: "UNPAID" }),
      ).resolves.toBeDefined();
    });

    it("counts pending requests against the balance, so overlapping asks can't each look affordable", async () => {
      await service.request(SCHOOL, STAFF, FIVE_DAYS);
      expect(prisma.leaveRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: { in: ["APPROVED", "PENDING"] } }),
        }),
      );
    });
  });

  describe("balances", () => {
    it("reports every kind, with uncapped kinds as null rather than zero", async () => {
      const balances = await service.balances(SCHOOL, STAFF);

      expect(balances).toHaveLength(5);
      expect(balances.find((b) => b.kind === "CASUAL")).toMatchObject({
        allowanceDays: 15,
        usedDays: 0,
        remainingDays: 15,
      });
      expect(balances.find((b) => b.kind === "UNPAID")).toMatchObject({
        allowanceDays: null,
        remainingDays: null,
      });
    });

    it("never reports a negative remainder", async () => {
      prisma.leaveRequest.findMany.mockResolvedValue([
        { startDate: new Date("2026-01-05T00:00:00.000Z"), endDate: new Date("2026-03-31T00:00:00.000Z") },
      ]);
      const balances = await service.balances(SCHOOL, STAFF);
      expect(balances.every((b) => b.remainingDays === null || b.remainingDays >= 0)).toBe(true);
    });
  });

  describe("review", () => {
    const pending = {
      id: "leave-1",
      requesterUserId: STAFF,
      kind: "CASUAL",
      status: "PENDING",
      requesterUser: { id: STAFF, firstName: "Sana", lastName: "Iqbal", role: "TEACHER" },
    };

    it("approves and tells the requester", async () => {
      prisma.leaveRequest.findFirst.mockResolvedValue(pending);
      await service.review(SCHOOL, "leave-1", "admin-1", { status: "APPROVED" });

      expect(notifications.sendPush).toHaveBeenCalledWith(
        [STAFF],
        expect.objectContaining({ title: "Leave approved" }),
      );
    });

    it("refuses to let someone approve their own leave", async () => {
      prisma.leaveRequest.findFirst.mockResolvedValue(pending);
      await expect(
        service.review(SCHOOL, "leave-1", STAFF, { status: "APPROVED" }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.leaveRequest.update).not.toHaveBeenCalled();
    });

    it("refuses to re-review a request that's already settled", async () => {
      prisma.leaveRequest.findFirst.mockResolvedValue({ ...pending, status: "APPROVED" });
      await expect(
        service.review(SCHOOL, "leave-1", "admin-1", { status: "REJECTED", reviewNote: "no" }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects a request from another school as not found", async () => {
      prisma.leaveRequest.findFirst.mockResolvedValue(null);
      await expect(
        service.review(SCHOOL, "leave-1", "admin-1", { status: "APPROVED" }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("passes the decline reason on to the requester", async () => {
      prisma.leaveRequest.findFirst.mockResolvedValue(pending);
      await service.review(SCHOOL, "leave-1", "admin-1", {
        status: "REJECTED",
        reviewNote: "Exams that week",
      });
      expect(notifications.sendPush).toHaveBeenCalledWith(
        [STAFF],
        expect.objectContaining({ body: expect.stringContaining("Exams that week") }),
      );
    });
  });

  describe("cancel", () => {
    it("withdraws a pending request", async () => {
      prisma.leaveRequest.findFirst.mockResolvedValue({ id: "leave-1", status: "PENDING" });
      await service.cancel(STAFF, "leave-1");
      expect(prisma.leaveRequest.update).toHaveBeenCalledWith({
        where: { id: "leave-1" },
        data: { status: "CANCELLED" },
      });
    });

    it("won't withdraw one that's already been decided", async () => {
      prisma.leaveRequest.findFirst.mockResolvedValue({ id: "leave-1", status: "APPROVED" });
      await expect(service.cancel(STAFF, "leave-1")).rejects.toBeInstanceOf(BadRequestException);
    });

    it("won't let one person withdraw another's request", async () => {
      // Scoped by requesterUserId in the query, so someone else's simply isn't found.
      prisma.leaveRequest.findFirst.mockResolvedValue(null);
      await expect(service.cancel(STAFF, "leave-1")).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
