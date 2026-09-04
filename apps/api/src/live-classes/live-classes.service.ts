import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  LIVE_CLASS_JOIN_LEAD_MINUTES,
  type UpsertLiveClassInput,
} from "@skolara/types";
import { PrismaService } from "../prisma/prisma.service";

const SESSION_INCLUDE = {
  hostUser: { select: { id: true, firstName: true, lastName: true } },
  class: { select: { id: true, name: true, section: true } },
} as const;

/** What a student is told about a session, with the link only when it's live. */
export interface JoinableLiveClass {
  id: string;
  classId: string;
  subject: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  hostUser: { id: string; firstName: string; lastName: string };
  /** Null until the join window opens, and again once the lesson has ended. */
  meetingUrl: string | null;
  joinable: boolean;
  /** When the link becomes collectable, so the app can show a countdown. */
  joinableFrom: Date;
}

@Injectable()
export class LiveClassesService {
  constructor(private prisma: PrismaService) {}

  async create(schoolId: string, hostUserId: string, input: UpsertLiveClassInput) {
    await this.assertClass(schoolId, input.classId);

    try {
      return await this.prisma.liveClass.create({
        data: {
          schoolId,
          classId: input.classId,
          subject: input.subject,
          title: input.title,
          meetingUrl: input.meetingUrl,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          hostUserId,
        },
        include: SESSION_INCLUDE,
      });
    } catch (error) {
      throw this.translateClash(error);
    }
  }

  async update(schoolId: string, id: string, input: UpsertLiveClassInput) {
    await this.own(schoolId, id);
    await this.assertClass(schoolId, input.classId);

    try {
      return await this.prisma.liveClass.update({
        where: { id },
        data: {
          classId: input.classId,
          subject: input.subject,
          title: input.title,
          meetingUrl: input.meetingUrl,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
        },
        include: SESSION_INCLUDE,
      });
    } catch (error) {
      throw this.translateClash(error);
    }
  }

  async remove(schoolId: string, id: string) {
    await this.own(schoolId, id);
    await this.prisma.liveClass.delete({ where: { id } });
  }

  /** Staff view — always carries the link, because staff set it. */
  findForClass(schoolId: string, classId: string, includePast = false) {
    return this.prisma.liveClass.findMany({
      where: {
        schoolId,
        classId,
        ...(includePast ? {} : { endsAt: { gte: new Date() } }),
      },
      orderBy: { startsAt: "asc" },
      include: SESSION_INCLUDE,
    });
  }

  /** A teacher's own sessions across every class they host. */
  findForHost(schoolId: string, hostUserId: string, includePast = false) {
    return this.prisma.liveClass.findMany({
      where: {
        schoolId,
        hostUserId,
        ...(includePast ? {} : { endsAt: { gte: new Date() } }),
      },
      orderBy: { startsAt: "asc" },
      include: SESSION_INCLUDE,
    });
  }

  /**
   * What a student or parent sees. The link is withheld until the join window
   * opens and withdrawn once the lesson has ended — the whole point of routing
   * this through the API rather than posting the link on the notice board.
   *
   * Enforced here rather than by hiding a button, since the payload is what
   * anyone reading the network tab actually gets.
   */
  async findForStudent(schoolId: string, studentId: string): Promise<JoinableLiveClass[]> {
    const student = await this.prisma.studentProfile.findFirst({
      where: { id: studentId, schoolId },
      select: { classId: true },
    });
    if (!student) throw new NotFoundException("Student not found");
    if (!student.classId) return [];

    const sessions = await this.prisma.liveClass.findMany({
      where: { schoolId, classId: student.classId, endsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      include: SESSION_INCLUDE,
    });

    const now = new Date();
    return sessions.map((session) => {
      const joinableFrom = new Date(
        session.startsAt.getTime() - LIVE_CLASS_JOIN_LEAD_MINUTES * 60_000,
      );
      const joinable = joinableFrom <= now && session.endsAt > now;
      return {
        id: session.id,
        classId: session.classId,
        subject: session.subject,
        title: session.title,
        startsAt: session.startsAt,
        endsAt: session.endsAt,
        hostUser: session.hostUser,
        meetingUrl: joinable ? session.meetingUrl : null,
        joinable,
        joinableFrom,
      };
    });
  }

  // ---------- internals ----------

  /** The class a session belongs to, for the controller's permission check. */
  async classIdOf(schoolId: string, id: string): Promise<string> {
    const session = await this.own(schoolId, id);
    return session.classId;
  }

  private async own(schoolId: string, id: string) {
    const session = await this.prisma.liveClass.findFirst({
      where: { id, schoolId },
      select: { id: true, classId: true },
    });
    if (!session) throw new NotFoundException("Live class not found");
    return session;
  }

  private async assertClass(schoolId: string, classId: string) {
    const schoolClass = await this.prisma.schoolClass.findFirst({
      where: { id: classId, schoolId },
      select: { id: true },
    });
    if (!schoolClass) throw new NotFoundException("Class not found");
  }

  private translateClash(error: unknown): unknown {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return new ConflictException(
        "This class already has a live lesson starting at that time",
      );
    }
    return error;
  }
}
