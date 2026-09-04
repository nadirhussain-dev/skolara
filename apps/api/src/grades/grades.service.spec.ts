import { GradesService } from "./grades.service";
import type { AiService } from "../ai/ai.service";
import type { PrismaService } from "../prisma/prisma.service";

const SCHOOL = "school-1";
const CLASS = "class-1";
const STUDENT = "student-1";

function entry(
  subject: string,
  term: string,
  examType: string,
  marksObtained: number,
  maxMarks: number,
  createdAt = new Date("2026-01-01"),
) {
  return { classId: CLASS, subject, term, examType, marksObtained, maxMarks, createdAt };
}

describe("GradesService.performanceForStudent", () => {
  let prisma: { gradeEntry: { findMany: jest.Mock } };
  let service: GradesService;

  /** First call is the student's own marks, second is the class cohort's. */
  function withData(own: unknown[], cohort: unknown[] = own) {
    prisma.gradeEntry.findMany
      .mockResolvedValueOnce(own)
      .mockResolvedValueOnce(cohort);
  }

  beforeEach(() => {
    prisma = { gradeEntry: { findMany: jest.fn() } };
    service = new GradesService(
      prisma as unknown as PrismaService,
      {} as unknown as AiService,
    );
  });

  it("plots percentages rather than raw marks", async () => {
    withData([
      entry("Maths", "Term 1", "Quiz 1", 45, 50),
      entry("Maths", "Term 1", "Mid-term", 68, 100),
    ]);

    const { subjects } = await service.performanceForStudent(SCHOOL, STUDENT);

    // 45/50 and 68/100 are 90% and 68% — not comparable as marks.
    expect(subjects[0].points.map((point) => point.percentage)).toEqual([90, 68]);
    expect(subjects[0].average).toBe(79);
  });

  it("keeps assessments in the order they were graded", async () => {
    withData([
      entry("Maths", "Term 1", "Quiz 1", 5, 10, new Date("2026-01-05")),
      entry("Maths", "Term 1", "Quiz 2", 9, 10, new Date("2026-02-05")),
    ]);

    const { subjects } = await service.performanceForStudent(SCHOOL, STUDENT);

    expect(subjects[0].points.map((point) => point.examType)).toEqual(["Quiz 1", "Quiz 2"]);
  });

  it("averages the class over the same assessment, not the whole subject", async () => {
    withData(
      [entry("Maths", "Term 1", "Quiz 1", 8, 10)],
      [
        entry("Maths", "Term 1", "Quiz 1", 8, 10),
        entry("Maths", "Term 1", "Quiz 1", 4, 10),
        // A different assessment in the same subject must not move Quiz 1's bar.
        entry("Maths", "Term 1", "Quiz 2", 10, 10),
      ],
    );

    const { subjects } = await service.performanceForStudent(SCHOOL, STUDENT);

    expect(subjects[0].points[0].classAveragePercentage).toBe(60);
  });

  it("groups by subject, alphabetically", async () => {
    withData([
      entry("Physics", "Term 1", "Quiz 1", 5, 10),
      entry("Maths", "Term 1", "Quiz 1", 5, 10),
    ]);

    const { subjects } = await service.performanceForStudent(SCHOOL, STUDENT);

    expect(subjects.map((subject) => subject.subject)).toEqual(["Maths", "Physics"]);
  });

  it("averages across every subject for the headline figure", async () => {
    withData([
      entry("Maths", "Term 1", "Quiz 1", 10, 10),
      entry("Physics", "Term 1", "Quiz 1", 6, 10),
    ]);

    const { overallAverage } = await service.performanceForStudent(SCHOOL, STUDENT);

    expect(overallAverage).toBe(80);
  });

  it("skips a zero-mark assessment rather than charting it as a fail", async () => {
    withData([
      entry("Maths", "Term 1", "Ungraded", 0, 0),
      entry("Maths", "Term 1", "Quiz 1", 7, 10),
    ]);

    const { subjects } = await service.performanceForStudent(SCHOOL, STUDENT);

    expect(subjects[0].points).toHaveLength(1);
    expect(subjects[0].points[0].percentage).toBe(70);
  });

  it("returns an empty shape for a student with no marks", async () => {
    prisma.gradeEntry.findMany.mockResolvedValueOnce([]);

    await expect(service.performanceForStudent(SCHOOL, STUDENT)).resolves.toEqual({
      studentId: STUDENT,
      subjects: [],
      overallAverage: null,
    });
    // No cohort query when there is nothing to compare.
    expect(prisma.gradeEntry.findMany).toHaveBeenCalledTimes(1);
  });

  it("scopes both queries to the caller's school", async () => {
    withData([entry("Maths", "Term 1", "Quiz 1", 5, 10)]);

    await service.performanceForStudent(SCHOOL, STUDENT);

    for (const call of prisma.gradeEntry.findMany.mock.calls) {
      expect(call[0].where.schoolId).toBe(SCHOOL);
    }
  });

  it("filters to one subject when asked", async () => {
    withData([entry("Maths", "Term 1", "Quiz 1", 5, 10)]);

    await service.performanceForStudent(SCHOOL, STUDENT, "Maths");

    expect(prisma.gradeEntry.findMany.mock.calls[0][0].where.subject).toBe("Maths");
  });

  it("rounds to one decimal place rather than reporting false precision", async () => {
    withData([entry("Maths", "Term 1", "Quiz 1", 2, 3)]);

    const { subjects } = await service.performanceForStudent(SCHOOL, STUDENT);

    expect(subjects[0].points[0].percentage).toBe(66.7);
  });
});
