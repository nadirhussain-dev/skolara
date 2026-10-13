import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  AddComplaintCommentInput,
  ComplaintStatus,
  CreateComplaintInput,
} from "@skolara/types";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

const PERSON = { select: { firstName: true, lastName: true, role: true } } as const;
const SUMMARY_INCLUDE = {
  raisedByUser: PERSON,
  student: {
    select: {
      id: true,
      admissionNumber: true,
      user: { select: { firstName: true, lastName: true } },
      class: { select: { name: true, section: true } },
    },
  },
  _count: { select: { comments: true } },
} as const;

@Injectable()
export class ComplaintsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async create(schoolId: string, raisedByUserId: string, input: CreateComplaintInput) {
    const complaint = await this.prisma.complaint.create({
      data: {
        schoolId,
        raisedByUserId,
        studentId: input.studentId,
        subject: input.subject,
        body: input.body,
      },
    });

    // A concern nobody hears about is worse than none: tell the school's
    // admins, who are the ones who can act on it.
    const admins = await this.prisma.user.findMany({
      where: { schoolId, role: "SCHOOL_ADMIN", isActive: true },
      select: { id: true },
    });
    await this.notifications.sendPush(
      admins.map((admin) => admin.id),
      {
        title: "New concern raised",
        body: input.subject,
        data: { type: "COMPLAINT", complaintId: complaint.id },
      },
    );
    return complaint;
  }

  findAllForSchool(schoolId: string) {
    return this.prisma.complaint.findMany({
      where: { schoolId },
      include: SUMMARY_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  }

  findMine(raisedByUserId: string) {
    return this.prisma.complaint.findMany({
      where: { raisedByUserId },
      include: SUMMARY_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  }

  private async assertCanView(
    schoolId: string,
    userId: string,
    role: string,
    complaintId: string,
  ) {
    const complaint = await this.prisma.complaint.findFirst({
      where: { id: complaintId, schoolId },
    });
    if (!complaint) throw new NotFoundException("Complaint not found");
    if (role !== "SCHOOL_ADMIN" && complaint.raisedByUserId !== userId) {
      throw new ForbiddenException("Not your complaint");
    }
    return complaint;
  }

  async findOne(schoolId: string, userId: string, role: string, complaintId: string) {
    await this.assertCanView(schoolId, userId, role, complaintId);
    return this.prisma.complaint.findUniqueOrThrow({
      where: { id: complaintId },
      include: {
        ...SUMMARY_INCLUDE,
        comments: { include: { authorUser: PERSON }, orderBy: { createdAt: "asc" } },
      },
    });
  }

  async addComment(
    schoolId: string,
    userId: string,
    role: string,
    complaintId: string,
    input: AddComplaintCommentInput,
  ) {
    const complaint = await this.assertCanView(schoolId, userId, role, complaintId);
    if (complaint.status === "RESOLVED" && role !== "SCHOOL_ADMIN") {
      // Reopening is a decision for the school; the family can raise a new one.
      throw new ForbiddenException("This concern has been resolved");
    }
    const comment = await this.prisma.complaintComment.create({
      data: { complaintId, authorUserId: userId, body: input.body },
      include: { authorUser: PERSON },
    });
    // The school replying is the school picking it up.
    if (role === "SCHOOL_ADMIN" && complaint.status === "OPEN") {
      await this.prisma.complaint.update({
        where: { id: complaintId },
        data: { status: "IN_PROGRESS" },
      });
    }

    // Only tell the other side. A parent chasing their own complaint
    // shouldn't get a push for their own comment.
    if (complaint.raisedByUserId !== userId) {
      await this.notifications.sendPush([complaint.raisedByUserId], {
        title: "Update on your complaint",
        body: input.body,
        data: { type: "COMPLAINT", complaintId },
      });
    }

    return comment;
  }

  async updateStatus(schoolId: string, complaintId: string, status: ComplaintStatus) {
    const complaint = await this.prisma.complaint.findFirst({
      where: { id: complaintId, schoolId },
    });
    if (!complaint) throw new NotFoundException("Complaint not found");

    const updated = await this.prisma.complaint.update({
      where: { id: complaintId },
      data: {
        status,
        resolvedAt: status === "RESOLVED" ? new Date() : null,
      },
    });

    await this.notifications.sendPush([complaint.raisedByUserId], {
      title: "Complaint status updated",
      body: `"${complaint.subject}" is now ${status.replace("_", " ").toLowerCase()}.`,
      data: { type: "COMPLAINT", complaintId },
    });

    return updated;
  }
}
