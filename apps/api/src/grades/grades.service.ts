import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  PerformancePoint,
  StudentPerformance,
  UpsertGradeEntryInput,
} from "@skolara/types";
import { AiService } from "../ai/ai.service";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Identifies one assessment across a class. The `\u0000` separator can't appear
 * in a subject, term or exam type, so "Term 1" + "Mid" can never collide with
 * "Term" + "1 Mid".
 */
function assessmentKey(subject: string, term: string, examType: string): string {
  return [subject, term, examType].join("\u0000");
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** One decimal place — a percentage to four figures is false precision. */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

@Injectable()
export class GradesService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

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

  /**
   * A student's marks over time, per subject, against the class average for
   * the same assessments.
   *
   * Plotted as percentages, not raw marks: a 45/50 quiz and a 68/100 exam
   * aren't comparable as marks, and a chart that puts them on one axis is
   * lying. Quiz scores arrive here too, because auto-grading writes them into
   * the same table an exam mark goes into.
   */
  async performanceForStudent(
    schoolId: string,
    studentId: string,
    subject?: string,
  ): Promise<StudentPerformance> {
    const entries = await this.prisma.gradeEntry.findMany({
      where: { schoolId, studentId, ...(subject ? { subject } : {}) },
      orderBy: { createdAt: "asc" },
      select: {
        classId: true,
        subject: true,
        term: true,
        examType: true,
        marksObtained: true,
        maxMarks: true,
        createdAt: true,
      },
    });
    if (entries.length === 0) {
      return { studentId, subjects: [], overallAverage: null };
    }

    // One query for the whole comparison set rather than one per point: a
    // class is tens of students, so pulling the cohort's marks for the same
    // assessments and averaging in memory beats N round-trips.
    const classIds = [...new Set(entries.map((entry) => entry.classId))];
    const cohort = await this.prisma.gradeEntry.findMany({
      where: {
        schoolId,
        classId: { in: classIds },
        subject: { in: [...new Set(entries.map((entry) => entry.subject))] },
      },
      select: {
        subject: true,
        term: true,
        examType: true,
        marksObtained: true,
        maxMarks: true,
      },
    });

    const cohortAverages = new Map<string, { sum: number; count: number }>();
    for (const entry of cohort) {
      const max = Number(entry.maxMarks);
      if (max <= 0) continue;
      const key = assessmentKey(entry.subject, entry.term, entry.examType);
      const bucket = cohortAverages.get(key) ?? { sum: 0, count: 0 };
      bucket.sum += (Number(entry.marksObtained) / max) * 100;
      bucket.count += 1;
      cohortAverages.set(key, bucket);
    }

    const bySubject = new Map<string, PerformancePoint[]>();
    for (const entry of entries) {
      const max = Number(entry.maxMarks);
      // A zero-mark assessment has no percentage. Skipped rather than charted
      // as 0%, which would read as a failed paper.
      if (max <= 0) continue;

      const cohortBucket = cohortAverages.get(
        assessmentKey(entry.subject, entry.term, entry.examType),
      );
      const points = bySubject.get(entry.subject) ?? [];
      points.push({
        term: entry.term,
        examType: entry.examType,
        percentage: round1((Number(entry.marksObtained) / max) * 100),
        classAveragePercentage:
          cohortBucket && cohortBucket.count > 0
            ? round1(cohortBucket.sum / cohortBucket.count)
            : null,
        gradedAt: entry.createdAt,
      });
      bySubject.set(entry.subject, points);
    }

    const subjects = [...bySubject.entries()]
      .map(([name, points]) => {
        const withCohort = points.filter((point) => point.classAveragePercentage !== null);
        return {
          subject: name,
          points,
          average: round1(mean(points.map((point) => point.percentage))),
          classAverage:
            withCohort.length > 0
              ? round1(
                  mean(withCohort.map((point) => point.classAveragePercentage as number)),
                )
              : null,
        };
      })
      .sort((a, b) => a.subject.localeCompare(b.subject));

    const allPoints = subjects.flatMap((entry) => entry.points);
    return {
      studentId,
      subjects,
      overallAverage:
        allPoints.length > 0
          ? round1(mean(allPoints.map((point) => point.percentage)))
          : null,
    };
  }

  async generateComment(schoolId: string, gradeEntryId: string) {
    const entry = await this.prisma.gradeEntry.findFirst({
      where: { id: gradeEntryId, schoolId },
      include: { student: { include: { user: true } } },
    });
    if (!entry) throw new NotFoundException("Grade entry not found");

    const comment = await this.aiService.generateReportComment({
      firstName: entry.student.user.firstName,
      subject: entry.subject,
      marksObtained: Number(entry.marksObtained),
      maxMarks: Number(entry.maxMarks),
    });

    return this.prisma.gradeEntry.update({
      where: { id: gradeEntryId },
      data: { comments: comment },
    });
  }
}
