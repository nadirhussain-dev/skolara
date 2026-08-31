import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { MarkAttendanceInput } from "@skolara/types";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async markAttendance(
    schoolId: string,
    markedByUserId: string,
    input: MarkAttendanceInput,
  ) {
    const schoolClass = await this.prisma.schoolClass.findFirst({
      where: { id: input.classId, schoolId },
    });
    if (!schoolClass) throw new NotFoundException("Class not found");

    const records = await this.prisma.$transaction(
      input.entries.map((entry) =>
        this.prisma.attendanceRecord.upsert({
          where: {
            classId_studentId_date: {
              classId: input.classId,
              studentId: entry.studentId,
              date: input.date,
            },
          },
          create: {
            schoolId,
            classId: input.classId,
            studentId: entry.studentId,
            date: input.date,
            status: entry.status,
            markedByUserId,
            markedOffline: input.markedOffline,
          },
          update: {
            status: entry.status,
            markedByUserId,
            markedOffline: input.markedOffline,
          },
        }),
      ),
    );

    await this.alertAbsentees(input);
    return records;
  }

  /**
   * Real-time absence alerts to parents — one of the things parents actually
   * open the app for. Fired after the write commits so a notification failure
   * can never roll back the register.
   */
  private async alertAbsentees(input: MarkAttendanceInput) {
    const absentStudentIds = input.entries
      .filter((entry) => entry.status === "ABSENT")
      .map((entry) => entry.studentId);
    if (absentStudentIds.length === 0) return;

    const students = await this.prisma.studentProfile.findMany({
      where: { id: { in: absentStudentIds } },
      include: {
        user: { select: { firstName: true } },
        parentLinks: { select: { parentUserId: true } },
      },
    });

    const formattedDate = input.date.toLocaleDateString("en-GB");
    await Promise.all(
      students.map((student) =>
        this.notifications.sendPush(
          student.parentLinks.map((link) => link.parentUserId),
          {
            title: "Absence recorded",
            body: `${student.user.firstName} was marked absent on ${formattedDate}.`,
            data: { type: "ATTENDANCE", studentId: student.id },
          },
        ),
      ),
    );
  }

  async findByClassAndDate(schoolId: string, classId: string, date: Date) {
    const schoolClass = await this.prisma.schoolClass.findFirst({
      where: { id: classId, schoolId },
    });
    if (!schoolClass) throw new ForbiddenException("Class not in your school");

    return this.prisma.attendanceRecord.findMany({
      where: { classId, date },
      include: {
        student: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });
  }

  findForStudent(schoolId: string, studentId: string) {
    return this.prisma.attendanceRecord.findMany({
      where: { schoolId, studentId },
      orderBy: { date: "desc" },
    });
  }

  /**
   * School-wide register status for one day: which classes have been marked,
   * which haven't, and the rate for those that have. This is the view a
   * principal actually wants — "who hasn't taken the register yet" — rather
   * than having to open each class in turn.
   */
  async schoolDaySummary(schoolId: string, date: Date) {
    const [classes, records] = await Promise.all([
      this.prisma.schoolClass.findMany({
        where: { schoolId },
        select: { id: true, name: true, section: true },
        orderBy: [{ name: "asc" }, { section: "asc" }],
      }),
      this.prisma.attendanceRecord.findMany({
        where: { schoolId, date },
        select: { classId: true, status: true },
      }),
    ]);

    const byClass = new Map<string, { present: number; total: number }>();
    for (const record of records) {
      const bucket = byClass.get(record.classId) ?? { present: 0, total: 0 };
      bucket.total += 1;
      if (record.status === "PRESENT") bucket.present += 1;
      byClass.set(record.classId, bucket);
    }

    const perClass = classes.map((schoolClass) => {
      const bucket = byClass.get(schoolClass.id);
      return {
        classId: schoolClass.id,
        name: schoolClass.name,
        section: schoolClass.section,
        marked: Boolean(bucket),
        presentCount: bucket?.present ?? 0,
        totalCount: bucket?.total ?? 0,
        attendanceRate: bucket && bucket.total > 0 ? (bucket.present / bucket.total) * 100 : null,
      };
    });

    const totalCount = records.length;
    const presentCount = records.filter((record) => record.status === "PRESENT").length;

    return {
      date,
      classes: perClass,
      unmarkedClassCount: perClass.filter((entry) => !entry.marked).length,
      presentCount,
      totalCount,
      attendanceRate: totalCount > 0 ? (presentCount / totalCount) * 100 : null,
    };
  }
}
