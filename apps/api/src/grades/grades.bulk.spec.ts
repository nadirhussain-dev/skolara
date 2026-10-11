import { NotFoundException } from "@nestjs/common";
import { bulkGradesSchema } from "@skolara/types";
import type { AiService } from "../ai/ai.service";
import type { PrismaService } from "../prisma/prisma.service";
import { GradesService } from "./grades.service";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const CLASS = "33333333-3333-4333-8333-333333333333";
const base = { classId: CLASS, subject: "Maths", term: "Term 1", examType: "Midterm", maxMarks: 50 };

describe("GradesService.upsertBulk", () => {
  let prisma: {
    studentProfile: { count: jest.Mock };
    gradeEntry: { upsert: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: GradesService;

  beforeEach(() => {
    prisma = {
      studentProfile: { count: jest.fn().mockResolvedValue(2) },
      gradeEntry: { upsert: jest.fn().mockReturnValue("op") },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    service = new GradesService(prisma as unknown as PrismaService, {} as unknown as AiService);
  });

  const input = { ...base, entries: [{ studentId: A, marksObtained: 41 }, { studentId: B, marksObtained: 0 }] };

  it("saves every row in one transaction", async () => {
    expect(await service.upsertBulk("school-1", "teacher-1", input)).toEqual({ saved: 2 });
    expect(prisma.$transaction).toHaveBeenCalledWith(["op", "op"]);
    const first = prisma.gradeEntry.upsert.mock.calls[0][0];
    expect(first.create).toMatchObject({ schoolId: "school-1", classId: CLASS, studentId: A, marksObtained: 41, maxMarks: 50, gradedByUserId: "teacher-1" });
  });

  it("saves nothing if any student is outside the class or school", async () => {
    prisma.studentProfile.count.mockResolvedValue(1);
    await expect(service.upsertBulk("school-1", "teacher-1", input)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.studentProfile.count.mock.calls[0][0].where).toEqual({ id: { in: [A, B] }, schoolId: "school-1", classId: CLASS });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe("bulkGradesSchema", () => {
  it("accepts a normal mark sheet", () => {
    expect(bulkGradesSchema.safeParse({ ...base, entries: [{ studentId: A, marksObtained: 50 }] }).success).toBe(true);
  });
  it("refuses marks above the maximum", () => {
    expect(bulkGradesSchema.safeParse({ ...base, entries: [{ studentId: A, marksObtained: 51 }] }).success).toBe(false);
  });
  it("refuses the same student twice, negative marks and an empty sheet", () => {
    expect(bulkGradesSchema.safeParse({ ...base, entries: [{ studentId: A, marksObtained: 1 }, { studentId: A, marksObtained: 2 }] }).success).toBe(false);
    expect(bulkGradesSchema.safeParse({ ...base, entries: [{ studentId: A, marksObtained: -1 }] }).success).toBe(false);
    expect(bulkGradesSchema.safeParse({ ...base, entries: [] }).success).toBe(false);
  });
});
