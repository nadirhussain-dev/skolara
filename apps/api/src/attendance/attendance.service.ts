import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { MarkAttendanceInput } from "@skolara/types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async markAttendance(
    schoolId: string,
    markedByUserId: string,
    input: MarkAttendanceInput,
  ) {
    const schoolClass = await this.prisma.schoolClass.findFirst({
      where: { id: input.classId, schoolId },
    });
    if (!schoolClass) throw new NotFoundException("Class not found");

    return this.prisma.$transaction(
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
  }

  async findByClassAndDate(schoolId: string, classId: string, date: Date) {
    const schoolClass = await this.prisma.schoolClass.findFirst({
      where: { id: classId, schoolId },
    });
    if (!schoolClass) throw new ForbiddenException("Class not in your school");

    return this.prisma.attendanceRecord.findMany({
      where: { classId, date },
      include: { student: { include: { user: true } } },
    });
  }

  findForStudent(schoolId: string, studentId: string) {
    return this.prisma.attendanceRecord.findMany({
      where: { schoolId, studentId },
      orderBy: { date: "desc" },
    });
  }
}
