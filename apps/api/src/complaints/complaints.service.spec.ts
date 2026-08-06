import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { ComplaintsService } from "./complaints.service";

// Regression coverage for the cross-tenant bug fixed here: findOne/addComment/
// updateStatus used to look up complaints by ID alone, so a SCHOOL_ADMIN from
// any school could view or resolve any other school's complaints.

describe("ComplaintsService", () => {
  let service: ComplaintsService;
  let prisma: {
    complaint: { findFirst: jest.Mock; update: jest.Mock };
    complaintComment: { findMany: jest.Mock; create: jest.Mock };
  };

  const SCHOOL_A = "school-a";
  const SCHOOL_B = "school-b";
  const COMPLAINT_ID = "complaint-1";
  const RAISER_ID = "raiser-1";
  const ADMIN_ID = "admin-1";

  beforeEach(async () => {
    prisma = {
      complaint: { findFirst: jest.fn(), update: jest.fn() },
      complaintComment: { findMany: jest.fn(), create: jest.fn() },
    };

    const module = await Test.createTestingModule({
      providers: [ComplaintsService, { provide: PrismaService, useValue: prisma }],
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
});
