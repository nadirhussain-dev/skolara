import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  CreateAssignmentInput,
  GradeAssignmentInput,
  SubmitAssignmentInput,
} from "@skolara/types";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AssignmentsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async create(schoolId: string, createdByUserId: string, input: CreateAssignmentInput) {
    const assignment = await this.prisma.assignment.create({
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

    // Pupils and their families hear about homework in the app, the moment
    // it is set — not when someone remembers to check.
    const pupils = await this.prisma.studentProfile.findMany({
      where: { schoolId, classId: input.classId, user: { isActive: true } },
      select: { userId: true, parentLinks: { select: { parentUserId: true } } },
    });
    const recipients = new Set<string>();
    for (const pupil of pupils) {
      recipients.add(pupil.userId);
      for (const link of pupil.parentLinks) recipients.add(link.parentUserId);
    }
    if (recipients.size > 0) {
      await this.notifications.sendPush([...recipients], {
        title: `Homework: ${input.subject}`,
        body: `${input.title} — due ${input.dueDate.toISOString().slice(0, 10)}`,
        data: { type: "HOMEWORK", assignmentId: assignment.id },
      });
    }
    return assignment;
  }

  /**
   * Homework set for a class, newest due date first, each with how many of
   * the class have handed it in — the number a teacher looks for first.
   */
  async findForClass(schoolId: string, classId: string) {
    const [assignments, classSize] = await Promise.all([
      this.prisma.assignment.findMany({
        where: { schoolId, classId },
        include: { _count: { select: { submissions: true } } },
        orderBy: { dueDate: "desc" },
      }),
      this.prisma.studentProfile.count({ where: { schoolId, classId, user: { isActive: true } } }),
    ]);
    return assignments.map(({ _count, ...assignment }) => ({
      ...assignment,
      submittedCount: _count.submissions,
      classSize,
    }));
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
    const student = await this.prisma.studentProfile.findFirst({
      where: { id: studentId, schoolId },
      select: { classId: true },
    });
    // Handing in work for another class's homework would put a submission in
    // a teacher's list for a pupil they don't teach.
    if (!student || student.classId !== assignment.classId) {
      throw new NotFoundException("Assignment not found");
    }

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

    const graded = await this.prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: { grade: input.grade, feedback: input.feedback },
      include: {
        assignment: { select: { title: true } },
        student: { select: { userId: true, parentLinks: { select: { parentUserId: true } } } },
      },
    });
    await this.notifications.sendPush(
      [graded.student.userId, ...graded.student.parentLinks.map((link) => link.parentUserId)],
      {
        title: "Homework marked",
        body: `${graded.assignment.title}: ${input.grade}`,
        data: { type: "HOMEWORK", assignmentId: graded.assignmentId },
      },
    );
    const { assignment: _assignment, student: _student, ...result } = graded;
    return result;
  }

  async classOfAssignment(schoolId: string, assignmentId: string): Promise<string> {
    const assignment = await this.prisma.assignment.findFirst({
      where: { id: assignmentId, schoolId },
      select: { classId: true },
    });
    if (!assignment) throw new NotFoundException("Assignment not found");
    return assignment.classId;
  }

  async classOfSubmission(schoolId: string, submissionId: string): Promise<string> {
    const submission = await this.prisma.assignmentSubmission.findFirst({
      where: { id: submissionId, assignment: { schoolId } },
      select: { assignment: { select: { classId: true } } },
    });
    if (!submission) throw new NotFoundException("Submission not found");
    return submission.assignment.classId;
  }

  findForStudent(studentId: string) {
    return this.prisma.assignmentSubmission.findMany({
      where: { studentId },
      include: { assignment: true },
      orderBy: { submittedAt: "desc" },
    });
  }
}
