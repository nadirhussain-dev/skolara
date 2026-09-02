import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  LEAVE_ALLOWANCE_DAYS,
  LEAVE_KIND_LABELS,
  leaveKindSchema,
  type LeaveBalance,
  type LeaveKind,
  type LeaveStatus,
  type RequestLeaveInput,
  type ReviewLeaveInput,
} from "@skolara/types";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { workingDaysBetween } from "./working-days";

const REQUESTER_SELECT = {
  select: { id: true, firstName: true, lastName: true, role: true },
} as const;

@Injectable()
export class LeaveService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async request(schoolId: string, requesterUserId: string, input: RequestLeaveInput) {
    const days = workingDaysBetween(input.startDate, input.endDate);
    if (days === 0) {
      throw new BadRequestException(
        "That range contains no working days — Sunday isn't a working day.",
      );
    }

    // Checked before writing so the requester learns immediately rather than
    // after an admin has already looked at it.
    const balance = await this.balanceFor(schoolId, requesterUserId, input.kind);
    if (balance.remainingDays !== null && days > balance.remainingDays) {
      throw new BadRequestException(
        `That's ${days} working days but only ${balance.remainingDays} of your ${LEAVE_KIND_LABELS[input.kind].toLowerCase()} allowance remains.`,
      );
    }

    const created = await this.prisma.leaveRequest.create({
      data: {
        schoolId,
        requesterUserId,
        kind: input.kind,
        startDate: input.startDate,
        endDate: input.endDate,
        reason: input.reason ?? null,
      },
      include: { requesterUser: REQUESTER_SELECT },
    });

    await this.notifyApprovers(schoolId, created.requesterUser, days, input.kind);
    return created;
  }

  findMine(requesterUserId: string) {
    return this.prisma.leaveRequest.findMany({
      where: { requesterUserId },
      orderBy: { createdAt: "desc" },
    });
  }

  findForSchool(schoolId: string, status?: LeaveStatus) {
    return this.prisma.leaveRequest.findMany({
      where: { schoolId, ...(status ? { status } : {}) },
      // Oldest pending first: this is a queue someone works through, and the
      // person who asked first has been waiting longest.
      orderBy: { createdAt: "asc" },
      include: { requesterUser: REQUESTER_SELECT },
    });
  }

  /** Every kind's balance, so the app can show the whole picture at once. */
  async balances(schoolId: string, userId: string): Promise<LeaveBalance[]> {
    return Promise.all(
      leaveKindSchema.options.map((kind) => this.balanceFor(schoolId, userId, kind)),
    );
  }

  async review(
    schoolId: string,
    id: string,
    reviewedByUserId: string,
    input: ReviewLeaveInput,
  ) {
    const request = await this.prisma.leaveRequest.findFirst({
      where: { id, schoolId },
      include: { requesterUser: REQUESTER_SELECT },
    });
    if (!request) throw new NotFoundException("Leave request not found");
    if (request.status !== "PENDING") {
      throw new BadRequestException(
        `That request is already ${request.status.toLowerCase()}`,
      );
    }
    // Someone approving their own leave defeats the point of an approval step.
    if (request.requesterUserId === reviewedByUserId) {
      throw new ForbiddenException("You can't review your own leave request");
    }

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: input.status,
        reviewNote: input.reviewNote ?? null,
        reviewedByUserId,
        reviewedAt: new Date(),
      },
    });

    await this.notifications.sendPush([request.requesterUserId], {
      title: `Leave ${input.status.toLowerCase()}`,
      body:
        input.status === "APPROVED"
          ? `Your ${LEAVE_KIND_LABELS[request.kind].toLowerCase()} has been approved.`
          : `Your leave request was declined: ${input.reviewNote}`,
      data: { type: "LEAVE", leaveRequestId: id },
    });

    return updated;
  }

  /** Withdrawing an untouched request, rather than bothering an approver. */
  async cancel(userId: string, id: string) {
    const request = await this.prisma.leaveRequest.findFirst({
      where: { id, requesterUserId: userId },
    });
    if (!request) throw new NotFoundException("Leave request not found");
    if (request.status !== "PENDING") {
      throw new BadRequestException("Only a pending request can be withdrawn");
    }
    return this.prisma.leaveRequest.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
  }

  private async balanceFor(
    schoolId: string,
    userId: string,
    kind: LeaveKind,
  ): Promise<LeaveBalance> {
    const allowanceDays = LEAVE_ALLOWANCE_DAYS[kind];

    // Allowances are annual, so only this calendar year counts. Pending
    // requests count against the balance too — otherwise someone could file
    // three overlapping requests that each look affordable alone.
    const yearStart = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
    const requests = await this.prisma.leaveRequest.findMany({
      where: {
        schoolId,
        requesterUserId: userId,
        kind,
        status: { in: ["APPROVED", "PENDING"] },
        startDate: { gte: yearStart },
      },
      select: { startDate: true, endDate: true },
    });

    const usedDays = requests.reduce(
      (total, request) => total + workingDaysBetween(request.startDate, request.endDate),
      0,
    );

    return {
      kind,
      allowanceDays,
      usedDays,
      remainingDays: allowanceDays === null ? null : Math.max(allowanceDays - usedDays, 0),
    };
  }

  private async notifyApprovers(
    schoolId: string,
    requester: { firstName: string; lastName: string },
    days: number,
    kind: LeaveKind,
  ) {
    const admins = await this.prisma.user.findMany({
      where: { schoolId, role: "SCHOOL_ADMIN", isActive: true },
      select: { id: true },
    });

    await this.notifications.sendPush(
      admins.map((admin) => admin.id),
      {
        title: "Leave request",
        body: `${requester.firstName} ${requester.lastName} requested ${days} working day${days === 1 ? "" : "s"} of ${LEAVE_KIND_LABELS[kind].toLowerCase()}.`,
        data: { type: "LEAVE_REQUEST" },
      },
    );
  }
}
