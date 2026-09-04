import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { AbsencesService } from "./absences.service";
import type { NotificationsService } from "../notifications/notifications.service";
import type { PrismaService } from "../prisma/prisma.service";

const SCHOOL = "school-1";
const STUDENT = "student-1";
const PARENT = "parent-1";
const ADMIN = "admin-1";
const REQUEST = "absence-1";

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe("AbsencesService", () => {
  let prisma: {
    absenceRequest: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      updateMany: jest.Mock;
    };
    attendanceRecord: { updateMany: jest.Mock };
    user: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let notifications: { sendPush: jest.Mock };
  let service: AbsencesService;

  const row = (overrides = {}) => ({
    id: REQUEST,
    schoolId: SCHOOL,
    studentId: STUDENT,
    raisedByUserId: PARENT,
    startDate: day("2026-09-07"),
    endDate: day("2026-09-09"),
    reason: "Chickenpox",
    status: "PENDING",
    student: {
      id: STUDENT,
      admissionNumber: "A-1",
      user: { firstName: "Hina", lastName: "Raza" },
      class: { id: "class-1", name: "5", section: "A" },
    },
    raisedByUser: { id: PARENT, firstName: "Asad", lastName: "Raza", role: "PARENT" },
    ...overrides,
  });

  beforeEach(() => {
    prisma = {
      absenceRequest: {
        create: jest.fn().mockResolvedValue(row()),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        findUniqueOrThrow: jest.fn().mockResolvedValue(row()),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      attendanceRecord: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
      user: { findMany: jest.fn().mockResolvedValue([{ id: ADMIN }]) },
      $transaction: jest.fn().mockImplementation(async (arg) =>
        typeof arg === "function" ? arg(prisma) : Promise.all(arg),
      ),
    };
    notifications = { sendPush: jest.fn() };
    service = new AbsencesService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
    );
  });

  const input = {
    studentId: STUDENT,
    startDate: day("2026-09-07"),
    endDate: day("2026-09-09"),
    reason: "Chickenpox",
  };

  describe("request", () => {
    it("records the request and tells the office how long it is", async () => {
      await service.request(SCHOOL, PARENT, input);

      expect(prisma.absenceRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            schoolId: SCHOOL,
            studentId: STUDENT,
            raisedByUserId: PARENT,
            reason: "Chickenpox",
          }),
        }),
      );
      // 7th to 9th inclusive is three days, not two.
      expect(notifications.sendPush).toHaveBeenCalledWith(
        [ADMIN],
        expect.objectContaining({ body: expect.stringContaining("3 days") }),
      );
    });

    it("counts a single-day absence as one day", async () => {
      await service.request(SCHOOL, PARENT, {
        ...input,
        endDate: input.startDate,
      });

      expect(notifications.sendPush).toHaveBeenCalledWith(
        [ADMIN],
        expect.objectContaining({ body: expect.stringContaining("1 day") }),
      );
    });

    it("refuses a range long enough to be a slipped year rather than an absence", async () => {
      await expect(
        service.request(SCHOOL, PARENT, { ...input, endDate: day("2027-09-09") }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.absenceRequest.create).not.toHaveBeenCalled();
    });

    it("refuses dates already covered by an approved absence", async () => {
      prisma.absenceRequest.findFirst.mockResolvedValue({ id: "other", status: "APPROVED" });

      await expect(service.request(SCHOOL, PARENT, input)).rejects.toThrow(ConflictException);
      expect(prisma.absenceRequest.create).not.toHaveBeenCalled();
    });

    it("refuses dates already covered by a pending request", async () => {
      prisma.absenceRequest.findFirst.mockResolvedValue({ id: "other", status: "PENDING" });

      await expect(service.request(SCHOOL, PARENT, input)).rejects.toThrow(ConflictException);
    });

    it("tests for overlap rather than for an identical range", async () => {
      await service.request(SCHOOL, PARENT, input);

      // Two ranges overlap when each begins before the other ends; matching on
      // equal start and end dates would let a request that swallows an
      // existing one through.
      expect(prisma.absenceRequest.findFirst).toHaveBeenCalledWith({
        where: {
          studentId: STUDENT,
          status: { in: ["PENDING", "APPROVED"] },
          startDate: { lte: input.endDate },
          endDate: { gte: input.startDate },
        },
        select: { id: true, status: true },
      });
    });

    it("does not restrict the clash check to one school's rows only", async () => {
      // A student belongs to exactly one school, so scoping the overlap check
      // by student is already tenant-safe — and scoping it by school as well
      // would let a stale schoolId hide an existing request.
      await service.request(SCHOOL, PARENT, input);

      const [call] = prisma.absenceRequest.findFirst.mock.calls as [
        [{ where: Record<string, unknown> }],
      ];
      expect(call[0].where).not.toHaveProperty("schoolId");
    });
  });

  describe("review — approving", () => {
    it("excuses the days already marked absent, and only those", async () => {
      await service.review(SCHOOL, REQUEST, ADMIN, { status: "APPROVED" });

      expect(prisma.attendanceRecord.updateMany).toHaveBeenCalledWith({
        where: {
          schoolId: SCHOOL,
          studentId: STUDENT,
          status: "ABSENT",
          date: { gte: day("2026-09-07"), lte: day("2026-09-09") },
        },
        data: { status: "EXCUSED" },
      });
    });

    it("reports how many registers it changed", async () => {
      const result = await service.review(SCHOOL, REQUEST, ADMIN, { status: "APPROVED" });

      expect(result).toEqual(expect.objectContaining({ excusedRecords: 2 }));
    });

    it("claims the request before touching a register", async () => {
      await service.review(SCHOOL, REQUEST, ADMIN, { status: "APPROVED" });

      expect(prisma.absenceRequest.updateMany).toHaveBeenCalledWith({
        where: { id: REQUEST, schoolId: SCHOOL, status: "PENDING" },
        data: expect.objectContaining({ status: "APPROVED", reviewedByUserId: ADMIN }),
      });
    });

    it("does not excuse anything when another admin has already decided it", async () => {
      prisma.absenceRequest.updateMany.mockResolvedValue({ count: 0 });
      prisma.absenceRequest.findFirst.mockResolvedValue({ status: "REJECTED" });

      await expect(
        service.review(SCHOOL, REQUEST, ADMIN, { status: "APPROVED" }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.attendanceRecord.updateMany).not.toHaveBeenCalled();
    });

    it("refuses a request from another school", async () => {
      prisma.absenceRequest.updateMany.mockResolvedValue({ count: 0 });
      prisma.absenceRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.review(SCHOOL, REQUEST, ADMIN, { status: "APPROVED" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("tells whoever raised it, not the student", async () => {
      await service.review(SCHOOL, REQUEST, ADMIN, { status: "APPROVED" });

      expect(notifications.sendPush).toHaveBeenCalledWith(
        [PARENT],
        expect.objectContaining({ body: expect.stringContaining("Hina") }),
      );
    });
  });

  describe("review — declining", () => {
    it("leaves every register alone and passes the reason on", async () => {
      await service.review(SCHOOL, REQUEST, ADMIN, {
        status: "REJECTED",
        reviewNote: "Exams that week",
      });

      expect(prisma.attendanceRecord.updateMany).not.toHaveBeenCalled();
      expect(notifications.sendPush).toHaveBeenCalledWith(
        [PARENT],
        expect.objectContaining({ body: expect.stringContaining("Exams that week") }),
      );
    });
  });

  describe("cancel", () => {
    it("withdraws a request the caller raised", async () => {
      await service.cancel(PARENT, REQUEST);

      expect(prisma.absenceRequest.updateMany).toHaveBeenCalledWith({
        where: { id: REQUEST, raisedByUserId: PARENT, status: "PENDING" },
        data: { status: "CANCELLED" },
      });
    });

    it("refuses to withdraw somebody else's request", async () => {
      prisma.absenceRequest.updateMany.mockResolvedValue({ count: 0 });
      prisma.absenceRequest.findFirst.mockResolvedValue({
        raisedByUserId: "someone-else",
        status: "PENDING",
      });

      await expect(service.cancel(PARENT, REQUEST)).rejects.toThrow(ForbiddenException);
    });

    it("refuses to withdraw one that has already been decided", async () => {
      prisma.absenceRequest.updateMany.mockResolvedValue({ count: 0 });
      prisma.absenceRequest.findFirst.mockResolvedValue({
        raisedByUserId: PARENT,
        status: "APPROVED",
      });

      await expect(service.cancel(PARENT, REQUEST)).rejects.toThrow(BadRequestException);
    });
  });

  describe("findForStudents", () => {
    it("asks for nothing when the caller has no children on file", async () => {
      await service.findForStudents([]);

      expect(prisma.absenceRequest.findMany).not.toHaveBeenCalled();
    });

    it("covers every linked child in one query", async () => {
      await service.findForStudents(["s1", "s2"]);

      expect(prisma.absenceRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { studentId: { in: ["s1", "s2"] } } }),
      );
    });
  });
});
