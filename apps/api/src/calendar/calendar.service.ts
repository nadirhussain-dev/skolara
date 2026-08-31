import { Injectable, NotFoundException } from "@nestjs/common";
import type { CreateCalendarEventInput } from "@skolara/types";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

  create(schoolId: string, createdByUserId: string, input: CreateCalendarEventInput) {
    return this.prisma.calendarEvent.create({
      data: {
        schoolId,
        createdByUserId,
        title: input.title,
        description: input.description ?? null,
        category: input.category,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        allDay: input.allDay,
        classId: input.classId ?? null,
      },
    });
  }

  /**
   * Events visible to this user in a date window.
   *
   * School-wide events (`classId` null) go to everyone. Class-specific events
   * only reach that class — a parent shouldn't see another year group's trip
   * on their calendar.
   */
  async findVisibleFor(
    schoolId: string,
    user: AuthenticatedUser,
    from?: Date,
    to?: Date,
  ) {
    const window = {
      ...(from ? { endsAt: { gte: from } } : {}),
      ...(to ? { startsAt: { lte: to } } : {}),
    };

    if (user.role === "SCHOOL_ADMIN" || user.role === "TEACHER") {
      return this.prisma.calendarEvent.findMany({
        where: { schoolId, ...window },
        orderBy: { startsAt: "asc" },
      });
    }

    const classIds = await this.visibleClassIds(user);
    return this.prisma.calendarEvent.findMany({
      where: {
        schoolId,
        ...window,
        OR: [{ classId: null }, { classId: { in: classIds } }],
      },
      orderBy: { startsAt: "asc" },
    });
  }

  async remove(schoolId: string, id: string) {
    const event = await this.prisma.calendarEvent.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });
    if (!event) throw new NotFoundException("Event not found");
    await this.prisma.calendarEvent.delete({ where: { id } });
  }

  private async visibleClassIds(user: AuthenticatedUser): Promise<string[]> {
    if (user.role === "STUDENT") {
      const student = await this.prisma.studentProfile.findFirst({
        where: { userId: user.id },
        select: { classId: true },
      });
      return student?.classId ? [student.classId] : [];
    }

    // PARENT — every class their children are in.
    const children = await this.prisma.studentProfile.findMany({
      where: { parentLinks: { some: { parentUserId: user.id } } },
      select: { classId: true },
    });
    return children
      .map((child) => child.classId)
      .filter((id): id is string => Boolean(id));
  }
}
