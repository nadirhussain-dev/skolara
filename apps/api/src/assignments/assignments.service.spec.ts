import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { AssignmentsService } from "./assignments.service";

// Regression coverage for the cross-tenant bug fixed here: submit/grade/
// findSubmissions used to look up assignments/submissions by ID alone, with
// no check that they belonged to the caller's school.

describe("AssignmentsService", () => {
  let service: AssignmentsService;
  let prisma: {
    assignment: { findFirst: jest.Mock };
    assignmentSubmission: {
      findFirst: jest.Mock;
      upsert: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };

  const SCHOOL_A = "school-a";
  const SCHOOL_B = "school-b";
  const ASSIGNMENT_ID = "assignment-1";
  const SUBMISSION_ID = "submission-1";

  beforeEach(async () => {
    prisma = {
      assignment: { findFirst: jest.fn() },
      assignmentSubmission: {
        findFirst: jest.fn(),
        upsert: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [AssignmentsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(AssignmentsService);
  });

  describe("submit", () => {
    it("scopes the assignment lookup to the caller's school", async () => {
      prisma.assignment.findFirst.mockResolvedValue({ id: ASSIGNMENT_ID, schoolId: SCHOOL_A });
      prisma.assignmentSubmission.upsert.mockResolvedValue({});

      await service.submit(SCHOOL_A, "student-1", ASSIGNMENT_ID, {
        fileUrl: "https://example.com/f.pdf",
      });

      expect(prisma.assignment.findFirst).toHaveBeenCalledWith({
        where: { id: ASSIGNMENT_ID, schoolId: SCHOOL_A },
      });
    });

    it("rejects submitting against another school's assignment", async () => {
      // The other school's assignment exists, but a school-scoped query for
      // SCHOOL_B against it returns nothing.
      prisma.assignment.findFirst.mockResolvedValue(null);

      await expect(
        service.submit(SCHOOL_B, "student-1", ASSIGNMENT_ID, {
          fileUrl: "https://example.com/f.pdf",
        }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.assignmentSubmission.upsert).not.toHaveBeenCalled();
    });
  });

  describe("findSubmissions", () => {
    it("rejects a school-admin/teacher reading another school's submissions", async () => {
      prisma.assignment.findFirst.mockResolvedValue(null);

      await expect(service.findSubmissions(SCHOOL_B, ASSIGNMENT_ID)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.assignmentSubmission.findMany).not.toHaveBeenCalled();
    });

    it("returns submissions for an assignment in the caller's own school", async () => {
      prisma.assignment.findFirst.mockResolvedValue({ id: ASSIGNMENT_ID, schoolId: SCHOOL_A });
      prisma.assignmentSubmission.findMany.mockResolvedValue([{ id: "s1" }]);

      const result = await service.findSubmissions(SCHOOL_A, ASSIGNMENT_ID);
      expect(result).toEqual([{ id: "s1" }]);
    });
  });

  describe("grade", () => {
    it("scopes the submission lookup through the assignment's school", async () => {
      prisma.assignmentSubmission.findFirst.mockResolvedValue({ id: SUBMISSION_ID });
      prisma.assignmentSubmission.update.mockResolvedValue({});

      await service.grade(SCHOOL_A, SUBMISSION_ID, { grade: "A" });

      expect(prisma.assignmentSubmission.findFirst).toHaveBeenCalledWith({
        where: { id: SUBMISSION_ID, assignment: { schoolId: SCHOOL_A } },
      });
    });

    it("rejects grading a submission belonging to another school", async () => {
      prisma.assignmentSubmission.findFirst.mockResolvedValue(null);

      await expect(service.grade(SCHOOL_B, SUBMISSION_ID, { grade: "A" })).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
