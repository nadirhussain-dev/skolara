import { Injectable, NotFoundException } from "@nestjs/common";
import type { UploadedFile } from "@skolara/types";
import { DocumentsService } from "../documents/documents.service";
import { PrismaService } from "../prisma/prisma.service";
import { reportCardDefinition, type ReportCardData } from "./report-card.template";

export interface GeneratedReportCard {
  studentId: string;
  studentName: string;
  file: UploadedFile;
}

@Injectable()
export class ReportCardsService {
  constructor(
    private prisma: PrismaService,
    private documents: DocumentsService,
  ) {}

  async forStudent(
    schoolId: string,
    studentId: string,
    term: string,
  ): Promise<GeneratedReportCard> {
    const data = await this.gather(schoolId, studentId, term);
    const file = await this.documents.renderAndStore(schoolId, reportCardDefinition(data));
    return { studentId, studentName: data.studentName, file };
  }

  /**
   * Generates a card for every student in the class who has marks this term.
   *
   * Sequential rather than parallel: a class of 40 rendering at once would
   * hold 40 PDFs in memory and fire 40 uploads, and end-of-term is exactly
   * when the API is busiest. Students with no marks are skipped rather than
   * given an empty card.
   */
  async forClass(
    schoolId: string,
    classId: string,
    term: string,
  ): Promise<GeneratedReportCard[]> {
    const studentsWithMarks = await this.prisma.gradeEntry.findMany({
      where: { schoolId, classId, term },
      select: { studentId: true },
      distinct: ["studentId"],
    });

    const cards: GeneratedReportCard[] = [];
    for (const { studentId } of studentsWithMarks) {
      cards.push(await this.forStudent(schoolId, studentId, term));
    }
    return cards;
  }

  private async gather(
    schoolId: string,
    studentId: string,
    term: string,
  ): Promise<ReportCardData> {
    const student = await this.prisma.studentProfile.findFirst({
      where: { id: studentId, schoolId },
      include: {
        user: { select: { firstName: true, lastName: true } },
        class: { select: { id: true, name: true, section: true } },
        school: { select: { name: true, primaryColor: true } },
      },
    });
    if (!student) throw new NotFoundException("Student not found");

    const grades = await this.prisma.gradeEntry.findMany({
      where: { schoolId, studentId, term },
      orderBy: { subject: "asc" },
    });
    if (grades.length === 0) {
      throw new NotFoundException(`No marks recorded for ${term}`);
    }

    const [attendanceRate, ranking] = await Promise.all([
      this.attendanceRate(schoolId, studentId),
      student.classId
        ? this.ranking(schoolId, student.classId, term, studentId)
        : Promise.resolve({ position: null, classSize: 0 }),
    ]);

    return {
      school: student.school,
      studentName: `${student.user.firstName} ${student.user.lastName}`,
      admissionNumber: student.admissionNumber,
      className: student.class
        ? `${student.class.name} ${student.class.section}`
        : "Unassigned",
      term,
      subjects: grades.map((grade) => ({
        subject: grade.subject,
        examType: grade.examType,
        marksObtained: Number(grade.marksObtained),
        maxMarks: Number(grade.maxMarks),
        comments: grade.comments,
      })),
      attendanceRate,
      position: ranking.position,
      classSize: ranking.classSize,
    };
  }

  private async attendanceRate(
    schoolId: string,
    studentId: string,
  ): Promise<number | null> {
    const records = await this.prisma.attendanceRecord.findMany({
      where: { schoolId, studentId },
      select: { status: true },
    });
    if (records.length === 0) return null;

    // LATE counts as attending — the student was there. Only ABSENT doesn't.
    const attended = records.filter((r) => r.status !== "ABSENT").length;
    return Math.round((attended / records.length) * 100);
  }

  /**
   * Position in class by total percentage across all subjects this term.
   *
   * Ranks only students who sat the same term, so a mid-year joiner doesn't
   * drag everyone down the list by having fewer papers.
   */
  private async ranking(
    schoolId: string,
    classId: string,
    term: string,
    studentId: string,
  ): Promise<{ position: number | null; classSize: number }> {
    const grades = await this.prisma.gradeEntry.findMany({
      where: { schoolId, classId, term },
      select: { studentId: true, marksObtained: true, maxMarks: true },
    });

    const totals = new Map<string, { obtained: number; max: number }>();
    for (const grade of grades) {
      const current = totals.get(grade.studentId) ?? { obtained: 0, max: 0 };
      totals.set(grade.studentId, {
        obtained: current.obtained + Number(grade.marksObtained),
        max: current.max + Number(grade.maxMarks),
      });
    }

    const ordered = [...totals.entries()]
      .map(([id, total]) => ({
        id,
        percent: total.max > 0 ? total.obtained / total.max : 0,
      }))
      .sort((a, b) => b.percent - a.percent);

    const index = ordered.findIndex((entry) => entry.id === studentId);
    return {
      position: index === -1 ? null : index + 1,
      classSize: ordered.length,
    };
  }
}
