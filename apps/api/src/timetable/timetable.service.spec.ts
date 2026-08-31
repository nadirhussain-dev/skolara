import { ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { UpsertTimetableEntryInput } from "@skolara/types";
import { TimetableService } from "./timetable.service";
import type { PrismaService } from "../prisma/prisma.service";

const SCHOOL = "school-1";

const input: UpsertTimetableEntryInput = {
  classId: "class-a",
  periodId: "period-1",
  dayOfWeek: "MONDAY",
  subject: "Mathematics",
  teacherUserId: "teacher-1",
};

function existing(overrides: Record<string, unknown> = {}) {
  return {
    id: "entry-existing",
    classId: "class-b",
    subject: "Physics",
    teacherUserId: "teacher-1",
    room: "Lab 2",
    teacherUser: { id: "teacher-1", firstName: "Asma", lastName: "Riaz" },
    class: { id: "class-b", name: "Grade 9", section: "B" },
    ...overrides,
  };
}

describe("TimetableService", () => {
  let prisma: {
    schoolClass: { findFirst: jest.Mock };
    period: { findFirst: jest.Mock; delete: jest.Mock };
    user: { findFirst: jest.Mock };
    studentProfile: { findFirst: jest.Mock };
    timetableEntry: { findFirst: jest.Mock; findMany: jest.Mock; upsert: jest.Mock };
  };
  let service: TimetableService;

  beforeEach(() => {
    prisma = {
      schoolClass: { findFirst: jest.fn().mockResolvedValue({ id: "class-a" }) },
      period: { findFirst: jest.fn().mockResolvedValue({ id: "period-1" }), delete: jest.fn() },
      user: { findFirst: jest.fn().mockResolvedValue({ id: "teacher-1" }) },
      studentProfile: { findFirst: jest.fn() },
      timetableEntry: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({ id: "entry-new" }),
      },
    };
    service = new TimetableService(prisma as unknown as PrismaService);
  });

  describe("upsertEntry", () => {
    it("places the lesson when nothing else occupies the slot", async () => {
      const result = await service.upsertEntry(SCHOOL, input);
      expect(result).toEqual({ id: "entry-new" });
      expect(prisma.timetableEntry.upsert).toHaveBeenCalled();
    });

    it("rejects a teacher already teaching elsewhere in the slot", async () => {
      prisma.timetableEntry.findFirst.mockResolvedValueOnce(existing());

      await expect(service.upsertEntry(SCHOOL, input)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.timetableEntry.upsert).not.toHaveBeenCalled();
    });

    it("names the clashing teacher and class so the UI can point at the cell", async () => {
      prisma.timetableEntry.findFirst.mockResolvedValueOnce(existing());

      const error = await service.upsertEntry(SCHOOL, input).catch((e) => e);
      const body = error.getResponse();
      expect(body.conflicts[0].kind).toBe("TEACHER");
      expect(body.message).toContain("Asma Riaz");
      expect(body.message).toContain("Grade 9 B");
      expect(body.conflicts[0].conflictsWith.id).toBe("entry-existing");
    });

    it("rejects a room already in use in the slot", async () => {
      // No teacher clash, but the room is taken.
      prisma.timetableEntry.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existing({ teacherUserId: "teacher-9", room: "Lab 2" }));

      const error = await service
        .upsertEntry(SCHOOL, { ...input, room: "Lab 2" })
        .catch((e) => e);
      expect(error).toBeInstanceOf(ConflictException);
      expect(error.getResponse().conflicts[0].kind).toBe("ROOM");
    });

    it("doesn't check for a room clash when no room is given", async () => {
      await service.upsertEntry(SCHOOL, input);
      // Only the teacher lookup — a roomless lesson can't clash on room.
      expect(prisma.timetableEntry.findFirst).toHaveBeenCalledTimes(1);
    });

    it("excludes the class's own lesson, so re-assigning its own slot isn't a clash", async () => {
      await service.upsertEntry(SCHOOL, input);
      expect(prisma.timetableEntry.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ NOT: { classId: "class-a" } }),
        }),
      );
    });

    it("turns a lost race into a conflict naming what took the slot", async () => {
      // Pre-check clean, then the database rejects on the unique constraint.
      prisma.timetableEntry.upsert.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("unique", {
          code: "P2002",
          clientVersion: "5.22.0",
        }),
      );
      prisma.timetableEntry.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existing());

      const error = await service.upsertEntry(SCHOOL, input).catch((e) => e);
      expect(error).toBeInstanceOf(ConflictException);
      expect(error.getResponse().conflicts[0].kind).toBe("TEACHER");
    });

    it("rethrows database errors that aren't conflicts", async () => {
      prisma.timetableEntry.upsert.mockRejectedValue(new Error("connection lost"));
      await expect(service.upsertEntry(SCHOOL, input)).rejects.toThrow("connection lost");
    });

    it.each([
      ["class", "schoolClass", "Class not found"],
      ["period", "period", "Period not found"],
      ["teacher", "user", "Teacher not found"],
    ])(
      "reports a %s from another school as not found rather than forbidden",
      async (_label, model, message) => {
        (prisma as Record<string, { findFirst: jest.Mock }>)[model].findFirst.mockResolvedValue(null);
        await expect(service.upsertEntry(SCHOOL, input)).rejects.toThrow(message);
      },
    );
  });

  describe("forStudent", () => {
    it("returns the timetable of the student's class", async () => {
      prisma.studentProfile.findFirst.mockResolvedValue({ classId: "class-a" });
      await service.forStudent(SCHOOL, "student-1");
      expect(prisma.timetableEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { schoolId: SCHOOL, classId: "class-a" } }),
      );
    });

    it("returns nothing for a student not yet placed in a class", async () => {
      prisma.studentProfile.findFirst.mockResolvedValue({ classId: null });
      await expect(service.forStudent(SCHOOL, "student-1")).resolves.toEqual([]);
      expect(prisma.timetableEntry.findMany).not.toHaveBeenCalled();
    });

    it("rejects a student in another school", async () => {
      prisma.studentProfile.findFirst.mockResolvedValue(null);
      await expect(service.forStudent(SCHOOL, "student-1")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
