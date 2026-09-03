import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { StudyMaterialsService } from "./study-materials.service";
import type { PrismaService } from "../prisma/prisma.service";

const SCHOOL = "school-1";
const CLASS = "class-1";
const TEACHER = "teacher-1";
const STUDENT = "student-1";

const input = {
  classId: CLASS,
  subject: "Physics",
  title: "Chapter 4 notes",
  fileKey: "key-1",
  fileUrl: "https://files.example/key-1.pdf",
  contentType: "application/pdf",
  sizeBytes: 1024,
};

describe("StudyMaterialsService", () => {
  let prisma: {
    studyMaterial: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      delete: jest.Mock;
    };
    schoolClass: { findFirst: jest.Mock };
    studentProfile: { findFirst: jest.Mock };
  };
  let service: StudyMaterialsService;

  beforeEach(() => {
    prisma = {
      studyMaterial: {
        create: jest.fn().mockResolvedValue({ id: "material-1" }),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
      schoolClass: { findFirst: jest.fn().mockResolvedValue({ id: CLASS }) },
      studentProfile: { findFirst: jest.fn().mockResolvedValue({ classId: CLASS }) },
    };
    service = new StudyMaterialsService(prisma as unknown as PrismaService);
  });

  describe("publish", () => {
    it("stores the file's key alongside its url", async () => {
      await service.publish(SCHOOL, TEACHER, input);

      expect(prisma.studyMaterial.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            schoolId: SCHOOL,
            uploadedByUserId: TEACHER,
            fileKey: "key-1",
            fileUrl: "https://files.example/key-1.pdf",
            description: null,
          }),
        }),
      );
    });

    it("refuses a class in another school", async () => {
      prisma.schoolClass.findFirst.mockResolvedValue(null);

      await expect(service.publish(SCHOOL, TEACHER, input)).rejects.toThrow(NotFoundException);
      expect(prisma.studyMaterial.create).not.toHaveBeenCalled();
    });
  });

  describe("findForStudent", () => {
    it("reads the library of the class the student is in", async () => {
      await service.findForStudent(SCHOOL, STUDENT, "Physics");

      expect(prisma.studyMaterial.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { schoolId: SCHOOL, classId: CLASS, subject: "Physics" },
        }),
      );
    });

    it("returns nothing for a student not yet placed in a class", async () => {
      prisma.studentProfile.findFirst.mockResolvedValue({ classId: null });

      await expect(service.findForStudent(SCHOOL, STUDENT)).resolves.toEqual([]);
      expect(prisma.studyMaterial.findMany).not.toHaveBeenCalled();
    });

    it("refuses a student in another school", async () => {
      prisma.studentProfile.findFirst.mockResolvedValue(null);

      await expect(service.findForStudent(SCHOOL, STUDENT)).rejects.toThrow(NotFoundException);
    });
  });

  describe("withdraw", () => {
    it("lets the teacher who published it withdraw it", async () => {
      prisma.studyMaterial.findFirst.mockResolvedValue({
        id: "material-1",
        uploadedByUserId: TEACHER,
      });

      await service.withdraw(SCHOOL, "material-1", { id: TEACHER, role: "TEACHER" });

      expect(prisma.studyMaterial.delete).toHaveBeenCalledWith({ where: { id: "material-1" } });
    });

    it("stops one teacher deleting another's material", async () => {
      prisma.studyMaterial.findFirst.mockResolvedValue({
        id: "material-1",
        uploadedByUserId: "teacher-2",
      });

      await expect(
        service.withdraw(SCHOOL, "material-1", { id: TEACHER, role: "TEACHER" }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.studyMaterial.delete).not.toHaveBeenCalled();
    });

    it("lets a school admin withdraw anyone's material", async () => {
      prisma.studyMaterial.findFirst.mockResolvedValue({
        id: "material-1",
        uploadedByUserId: "teacher-2",
      });

      await service.withdraw(SCHOOL, "material-1", { id: "admin-1", role: "SCHOOL_ADMIN" });

      expect(prisma.studyMaterial.delete).toHaveBeenCalled();
    });
  });
});
