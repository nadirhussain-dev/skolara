import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  CreatePeriodInput,
  DayOfWeek,
  TimetableConflict,
  UpsertTimetableEntryInput,
} from "@skolara/types";
import { PrismaService } from "../prisma/prisma.service";

const ENTRY_INCLUDE = {
  period: true,
  teacherUser: { select: { id: true, firstName: true, lastName: true } },
  class: { select: { id: true, name: true, section: true } },
} as const;

@Injectable()
export class TimetableService {
  constructor(private prisma: PrismaService) {}

  // ---------- periods ----------

  listPeriods(schoolId: string) {
    return this.prisma.period.findMany({
      where: { schoolId },
      orderBy: { sortOrder: "asc" },
    });
  }

  createPeriod(schoolId: string, input: CreatePeriodInput) {
    return this.prisma.period.create({
      data: { schoolId, ...input },
    });
  }

  async deletePeriod(schoolId: string, id: string) {
    const period = await this.prisma.period.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });
    if (!period) throw new NotFoundException("Period not found");
    // Entries cascade — deleting a period removes the lessons in it, which is
    // what an admin restructuring the school day expects.
    await this.prisma.period.delete({ where: { id } });
  }

  // ---------- entries ----------

  /**
   * Places a lesson in a slot, replacing whatever that class had there.
   *
   * Conflicts are checked twice on purpose: once up front so the caller gets a
   * message naming the clashing lesson, and once by the database's unique
   * constraints, which is what actually holds under two admins editing at the
   * same time.
   */
  async upsertEntry(schoolId: string, input: UpsertTimetableEntryInput) {
    await this.assertSlotBelongsToSchool(schoolId, input);

    const conflicts = await this.findConflicts(schoolId, input);
    if (conflicts.length > 0) throw this.conflictError(conflicts);

    const data = {
      schoolId,
      classId: input.classId,
      periodId: input.periodId,
      dayOfWeek: input.dayOfWeek,
      subject: input.subject,
      teacherUserId: input.teacherUserId,
      room: input.room ?? null,
    };

    try {
      return await this.prisma.timetableEntry.upsert({
        where: {
          classId_dayOfWeek_periodId: {
            classId: input.classId,
            dayOfWeek: input.dayOfWeek,
            periodId: input.periodId,
          },
        },
        create: data,
        update: {
          subject: data.subject,
          teacherUserId: data.teacherUserId,
          room: data.room,
        },
        include: ENTRY_INCLUDE,
      });
    } catch (error) {
      // Lost a race with a concurrent edit. Re-read so the message names
      // whatever actually took the slot rather than reporting a raw
      // constraint violation.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw this.conflictError(await this.findConflicts(schoolId, input));
      }
      throw error;
    }
  }

  async deleteEntry(schoolId: string, id: string) {
    const entry = await this.prisma.timetableEntry.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });
    if (!entry) throw new NotFoundException("Timetable entry not found");
    await this.prisma.timetableEntry.delete({ where: { id } });
  }

  // ---------- reads ----------

  forClass(schoolId: string, classId: string) {
    return this.prisma.timetableEntry.findMany({
      where: { schoolId, classId },
      include: ENTRY_INCLUDE,
      orderBy: [{ dayOfWeek: "asc" }, { period: { sortOrder: "asc" } }],
    });
  }

  forTeacher(schoolId: string, teacherUserId: string) {
    return this.prisma.timetableEntry.findMany({
      where: { schoolId, teacherUserId },
      include: ENTRY_INCLUDE,
      orderBy: [{ dayOfWeek: "asc" }, { period: { sortOrder: "asc" } }],
    });
  }

  async forStudent(schoolId: string, studentId: string) {
    const student = await this.prisma.studentProfile.findFirst({
      where: { id: studentId, schoolId },
      select: { classId: true },
    });
    if (!student) throw new NotFoundException("Student not found");
    // A student not yet placed in a class has no timetable rather than an error.
    if (!student.classId) return [];
    return this.forClass(schoolId, student.classId);
  }

  // ---------- internals ----------

  private async assertSlotBelongsToSchool(
    schoolId: string,
    input: UpsertTimetableEntryInput,
  ) {
    const [schoolClass, period, teacher] = await Promise.all([
      this.prisma.schoolClass.findFirst({
        where: { id: input.classId, schoolId },
        select: { id: true },
      }),
      this.prisma.period.findFirst({
        where: { id: input.periodId, schoolId },
        select: { id: true },
      }),
      this.prisma.user.findFirst({
        where: { id: input.teacherUserId, schoolId, role: "TEACHER" },
        select: { id: true },
      }),
    ]);

    // "Not found" rather than "forbidden" throughout: confirming that a class
    // or teacher exists in another school would leak another tenant's data.
    if (!schoolClass) throw new NotFoundException("Class not found");
    if (!period) throw new NotFoundException("Period not found");
    if (!teacher) throw new NotFoundException("Teacher not found");
  }

  /**
   * Lessons that would clash with this one. The class's own existing lesson in
   * the slot isn't a clash — that's the row being replaced.
   */
  private async findConflicts(
    schoolId: string,
    input: UpsertTimetableEntryInput,
  ): Promise<TimetableConflict[]> {
    const slot = {
      schoolId,
      dayOfWeek: input.dayOfWeek as DayOfWeek,
      periodId: input.periodId,
      // Exclude the row this upsert will overwrite.
      NOT: { classId: input.classId },
    };

    const [teacherClash, roomClash] = await Promise.all([
      this.prisma.timetableEntry.findFirst({
        where: { ...slot, teacherUserId: input.teacherUserId },
        include: ENTRY_INCLUDE,
      }),
      input.room
        ? this.prisma.timetableEntry.findFirst({
            where: { ...slot, room: input.room },
            include: ENTRY_INCLUDE,
          })
        : Promise.resolve(null),
    ]);

    const conflicts: TimetableConflict[] = [];

    if (teacherClash) {
      const who = `${teacherClash.teacherUser.firstName} ${teacherClash.teacherUser.lastName}`;
      conflicts.push({
        kind: "TEACHER",
        message: `${who} already teaches ${teacherClash.subject} to ${teacherClash.class.name} ${teacherClash.class.section} in this slot`,
        conflictsWith: this.summarise(teacherClash),
      });
    }

    if (roomClash) {
      conflicts.push({
        kind: "ROOM",
        message: `Room ${roomClash.room} is already used by ${roomClash.class.name} ${roomClash.class.section} in this slot`,
        conflictsWith: this.summarise(roomClash),
      });
    }

    return conflicts;
  }

  private summarise(entry: {
    id: string;
    classId: string;
    subject: string;
    teacherUserId: string;
    room: string | null;
  }) {
    return {
      id: entry.id,
      classId: entry.classId,
      subject: entry.subject,
      teacherUserId: entry.teacherUserId,
      room: entry.room,
    };
  }

  private conflictError(conflicts: TimetableConflict[]) {
    return new ConflictException({
      message: conflicts[0]?.message ?? "That slot is already taken",
      conflicts,
    });
  }
}
