import { Injectable, NotFoundException } from "@nestjs/common";
import type { UpsertGradeEntryInput } from "@skolara/types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class GradesService {
  constructor(private prisma: PrismaService) {}

  async upsert(
    schoolId: string,
    gradedByUserId: string,
    input: UpsertGradeEntryInput,
  ) {
    const student = await this.prisma.studentProfile.findFirst({
      where: { id: input.studentId, schoolId, classId: input.classId },
    });
    if (!student) {
      throw new NotFoundException("Student not found in that class");
    }

    return this.prisma.gradeEntry.upsert({
      where: {
        studentId_subject_term_examType: {
          studentId: input.studentId,
          subject: input.subject,
          term: input.term,
          examType: input.examType,
        },
      },
      create: {
        schoolId,
        classId: input.classId,
        studentId: input.studentId,
        subject: input.subject,
        term: input.term,
        examType: input.examType,
        marksObtained: input.marksObtained,
        maxMarks: input.maxMarks,
        comments: input.comments,
        gradedByUserId,
      },
      update: {
        marksObtained: input.marksObtained,
        maxMarks: input.maxMarks,
        comments: input.comments,
        gradedByUserId,
      },
    });
  }

  findForClass(schoolId: string, classId: string, term?: string) {
    return this.prisma.gradeEntry.findMany({
      where: { schoolId, classId, ...(term ? { term } : {}) },
      include: {
        student: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: [{ subject: "asc" }],
    });
  }

  findForStudent(schoolId: string, studentId: string) {
    return this.prisma.gradeEntry.findMany({
      where: { schoolId, studentId },
      orderBy: [{ term: "desc" }, { subject: "asc" }],
    });
  }
}
