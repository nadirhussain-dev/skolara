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
    audience: string;
    classId: string | null;
  }) {
    const recipients = await this.resolveRecipientPhones(notice);
    await Promise.all(
      recipients.map((phone) =>
        this.notifications.sendWhatsApp(phone, `📢 New notice: ${notice.id}`),
      ),
    );
  }

  private async resolveRecipientPhones(notice: {
    schoolId: string;
    audience: string;
    classId: string | null;
  }): Promise<string[]> {
    const baseWhere = { schoolId: notice.schoolId, isActive: true, phone: { not: null } };

    if (notice.audience === "ALL") {
      const users = await this.prisma.user.findMany({ where: baseWhere });
      return users.map((u) => u.phone!).filter(Boolean);
    }

    if (notice.audience === "TEACHERS") {
      const users = await this.prisma.user.findMany({
        where: { ...baseWhere, role: "TEACHER" },
      });
      return users.map((u) => u.phone!).filter(Boolean);
    }

    if (notice.audience === "STUDENTS") {
      const users = await this.prisma.user.findMany({
        where: { ...baseWhere, role: "STUDENT" },
      });
      return users.map((u) => u.phone!).filter(Boolean);
    }

    if (notice.audience === "PARENTS") {
      const users = await this.prisma.user.findMany({
        where: { ...baseWhere, role: "PARENT" },
      });
      return users.map((u) => u.phone!).filter(Boolean);
    }

    if (notice.audience === "CLASS" && notice.classId) {
      const students = await this.prisma.studentProfile.findMany({
        where: { schoolId: notice.schoolId, classId: notice.classId },
        include: { user: true, parentLinks: { include: { parentUser: true } } },
      });
      const phones = students.flatMap((s) => [
        s.user.phone,
        ...s.parentLinks.map((link) => link.parentUser.phone),
      ]);
      return phones.filter((phone): phone is string => Boolean(phone));
    }

    return [];
  }
}
