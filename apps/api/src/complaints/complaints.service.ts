import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  AddComplaintCommentInput,
  ComplaintStatus,
  CreateComplaintInput,
} from "@skolara/types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ComplaintsService {
  constructor(private prisma: PrismaService) {}

  create(schoolId: string, raisedByUserId: string, input: CreateComplaintInput) {
    return this.prisma.complaint.create({
      data: {
        schoolId,
        raisedByUserId,
        studentId: input.studentId,
        subject: input.subject,
        body: input.body,
      },
    });
  }

  findAllForSchool(schoolId: string) {
    return this.prisma.complaint.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
    });
  }

  findMine(raisedByUserId: string) {
    return this.prisma.complaint.findMany({
      where: { raisedByUserId },
      orderBy: { createdAt: "desc" },
    });
  }

  private async assertCanView(userId: string, role: string, complaintId: string) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id: complaintId },
    });
    if (!complaint) throw new NotFoundException("Complaint not found");
    if (role !== "SCHOOL_ADMIN" && complaint.raisedByUserId !== userId) {
      throw new ForbiddenException("Not your complaint");
    }
    return complaint;
  }

  async findOne(userId: string, role: string, complaintId: string) {
    const complaint = await this.assertCanView(userId, role, complaintId);
    const comments = await this.prisma.complaintComment.findMany({
      where: { complaintId },
      orderBy: { createdAt: "asc" },
    });
    return { ...complaint, comments };
  }

  async addComment(
    userId: string,
    role: string,
    complaintId: string,
    input: AddComplaintCommentInput,
  ) {
    await this.assertCanView(userId, role, complaintId);
    return this.prisma.complaintComment.create({
      data: { complaintId, authorUserId: userId, body: input.body },
    });
  }

  async updateStatus(complaintId: string, status: ComplaintStatus) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id: complaintId },
    });
    if (!complaint) throw new NotFoundException("Complaint not found");

    return this.prisma.complaint.update({
      where: { id: complaintId },
      data: {
        status,
        resolvedAt: status === "RESOLVED" ? new Date() : null,
      },
    });
  }
}
