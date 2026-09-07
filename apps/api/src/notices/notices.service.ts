import { Injectable } from "@nestjs/common";
import type { CreateNoticeInput } from "@skolara/types";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class NoticesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async create(
    schoolId: string,
    publishedByUserId: string,
    input: CreateNoticeInput,
  ) {
    const notice = await this.prisma.notice.create({
      data: {
        schoolId,
        title: input.title,
        body: input.body,
        audience: input.audience,
        classId: input.classId,
        publishedByUserId,
      },
    });

    await this.alertRecipients(notice);
    return notice;
  }

  async findVisibleFor(schoolId: string, user: AuthenticatedUser) {
    if (user.role === "SCHOOL_ADMIN") {
      return this.prisma.notice.findMany({
        where: { schoolId },
        orderBy: { createdAt: "desc" },
      });
    }

    if (user.role === "TEACHER") {
      return this.prisma.notice.findMany({
        where: { schoolId, audience: { in: ["ALL", "TEACHERS"] } },
        orderBy: { createdAt: "desc" },
      });
    }

    if (user.role === "STUDENT") {
      const classIds = await this.studentClassIds(user.id);
      return this.prisma.notice.findMany({
        where: {
          schoolId,
          OR: [
            { audience: { in: ["ALL", "STUDENTS"] } },
            { audience: "CLASS", classId: { in: classIds } },
          ],
        },
        orderBy: { createdAt: "desc" },
      });
    }

    // PARENT
    const classIds = await this.parentChildClassIds(user.id);
    return this.prisma.notice.findMany({
      where: {
        schoolId,
        OR: [
          { audience: { in: ["ALL", "PARENTS"] } },
          { audience: "CLASS", classId: { in: classIds } },
        ],
      },
      orderBy: { createdAt: "desc" },
    });
  }

  private studentClassIds(userId: string) {
    return this.prisma.studentProfile
      .findFirst({ where: { userId }, select: { classId: true } })
      .then((s) => (s?.classId ? [s.classId] : []));
  }

  private parentChildClassIds(parentUserId: string) {
    return this.prisma.studentProfile
      .findMany({
        where: { parentLinks: { some: { parentUserId } } },
        select: { classId: true },
      })
      .then((rows) =>
        rows.map((r) => r.classId).filter((id): id is string => Boolean(id)),
      );
  }

  private async alertRecipients(notice: {
    id: string;
    schoolId: string;
    title: string;
    audience: string;
    classId: string | null;
  }) {
    const recipients = await this.resolveRecipients(notice);

    await Promise.all([
      this.notifications.sendPhoneAlerts(
        notice.schoolId,
        recipients.map((recipient) => recipient.phone),
        `📢 New notice from your school: ${notice.title}`,
      ),
      this.notifications.sendPush(
        recipients.map((recipient) => recipient.id),
        {
          title: "New notice",
          body: notice.title,
          data: { type: "NOTICE", noticeId: notice.id },
        },
      ),
    ]);
  }

  /**
   * Everyone the notice is addressed to. Push goes to all of them; the phone
   * channel only reaches the subset with a number on file.
   */
  private async resolveRecipients(notice: {
    schoolId: string;
    audience: string;
    classId: string | null;
  }): Promise<{ id: string; phone: string | null }[]> {
    const baseWhere = { schoolId: notice.schoolId, isActive: true };
    const select = { id: true, phone: true } as const;

    const roleByAudience: Record<string, "TEACHER" | "STUDENT" | "PARENT"> = {
      TEACHERS: "TEACHER",
      STUDENTS: "STUDENT",
      PARENTS: "PARENT",
    };

    if (notice.audience === "ALL") {
      return this.prisma.user.findMany({ where: baseWhere, select });
    }

    const role = roleByAudience[notice.audience];
    if (role) {
      return this.prisma.user.findMany({ where: { ...baseWhere, role }, select });
    }

    if (notice.audience === "CLASS" && notice.classId) {
      const students = await this.prisma.studentProfile.findMany({
        where: { schoolId: notice.schoolId, classId: notice.classId },
        include: {
          user: { select },
          parentLinks: { include: { parentUser: { select } } },
        },
      });
      return students.flatMap((student) => [
        student.user,
        ...student.parentLinks.map((link) => link.parentUser),
      ]);
    }

    return [];
  }
}
