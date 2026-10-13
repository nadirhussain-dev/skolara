import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { ClassAccessService } from "./class-access.service";
import type { PrismaService } from "../prisma/prisma.service";

// Regression coverage for teachers being scoped to their school but not to
// their classes: any teacher could take the register or enter grades for any
// class, silently overwriting a colleague's work.

describe("ClassAccessService.assertCanTeachClass", () => {
  let prisma: {
    schoolClass: { findFirst: jest.Mock };
    classTeacher: { findUnique: jest.Mock; findMany: jest.Mock };
  };
  let service: ClassAccessService;

  const teacher = { id: "teacher-1", role: "TEACHER" as const, schoolId: "school-1" };
  const admin = { id: "admin-1", role: "SCHOOL_ADMIN" as const, schoolId: "school-1" };

  beforeEach(() => {
    prisma = {
      schoolClass: { findFirst: jest.fn().mockResolvedValue({ id: "class-1" }) },
      classTeacher: { findUnique: jest.fn(), findMany: jest.fn() },
    };
    service = new ClassAccessService(prisma as unknown as PrismaService);
  });

  it("allows a teacher assigned to the class", async () => {
    prisma.classTeacher.findUnique.mockResolvedValue({ classId: "class-1" });
    await expect(service.assertCanTeachClass(teacher, "class-1")).resolves.toBeUndefined();
  });

  it("rejects a teacher who isn't assigned to the class", async () => {
    prisma.classTeacher.findUnique.mockResolvedValue(null);
    await expect(service.assertCanTeachClass(teacher, "class-1")).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("lets a school admin act on any class in their own school", async () => {
    await expect(service.assertCanTeachClass(admin, "class-1")).resolves.toBeUndefined();
    expect(prisma.classTeacher.findUnique).not.toHaveBeenCalled();
  });

  it("reports another school's class as not found rather than forbidden", async () => {
    // Confirming it exists would leak the other tenant's data.
    prisma.schoolClass.findFirst.mockResolvedValue(null);
    await expect(service.assertCanTeachClass(admin, "class-x")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("scopes the class lookup to the caller's school", async () => {
    await service.assertCanTeachClass(admin, "class-1");
    expect(prisma.schoolClass.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "class-1", schoolId: "school-1" } }),
    );
  });

  it("lists the classes a teacher is assigned to", async () => {
    prisma.classTeacher.findMany.mockResolvedValue([
      { classId: "class-1" },
      { classId: "class-2" },
    ]);
    await expect(service.classIdsForTeacher("teacher-1")).resolves.toEqual([
      "class-1",
      "class-2",
    ]);
  });
});

describe("ClassAccessService.assertCanReadClass", () => {
  const prisma = {
    schoolClass: { findFirst: jest.fn() },
    studentProfile: { findFirst: jest.fn() },
  };
  const service = new ClassAccessService(prisma as unknown as PrismaService);
  const parent = { id: "parent-1", role: "PARENT" as const, schoolId: "school-1" };
  const student = { id: "student-user-1", role: "STUDENT" as const, schoolId: "school-1" };

  beforeEach(() => {
    prisma.schoolClass.findFirst.mockReset().mockResolvedValue({ id: "class-1" });
    prisma.studentProfile.findFirst.mockReset();
  });

  it("lets a parent read a class one of their children is in", async () => {
    prisma.studentProfile.findFirst.mockResolvedValue({ id: "child-1" });
    await expect(service.assertCanReadClass(parent, "class-1")).resolves.toBeUndefined();
    expect(prisma.studentProfile.findFirst).toHaveBeenCalledWith({
      where: { classId: "class-1", parentLinks: { some: { parentUserId: "parent-1" } } },
      select: { id: true },
    });
  });

  it("refuses a parent with no child in the class", async () => {
    prisma.studentProfile.findFirst.mockResolvedValue(null);
    await expect(service.assertCanReadClass(parent, "class-1")).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("scopes a student to their own class", async () => {
    prisma.studentProfile.findFirst.mockResolvedValue(null);
    await expect(service.assertCanReadClass(student, "class-2")).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.studentProfile.findFirst).toHaveBeenCalledWith({
      where: { classId: "class-2", userId: "student-user-1" },
      select: { id: true },
    });
  });

  it("hides a class from another school", async () => {
    prisma.schoolClass.findFirst.mockResolvedValue(null);
    await expect(service.assertCanReadClass(parent, "class-x")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
