import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  MAX_ABSENCE_REQUEST_DAYS,
  type LeaveStatus,
  type RequestAbsenceInput,
  type ReviewAbsenceInput,
} from "@skolara/types";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

const STUDENT_INCLUDE = {
  student: {
    select: {
      id: true,
      admissionNumber: true,
      user: { select: { firstName: true, lastName: true } },
      class: { select: { id: true, name: true, section: true } },
    },
  },
  raisedByUser: { select: { id: true, firstName: true, lastName: true, role: true } },
} as const;

const DAY_MS = 86_400_000;

/** Inclusive of both ends, so a single-day absence counts as one. */
function daysInclusive(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1;
}

@Injectable()
export class AbsencesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async request(schoolId: string, raisedByUserId: string, input: RequestAbsenceInput) {
    const days = daysInclusive(input.startDate, input.endDate);
    if (days > MAX_ABSENCE_REQUEST_DAYS) {
      throw new BadRequestException(
        `That's ${days} days — a single request can cover at most ${MAX_ABSENCE_REQUEST_DAYS}. Check the dates, or send separate requests.`,
      );
    }

    // A second request over the same days would either duplicate the first or
    // contradict it, and on approval both would rewrite the same registers.
    // Two ranges overlap when each starts before the other ends.
    const clash = await this.prisma.absenceRequest.findFirst({
      where: {
        studentId: input.studentId,
        status: { in: ["PENDING", "APPROVED"] },
        startDate: { lte: input.endDate },
        endDate: { gte: input.startDate },
      },
      select: { id: true, status: true },
    });
    if (clash) {
      throw new ConflictException(
        clash.status === "APPROVED"
          ? "Those dates are already covered by an approved absence."
          : "Those dates are already covered by a request awaiting a decision.",
      );
    }

    const created = await this.prisma.absenceRequest.create({
      data: {
        schoolId,
        studentId: input.studentId,
        raisedByUserId,
        startDate: input.startDate,
        endDate: input.endDate,
        reason: input.reason,
      },
      include: STUDENT_INCLUDE,
    });

    await this.notifyOffice(schoolId, created.student, days);
    return created;
  }

  /**
   * What this family has asked for. A parent sees every linked child's
   * requests, a student only their own — which is what the caller passes in,
   * since the controller has already established who they may act for.
   */
  findForStudents(studentIds: string[]) {
    if (studentIds.length === 0) return Promise.resolve([]);
    return this.prisma.absenceRequest.findMany({
      where: { studentId: { in: studentIds } },
      orderBy: { createdAt: "desc" },
      include: STUDENT_INCLUDE,
    });
  }

  findForSchool(schoolId: string, status?: LeaveStatus) {
    return this.prisma.absenceRequest.findMany({
      where: { schoolId, ...(status ? { status } : {}) },
      // Oldest first: a family waiting on a decision about tomorrow needs it
      // before someone asking about next month.
      orderBy: { createdAt: "asc" },
      include: STUDENT_INCLUDE,
    });
  }

  /**
   * Decides a request and, on approval, makes the register agree.
   *
   * Approving is the only thing here that touches attendance, and it converts
   * ABSENT to EXCUSED for the days covered. PRESENT and LATE are left alone:
   * if the child turned up, that is what happened, and an excuse note doesn't
   * change it. EXCUSED means "away with permission", so this is recording the
   * school's own decision rather than overruling the teacher's mark.
   *
   * Registers for days still to come don't exist yet; `AttendanceService`
   * consults approved requests when the register is taken, which is what
   * covers the forward half.
   */
  async review(
    schoolId: string,
    id: string,
    reviewedByUserId: string,
    input: ReviewAbsenceInput,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // The status test lives in the WHERE clause so two admins working the
      // same queue can't both decide one request — the second would otherwise
      // overwrite the first's decision and, if it declined, leave registers
      // excused for an absence nobody approved.
      const claimed = await tx.absenceRequest.updateMany({
        where: { id, schoolId, status: "PENDING" },
        data: {
          status: input.status,
          reviewNote: input.reviewNote ?? null,
          reviewedByUserId,
          reviewedAt: new Date(),
        },
      });
      if (claimed.count === 0) {
        const existing = await tx.absenceRequest.findFirst({
          where: { id, schoolId },
          select: { status: true },
        });
        if (!existing) throw new NotFoundException("Absence request not found");
        throw new BadRequestException(
          `That request is already ${existing.status.toLowerCase()}`,
        );
      }

      const request = await tx.absenceRequest.findUniqueOrThrow({
        where: { id },
        include: STUDENT_INCLUDE,
      });

      let excusedCount = 0;
      if (input.status === "APPROVED") {
        const excused = await tx.attendanceRecord.updateMany({
          where: {
            schoolId,
            studentId: request.studentId,
            status: "ABSENT",
            date: { gte: request.startDate, lte: request.endDate },
          },
          data: { status: "EXCUSED" },
        });
        excusedCount = excused.count;
      }

      await this.notifications.sendPush([request.raisedByUserId], {
        title: input.status === "APPROVED" ? "Absence approved" : "Absence declined",
        body:
          input.status === "APPROVED"
            ? `The school has excused ${request.student.user.firstName}'s absence.`
            : `The school declined the absence for ${request.student.user.firstName}: ${input.reviewNote}`,
        data: { type: "ABSENCE_REQUEST", absenceRequestId: id },
      });

      return { ...request, excusedRecords: excusedCount };
    });
  }

  /** Withdrawing before anyone has acted, rather than bothering the office. */
  async cancel(userId: string, id: string) {
    const claimed = await this.prisma.absenceRequest.updateMany({
      where: { id, raisedByUserId: userId, status: "PENDING" },
      data: { status: "CANCELLED" },
    });
    if (claimed.count === 0) {
      const existing = await this.prisma.absenceRequest.findFirst({
        where: { id },
        select: { raisedByUserId: true, status: true },
      });
      if (!existing) throw new NotFoundException("Absence request not found");
      if (existing.raisedByUserId !== userId) {
        throw new ForbiddenException("That isn't your request");
      }
      throw new BadRequestException("Only a request awaiting a decision can be withdrawn");
    }
    return this.prisma.absenceRequest.findUniqueOrThrow({ where: { id } });
  }

  private async notifyOffice(
    schoolId: string,
    student: { user: { firstName: string; lastName: string } },
    days: number,
  ) {
    const admins = await this.prisma.user.findMany({
      where: { schoolId, role: "SCHOOL_ADMIN", isActive: true },
      select: { id: true },
    });

    await this.notifications.sendPush(
      admins.map((admin) => admin.id),
      {
        title: "Absence request",
        body: `${student.user.firstName} ${student.user.lastName} — ${days} day${days === 1 ? "" : "s"} to approve.`,
        data: { type: "ABSENCE_REQUEST" },
      },
    );
  }
}
