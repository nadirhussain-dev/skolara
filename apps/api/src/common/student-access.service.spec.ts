import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { PrismaService } from "../prisma/prisma.service";
import { StudentAccessService } from "./student-access.service";

// Regression coverage for the cross-tenant bug fixed in this file: previously
// SCHOOL_ADMIN/TEACHER were granted access unconditionally, with no check
// that the student belonged to their own school. See student-access.service.ts.

describe("StudentAccessService", () => {
  let service: StudentAccessService;
  let prisma: {
    studentProfile: { findUnique: jest.Mock };
    parentStudentLink: { findUnique: jest.Mock };
  };

  const STUDENT_ID = "student-1";
  const OWN_SCHOOL = "school-a";
  const OTHER_SCHOOL = "school-b";

  function user(overrides: Partial<AuthenticatedUser>): AuthenticatedUser {
    return { id: "user-1", role: "SCHOOL_ADMIN", schoolId: OWN_SCHOOL, ...overrides };
  }

  beforeEach(async () => {
    prisma = {
      studentProfile: { findUnique: jest.fn() },
      parentStudentLink: { findUnique: jest.fn() },
    };

    const module = await Test.createTestingModule({
      providers: [StudentAccessService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(StudentAccessService);
  });

  it("throws NotFoundException when the student doesn't exist", async () => {
    prisma.studentProfile.findUnique.mockResolvedValue(null);

    await expect(
      service.assertCanAccessStudent(user({ role: "SCHOOL_ADMIN" }), STUDENT_ID),
    ).rejects.toThrow(NotFoundException);
  });

  describe("SCHOOL_ADMIN / TEACHER", () => {
    it.each(["SCHOOL_ADMIN", "TEACHER"] as const)(
      "%s in the same school as the student is allowed",
      async (role) => {
        prisma.studentProfile.findUnique.mockResolvedValue({
          schoolId: OWN_SCHOOL,
          userId: "some-other-user",
        });

        await expect(
          service.assertCanAccessStudent(user({ role, schoolId: OWN_SCHOOL }), STUDENT_ID),
        ).resolves.toBeUndefined();
      },
    );

    it.each(["SCHOOL_ADMIN", "TEACHER"] as const)(
      "%s in a DIFFERENT school than the student is rejected",
      async (role) => {
        prisma.studentProfile.findUnique.mockResolvedValue({
          schoolId: OTHER_SCHOOL,
          userId: "some-other-user",
        });

        await expect(
          service.assertCanAccessStudent(user({ role, schoolId: OWN_SCHOOL }), STUDENT_ID),
        ).rejects.toThrow(ForbiddenException);
      },
    );
  });

  describe("STUDENT", () => {
    it("is allowed to access their own record", async () => {
      prisma.studentProfile.findUnique.mockResolvedValue({
        schoolId: OWN_SCHOOL,
        userId: "user-1",
      });

      await expect(
        service.assertCanAccessStudent(
          user({ role: "STUDENT", id: "user-1" }),
          STUDENT_ID,
        ),
      ).resolves.toBeUndefined();
    });

    it("is rejected from accessing someone else's record", async () => {
      prisma.studentProfile.findUnique.mockResolvedValue({
        schoolId: OWN_SCHOOL,
        userId: "a-different-user",
      });

      await expect(
        service.assertCanAccessStudent(
          user({ role: "STUDENT", id: "user-1" }),
          STUDENT_ID,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("PARENT", () => {
    it("is allowed when a ParentStudentLink exists", async () => {
      prisma.studentProfile.findUnique.mockResolvedValue({
        schoolId: OWN_SCHOOL,
        userId: "child-user",
      });
      prisma.parentStudentLink.findUnique.mockResolvedValue({
        parentUserId: "user-1",
        studentId: STUDENT_ID,
      });

      await expect(
        service.assertCanAccessStudent(user({ role: "PARENT", id: "user-1" }), STUDENT_ID),
      ).resolves.toBeUndefined();
    });

    it("is rejected when no link exists", async () => {
      prisma.studentProfile.findUnique.mockResolvedValue({
        schoolId: OWN_SCHOOL,
        userId: "child-user",
      });
      prisma.parentStudentLink.findUnique.mockResolvedValue(null);

      await expect(
        service.assertCanAccessStudent(user({ role: "PARENT", id: "user-1" }), STUDENT_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  it("rejects roles with no defined access path (e.g. SUPER_ADMIN)", async () => {
    prisma.studentProfile.findUnique.mockResolvedValue({
      schoolId: OWN_SCHOOL,
      userId: "child-user",
    });

    await expect(
      service.assertCanAccessStudent(user({ role: "SUPER_ADMIN", schoolId: null }), STUDENT_ID),
    ).rejects.toThrow(ForbiddenException);
  });
});
