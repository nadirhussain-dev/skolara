import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { AttendanceService } from "./attendance.service";
import type { NotificationsService } from "../notifications/notifications.service";
import type { PrismaService } from "../prisma/prisma.service";

const SCHOOL = "school-1";
const CLASS = "class-1";
const TEACHER = "teacher-1";
const DATE = new Date("2026-09-04T00:00:00.000Z");

describe("AttendanceService", () => {
  let prisma: {
    schoolClass: { findFirst: jest.Mock; findMany: jest.Mock };
    studentProfile: { findMany: jest.Mock };
    attendanceRecord: { upsert: jest.Mock; findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let notifications: { sendPush: jest.Mock; sendWhatsApp: jest.Mock };
  let service: AttendanceService;

  const roster = (...ids: string[]) => ids.map((id) => ({ id }));

  /** Who is enrolled in the class, as the roster check reads them. */
  let enrolled: { id: string }[];
  /** Absent students with their parents, as the alert reads them. */
  let absentees: {
    id: string;
    user: { firstName: string };
    parentLinks: { parentUserId: string }[];
  }[];

  beforeEach(() => {
    enrolled = roster("s1", "s2");
    absentees = [];
    prisma = {
      schoolClass: {
        findFirst: jest.fn().mockResolvedValue({ id: CLASS }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      studentProfile: {
        // Two different reads share this mock: the roster check selects ids,
        // the absence alert joins the parents on. Branch on the shape so a
        // test can set one without disturbing the other.
        findMany: jest.fn().mockImplementation((args: { include?: unknown }) =>
          Promise.resolve(args.include ? absentees : enrolled),
        ),
      },
      attendanceRecord: {
        upsert: jest.fn().mockResolvedValue({ id: "record-1" }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn().mockImplementation(async (arg) =>
        typeof arg === "function" ? arg(prisma) : Promise.all(arg),
      ),
    };
    notifications = { sendPush: jest.fn(), sendWhatsApp: jest.fn() };
    service = new AttendanceService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
    );
  });

  const register = (entries: { studentId: string; status: string }[]) =>
    ({ classId: CLASS, date: DATE, markedOffline: false, entries }) as never;

  describe("markAttendance", () => {
    it("files the whole register in one transaction, keyed so a resend overwrites", async () => {
      await service.markAttendance(
        SCHOOL,
        TEACHER,
        register([
          { studentId: "s1", status: "PRESENT" },
          { studentId: "s2", status: "ABSENT" },
        ]),
      );

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.attendanceRecord.upsert).toHaveBeenCalledTimes(2);
      expect(prisma.attendanceRecord.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { classId_studentId_date: { classId: CLASS, studentId: "s1", date: DATE } },
        }),
      );
    });

    it("refuses a class from another school", async () => {
      prisma.schoolClass.findFirst.mockResolvedValue(null);

      await expect(
        service.markAttendance(SCHOOL, TEACHER, register([{ studentId: "s1", status: "PRESENT" }])),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.attendanceRecord.upsert).not.toHaveBeenCalled();
    });

    it("refuses a mark against a student who isn't on this register", async () => {
      enrolled = roster("s1");

      await expect(
        service.markAttendance(
          SCHOOL,
          TEACHER,
          register([
            { studentId: "s1", status: "PRESENT" },
            { studentId: "someone-elses-pupil", status: "ABSENT" },
          ]),
        ),
      ).rejects.toThrow(BadRequestException);
      // Rejected as a whole: a register half-filed is worse than one refused.
      expect(prisma.attendanceRecord.upsert).not.toHaveBeenCalled();
    });

    it("checks the roster against this class, not merely the school", async () => {
      await service.markAttendance(SCHOOL, TEACHER, register([{ studentId: "s1", status: "PRESENT" }]));

      expect(prisma.studentProfile.findMany).toHaveBeenCalledWith({
        where: { id: { in: ["s1"] }, schoolId: SCHOOL, classId: CLASS },
        select: { id: true },
      });
    });

    it("counts a repeated id once when checking the roster", async () => {
      enrolled = roster("s1");

      await service.markAttendance(
        SCHOOL,
        TEACHER,
        register([
          { studentId: "s1", status: "ABSENT" },
          { studentId: "s1", status: "PRESENT" },
        ]),
      );

      expect(prisma.studentProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: { in: ["s1"] } }) }),
      );
    });

    it("takes an empty register without querying the roster", async () => {
      await service.markAttendance(SCHOOL, TEACHER, register([]));

      expect(prisma.studentProfile.findMany).not.toHaveBeenCalled();
    });
  });

  describe("absence alerts", () => {
    beforeEach(() => {
      absentees = [
        {
          id: "s2",
          user: { firstName: "Bilal" },
          parentLinks: [{ parentUserId: "p1" }, { parentUserId: "p2" }],
        },
      ];
    });

    it("alerts both parents of an absent child and nobody else", async () => {
      await service.markAttendance(
        SCHOOL,
        TEACHER,
        register([
          { studentId: "s1", status: "PRESENT" },
          { studentId: "s2", status: "ABSENT" },
        ]),
      );

      expect(notifications.sendPush).toHaveBeenCalledTimes(1);
      expect(notifications.sendPush).toHaveBeenCalledWith(
        ["p1", "p2"],
        expect.objectContaining({
          body: expect.stringContaining("Bilal"),
          data: { type: "ATTENDANCE", studentId: "s2" },
        }),
      );
    });

    it("sends nothing when everyone is in", async () => {
      await service.markAttendance(
        SCHOOL,
        TEACHER,
        register([
          { studentId: "s1", status: "PRESENT" },
          { studentId: "s2", status: "LATE" },
        ]),
      );

      expect(notifications.sendPush).not.toHaveBeenCalled();
    });

    it("files the register even when the alert throws", async () => {
      notifications.sendPush.mockRejectedValue(new Error("push down"));

      await expect(
        service.markAttendance(SCHOOL, TEACHER, register([{ studentId: "s2", status: "ABSENT" }])),
      ).rejects.toThrow();
      // The upserts ran and committed before the alert was attempted — the
      // register is on record regardless of what the notifier does.
      expect(prisma.attendanceRecord.upsert).toHaveBeenCalled();
    });
  });

  describe("findByClassAndDate", () => {
    it("refuses a class outside the caller's school", async () => {
      prisma.schoolClass.findFirst.mockResolvedValue(null);

      await expect(service.findByClassAndDate(SCHOOL, CLASS, DATE)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("findForStudent", () => {
    it("scopes to the school and shows the most recent day first", async () => {
      await service.findForStudent(SCHOOL, "s1");

      expect(prisma.attendanceRecord.findMany).toHaveBeenCalledWith({
        where: { schoolId: SCHOOL, studentId: "s1" },
        orderBy: { date: "desc" },
      });
    });
  });

  describe("schoolDaySummary", () => {
    const classes = [
      { id: "c1", name: "5", section: "A" },
      { id: "c2", name: "5", section: "B" },
      { id: "c3", name: "6", section: "A" },
    ];

    it("names the classes that haven't taken a register yet", async () => {
      prisma.schoolClass.findMany.mockResolvedValue(classes);
      prisma.attendanceRecord.findMany.mockResolvedValue([
        { classId: "c1", status: "PRESENT" },
        { classId: "c1", status: "ABSENT" },
      ]);

      const summary = await service.schoolDaySummary(SCHOOL, DATE);

      expect(summary.unmarkedClassCount).toBe(2);
      expect(summary.classes.find((entry) => entry.classId === "c1")).toEqual(
        expect.objectContaining({ marked: true, presentCount: 1, totalCount: 2, attendanceRate: 50 }),
      );
      expect(summary.classes.find((entry) => entry.classId === "c2")).toEqual(
        expect.objectContaining({ marked: false, attendanceRate: null }),
      );
    });

    it("reports no rate at all rather than a misleading zero on a day nobody marked", async () => {
      prisma.schoolClass.findMany.mockResolvedValue(classes);
      prisma.attendanceRecord.findMany.mockResolvedValue([]);

      const summary = await service.schoolDaySummary(SCHOOL, DATE);

      expect(summary.attendanceRate).toBeNull();
      expect(summary.unmarkedClassCount).toBe(3);
    });

    it("counts LATE and EXCUSED against the rate but not as present", async () => {
      prisma.schoolClass.findMany.mockResolvedValue([classes[0]]);
      prisma.attendanceRecord.findMany.mockResolvedValue([
        { classId: "c1", status: "PRESENT" },
        { classId: "c1", status: "LATE" },
        { classId: "c1", status: "EXCUSED" },
        { classId: "c1", status: "ABSENT" },
      ]);

      const summary = await service.schoolDaySummary(SCHOOL, DATE);

      expect(summary.presentCount).toBe(1);
      expect(summary.totalCount).toBe(4);
      expect(summary.attendanceRate).toBe(25);
    });
  });
});
