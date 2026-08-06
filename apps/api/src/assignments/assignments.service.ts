import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  CreateAssignmentInput,
  GradeAssignmentInput,
  SubmitAssignmentInput,
} from "@skolara/types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AssignmentsService {
  constructor(private prisma: PrismaService) {}

  create(schoolId: string, createdByUserId: string, input: CreateAssignmentInput) {
    return this.prisma.assignment.create({
      data: {
        schoolId,
        classId: input.classId,
        subject: input.subject,
        title: input.title,
        description: input.description,
        dueDate: input.dueDate,
        createdByUserId,
      },
    });
  }

  findForClass(schoolId: string, classId: string) {
    return this.prisma.assignment.findMany({
      where: { schoolId, classId },
      orderBy: { dueDate: "desc" },
    });
  }

  async submit(
    schoolId: string,
    studentId: string,
    assignmentId: string,
    input: SubmitAssignmentInput,
  ) {
    const assignment = await this.prisma.assignment.findFirst({
      where: { id: assignmentId, schoolId },
    });
    if (!assignment) throw new NotFoundException("Assignment not found");

    return this.prisma.assignmentSubmission.upsert({
      where: { assignmentId_studentId: { assignmentId, studentId } },
      create: {
        assignmentId,
        studentId,
        fileUrl: input.fileUrl,
        note: input.note,
      },
      update: {
        fileUrl: input.fileUrl,
        note: input.note,
        submittedAt: new Date(),
      },
    });
  }

  async findSubmissions(schoolId: string, assignmentId: string) {
    const assignment = await this.prisma.assignment.findFirst({
      where: { id: assignmentId, schoolId },
    });
    if (!assignment) throw new NotFoundException("Assignment not found");

    return this.prisma.assignmentSubmission.findMany({
      where: { assignmentId },
      include: {
        student: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
      orderBy: { submittedAt: "desc" },
    });
  }

  async grade(schoolId: string, submissionId: string, input: GradeAssignmentInput) {
    const submission = await this.prisma.assignmentSubmission.findFirst({
      where: { id: submissionId, assignment: { schoolId } },
    });
    if (!submission) throw new NotFoundException("Submission not found");

    return this.prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: { grade: input.grade, feedback: input.feedback },
    });
  }

  findForStudent(studentId: string) {
    return this.prisma.assignmentSubmission.findMany({
      where: { studentId },
      include: { assignment: true },
      orderBy: { submittedAt: "desc" },
    });
  }
}
