import { ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { LIVE_CLASS_JOIN_LEAD_MINUTES } from "@skolara/types";
import { LiveClassesService } from "./live-classes.service";
import type { PrismaService } from "../prisma/prisma.service";

const SCHOOL = "school-1";
const CLASS = "class-1";
const TEACHER = "teacher-1";
const STUDENT = "student-1";
const SESSION = "session-1";

const HOST = { id: TEACHER, firstName: "Sara", lastName: "Iqbal" };

const minutes = (n: number) => new Date(Date.now() + n * 60_000);

function session(startsInMinutes: number, endsInMinutes: number) {
  return {
    id: SESSION,
    schoolId: SCHOOL,
    classId: CLASS,
    subject: "Physics",
    title: "Revision session",
    meetingUrl: "https://meet.example/abc-defg-hij",
    startsAt: minutes(startsInMinutes),
    endsAt: minutes(endsInMinutes),
    hostUserId: TEACHER,
    hostUser: HOST,
    class: { id: CLASS, name: "9", section: "A" },
  };
}

describe("LiveClassesService", () => {
  let prisma: {
    liveClass: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    schoolClass: { findFirst: jest.Mock };
    studentProfile: { findFirst: jest.Mock };
  };
  let service: LiveClassesService;

  const input = {
    classId: CLASS,
    subject: "Physics",
    title: "Revision session",
    meetingUrl: "https://meet.example/abc-defg-hij",
    startsAt: minutes(30),
    endsAt: minutes(90),
  };

  beforeEach(() => {
    prisma = {
      liveClass: {
        create: jest.fn().mockResolvedValue(session(30, 90)),
        findFirst: jest.fn().mockResolvedValue({ id: SESSION, classId: CLASS }),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue(session(30, 90)),
        delete: jest.fn(),
      },
      schoolClass: { findFirst: jest.fn().mockResolvedValue({ id: CLASS }) },
      studentProfile: { findFirst: jest.fn().mockResolvedValue({ classId: CLASS }) },
    };
    service = new LiveClassesService(prisma as unknown as PrismaService);
  });

  describe("create", () => {
    it("attributes the session to the teacher scheduling it", async () => {
      await service.create(SCHOOL, TEACHER, input);

      expect(prisma.liveClass.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ hostUserId: TEACHER, schoolId: SCHOOL }),
        }),
      );
    });

    it("refuses a class in another school", async () => {
      prisma.schoolClass.findFirst.mockResolvedValue(null);

      await expect(service.create(SCHOOL, TEACHER, input)).rejects.toThrow(NotFoundException);
      expect(prisma.liveClass.create).not.toHaveBeenCalled();
    });

    it("reports a duplicate start time as a conflict rather than a database error", async () => {
      prisma.liveClass.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("unique", {
          code: "P2002",
          clientVersion: "test",
        }),
      );

      await expect(service.create(SCHOOL, TEACHER, input)).rejects.toThrow(ConflictException);
    });
  });

  describe("findForClass", () => {
    it("hides finished sessions by default", async () => {
      await service.findForClass(SCHOOL, CLASS);

      const { where } = prisma.liveClass.findMany.mock.calls[0][0];
      expect(where.endsAt.gte).toBeInstanceOf(Date);
    });

    it("includes them when asked", async () => {
      await service.findForClass(SCHOOL, CLASS, true);

      expect(prisma.liveClass.findMany.mock.calls[0][0].where).toEqual({
        schoolId: SCHOOL,
        classId: CLASS,
      });
    });
  });

  describe("findForStudent", () => {
    it("withholds the link before the join window opens", async () => {
      prisma.liveClass.findMany.mockResolvedValue([
        session(LIVE_CLASS_JOIN_LEAD_MINUTES + 5, 60),
      ]);

      const [upcoming] = await service.findForStudent(SCHOOL, STUDENT);

      expect(upcoming.joinable).toBe(false);
      expect(upcoming.meetingUrl).toBeNull();
      // Still told when it opens, so the app can count down to it.
      expect(upcoming.joinableFrom).toBeInstanceOf(Date);
    });

    it("releases the link once the join window is open", async () => {
      prisma.liveClass.findMany.mockResolvedValue([
        session(LIVE_CLASS_JOIN_LEAD_MINUTES - 5, 60),
      ]);

      const [upcoming] = await service.findForStudent(SCHOOL, STUDENT);

      expect(upcoming.joinable).toBe(true);
      expect(upcoming.meetingUrl).toBe("https://meet.example/abc-defg-hij");
    });

    it("releases the link mid-lesson", async () => {
      prisma.liveClass.findMany.mockResolvedValue([session(-10, 40)]);

      const [current] = await service.findForStudent(SCHOOL, STUDENT);

      expect(current.joinable).toBe(true);
      expect(current.meetingUrl).not.toBeNull();
    });

    it("only lists sessions for the student's own class", async () => {
      await service.findForStudent(SCHOOL, STUDENT);

      expect(prisma.liveClass.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ schoolId: SCHOOL, classId: CLASS }),
        }),
      );
    });

    it("returns nothing for a student not yet placed in a class", async () => {
      prisma.studentProfile.findFirst.mockResolvedValue({ classId: null });

      await expect(service.findForStudent(SCHOOL, STUDENT)).resolves.toEqual([]);
      expect(prisma.liveClass.findMany).not.toHaveBeenCalled();
    });

    it("refuses a student in another school", async () => {
      prisma.studentProfile.findFirst.mockResolvedValue(null);

      await expect(service.findForStudent(SCHOOL, STUDENT)).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("refuses a session in another school", async () => {
      prisma.liveClass.findFirst.mockResolvedValue(null);

      await expect(service.remove(SCHOOL, SESSION)).rejects.toThrow(NotFoundException);
      expect(prisma.liveClass.delete).not.toHaveBeenCalled();
    });
  });
});
