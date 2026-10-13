import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { ComplaintsService } from "./complaints.service";

// Regression coverage for the cross-tenant bug fixed here: findOne/addComment/
// updateStatus used to look up complaints by ID alone, so a SCHOOL_ADMIN from
// any school could view or resolve any other school's complaints.

describe("ComplaintsService", () => {
  let service: ComplaintsService;
  let prisma: {
    complaint: { findFirst: jest.Mock; findUniqueOrThrow: jest.Mock; update: jest.Mock; create: jest.Mock };
    user: { findMany: jest.Mock };
    complaintComment: { findMany: jest.Mock; create: jest.Mock };
  };
  let notifications: { sendPush: jest.Mock };

  const SCHOOL_A = "school-a";
  const SCHOOL_B = "school-b";
  const COMPLAINT_ID = "complaint-1";
  const RAISER_ID = "raiser-1";
  const ADMIN_ID = "admin-1";

  beforeEach(async () => {
    prisma = {
      complaint: {
        findFirst: jest.fn(),
        // findOne re-reads the complaint with names attached once access is checked.
        findUniqueOrThrow: jest.fn(({ where }) => Promise.resolve({ id: where.id, comments: [] })),
        update: jest.fn(),
        create: jest.fn(),
      },
      user: { findMany: jest.fn().mockResolvedValue([{ id: "admin-1" }, { id: "admin-2" }]) },
      complaintComment: { findMany: jest.fn(), create: jest.fn() },
    };

    notifications = { sendPush: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        ComplaintsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get(ComplaintsService);
  });

  describe("findOne", () => {
    it("rejects a SCHOOL_ADMIN from a different school (was previously unscoped)", async () => {
      prisma.complaint.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(SCHOOL_B, ADMIN_ID, "SCHOOL_ADMIN", COMPLAINT_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it("allows a SCHOOL_ADMIN in the same school regardless of who raised it", async () => {
      prisma.complaint.findFirst.mockResolvedValue({
        id: COMPLAINT_ID,
        schoolId: SCHOOL_A,
        raisedByUserId: RAISER_ID,
      });
      prisma.complaintComment.findMany.mockResolvedValue([]);

      const result = await service.findOne(SCHOOL_A, ADMIN_ID, "SCHOOL_ADMIN", COMPLAINT_ID);
      expect(result.id).toBe(COMPLAINT_ID);
    });

    it("allows the parent/student who raised it", async () => {
      prisma.complaint.findFirst.mockResolvedValue({
        id: COMPLAINT_ID,
        schoolId: SCHOOL_A,
        raisedByUserId: RAISER_ID,
      });
      prisma.complaintComment.findMany.mockResolvedValue([]);

      await expect(
        service.findOne(SCHOOL_A, RAISER_ID, "PARENT", COMPLAINT_ID),
      ).resolves.toMatchObject({ id: COMPLAINT_ID });
    });

    it("rejects a different parent/student in the same school", async () => {
      prisma.complaint.findFirst.mockResolvedValue({
        id: COMPLAINT_ID,
        schoolId: SCHOOL_A,
        raisedByUserId: RAISER_ID,
      });

      await expect(
        service.findOne(SCHOOL_A, "someone-else", "PARENT", COMPLAINT_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("updateStatus", () => {
    it("rejects resolving another school's complaint", async () => {
      prisma.complaint.findFirst.mockResolvedValue(null);

      await expect(service.updateStatus(SCHOOL_B, COMPLAINT_ID, "RESOLVED")).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.complaint.update).not.toHaveBeenCalled();
    });

    it("resolves a complaint in the caller's own school", async () => {
      prisma.complaint.findFirst.mockResolvedValue({ id: COMPLAINT_ID, schoolId: SCHOOL_A });
      prisma.complaint.update.mockResolvedValue({ id: COMPLAINT_ID, status: "RESOLVED" });

      const result = await service.updateStatus(SCHOOL_A, COMPLAINT_ID, "RESOLVED");
      expect(result.status).toBe("RESOLVED");
    });
  });

  describe("create", () => {
    it("tells the school's admins a concern was raised", async () => {
      prisma.complaint.create.mockResolvedValue({ id: COMPLAINT_ID });
      await service.create(SCHOOL_A, RAISER_ID, { subject: "Bus late", body: "Twice this week" });
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { schoolId: SCHOOL_A, role: "SCHOOL_ADMIN", isActive: true },
        select: { id: true },
      });
      expect(notifications.sendPush).toHaveBeenCalledWith(
        ["admin-1", "admin-2"],
        expect.objectContaining({ data: { type: "COMPLAINT", complaintId: COMPLAINT_ID } }),
      );
    });
  });

  describe("addComment", () => {
    it("moves an open concern to in progress when the school replies", async () => {
      prisma.complaint.findFirst.mockResolvedValue({ id: COMPLAINT_ID, schoolId: SCHOOL_A, raisedByUserId: RAISER_ID, status: "OPEN" });
      prisma.complaintComment.create.mockResolvedValue({ id: "c1" });
      await service.addComment(SCHOOL_A, ADMIN_ID, "SCHOOL_ADMIN", COMPLAINT_ID, { body: "On it" });
      expect(prisma.complaint.update).toHaveBeenCalledWith({ where: { id: COMPLAINT_ID }, data: { status: "IN_PROGRESS" } });
    });

    it("does not let a family post on a resolved concern", async () => {
      prisma.complaint.findFirst.mockResolvedValue({ id: COMPLAINT_ID, schoolId: SCHOOL_A, raisedByUserId: RAISER_ID, status: "RESOLVED" });
      await expect(
        service.addComment(SCHOOL_A, RAISER_ID, "PARENT", COMPLAINT_ID, { body: "Again" }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.complaintComment.create).not.toHaveBeenCalled();
    });
  });
});
