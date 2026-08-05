import { Injectable, NotFoundException } from "@nestjs/common";
import type { CreateExamInput, RankListEntry } from "@skolara/types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ExamsService {
  constructor(private prisma: PrismaService) {}

  create(schoolId: string, input: CreateExamInput) {
    return this.prisma.exam.create({
      data: {
        schoolId,
        classId: input.classId,
        name: input.name,
        term: input.term,
        examType: input.examType,
        scheduledDate: input.scheduledDate,
      },
    });
  }

  findForClass(schoolId: string, classId: string) {
    return this.prisma.exam.findMany({
      where: { schoolId, classId },
      orderBy: { scheduledDate: "desc" },
    });
  }

  async rankList(schoolId: string, examId: string): Promise<RankListEntry[]> {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, schoolId },
    });
    if (!exam) throw new NotFoundException("Exam not found");

    const entries = await this.prisma.gradeEntry.findMany({
      where: { schoolId, classId: exam.classId, term: exam.term, examType: exam.examType },
      include: { student: { include: { user: true } } },
    });

    const byStudent = new Map<
      string,
      { firstName: string; lastName: string; obtained: number; max: number }
    >();
    for (const entry of entries) {
      const existing = byStudent.get(entry.studentId) ?? {
        firstName: entry.student.user.firstName,
        lastName: entry.student.user.lastName,
        obtained: 0,
        max: 0,
      };
      existing.obtained += Number(entry.marksObtained);
      existing.max += Number(entry.maxMarks);
      byStudent.set(entry.studentId, existing);
    }

    const rows = Array.from(byStudent.entries())
      .map(([studentId, row]) => ({
        studentId,
        firstName: row.firstName,
        lastName: row.lastName,
        totalMarksObtained: row.obtained,
        totalMaxMarks: row.max,
        percentage: row.max > 0 ? (row.obtained / row.max) * 100 : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage);

    let rank = 0;
    let lastPercentage: number | null = null;
    return rows.map((row, index) => {
      if (row.percentage !== lastPercentage) {
        rank = index + 1;
        lastPercentage = row.percentage;
      }
      return { ...row, rank };
    });
  }
}
