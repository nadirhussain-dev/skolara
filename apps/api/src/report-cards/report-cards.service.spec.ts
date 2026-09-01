import { NotFoundException } from "@nestjs/common";
import { ReportCardsService } from "./report-cards.service";
import { gradeLetter } from "./report-card.template";
import type { DocumentsService } from "../documents/documents.service";
import type { PrismaService } from "../prisma/prisma.service";

const SCHOOL = "school-1";

function grade(studentId: string, obtained: number, max = 100, subject = "Maths") {
  return { studentId, subject, examType: "Final", marksObtained: obtained, maxMarks: max, comments: null };
}

describe("ReportCardsService", () => {
  let prisma: {
    studentProfile: { findFirst: jest.Mock };
    gradeEntry: { findMany: jest.Mock };
    attendanceRecord: { findMany: jest.Mock };
  };
  let documents: { renderAndStore: jest.Mock };
  let service: ReportCardsService;

  beforeEach(() => {
    prisma = {
      studentProfile: {
        findFirst: jest.fn().mockResolvedValue({
          id: "student-1",
          admissionNumber: "ADM-0001",
          classId: "class-a",
          user: { firstName: "Bilal", lastName: "Ahmed" },
          class: { id: "class-a", name: "Grade 9", section: "A" },
          school: { name: "Test School", primaryColor: "#6D28D9" },
        }),
      },
      gradeEntry: { findMany: jest.fn() },
      attendanceRecord: { findMany: jest.fn().mockResolvedValue([]) },
    };
    documents = {
      renderAndStore: jest.fn().mockResolvedValue({ url: "https://storage.test/card.pdf" }),
    };
    service = new ReportCardsService(
      prisma as unknown as PrismaService,
      documents as unknown as DocumentsService,
    );
  });

  /** The gather() path calls gradeEntry.findMany twice: own grades, then the class for ranking. */
  function withGrades(own: unknown[], classWide: unknown[] = own) {
    prisma.gradeEntry.findMany
      .mockResolvedValueOnce(own)
      .mockResolvedValueOnce(classWide);
  }

  it("renders and stores a card, returning the stored file", async () => {
    withGrades([grade("student-1", 82)]);
    const result = await service.forStudent(SCHOOL, "student-1", "Term 1");

    expect(result.studentName).toBe("Bilal Ahmed");
    expect(result.file.url).toBe("https://storage.test/card.pdf");
    expect(documents.renderAndStore).toHaveBeenCalledWith(SCHOOL, expect.anything());
  });

  it("refuses to produce an empty card when no marks exist for the term", async () => {
    prisma.gradeEntry.findMany.mockResolvedValueOnce([]);
    await expect(service.forStudent(SCHOOL, "student-1", "Term 1")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(documents.renderAndStore).not.toHaveBeenCalled();
  });

  it("rejects a student from another school", async () => {
    prisma.studentProfile.findFirst.mockResolvedValue(null);
    await expect(service.forStudent(SCHOOL, "student-1", "Term 1")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  describe("ranking", () => {
    it("ranks by total percentage across every subject, not by raw marks", async () => {
      // student-1 scores 90/100; student-2 scores 100/200 across two papers.
      // Raw totals would put student-2 first; percentage correctly puts them second.
      withGrades(
        [grade("student-1", 90)],
        [
          grade("student-1", 90),
          grade("student-2", 50, 100, "Maths"),
          grade("student-2", 50, 100, "Physics"),
        ],
      );

      await service.forStudent(SCHOOL, "student-1", "Term 1");
      const definition = documents.renderAndStore.mock.calls[0][1];
      expect(JSON.stringify(definition)).toContain("1 of 2");
    });

    it("reports no ranking for a student with no class", async () => {
      prisma.studentProfile.findFirst.mockResolvedValue({
        id: "student-1",
        admissionNumber: "ADM-0001",
        classId: null,
        user: { firstName: "Bilal", lastName: "Ahmed" },
        class: null,
        school: { name: "Test School", primaryColor: null },
      });
      prisma.gradeEntry.findMany.mockResolvedValueOnce([grade("student-1", 82)]);

      await service.forStudent(SCHOOL, "student-1", "Term 1");
      const definition = JSON.stringify(documents.renderAndStore.mock.calls[0][1]);
      expect(definition).toContain("Not ranked");
      expect(definition).toContain("Unassigned");
    });
  });

  describe("attendance", () => {
    it("counts LATE as attending — only ABSENT isn't", async () => {
      withGrades([grade("student-1", 82)]);
      prisma.attendanceRecord.findMany.mockResolvedValue([
        { status: "PRESENT" },
        { status: "LATE" },
        { status: "EXCUSED" },
        { status: "ABSENT" },
      ]);

      await service.forStudent(SCHOOL, "student-1", "Term 1");
      expect(JSON.stringify(documents.renderAndStore.mock.calls[0][1])).toContain("75%");
    });

    it("says not recorded rather than 0% when there are no records", async () => {
      withGrades([grade("student-1", 82)]);
      await service.forStudent(SCHOOL, "student-1", "Term 1");
      expect(JSON.stringify(documents.renderAndStore.mock.calls[0][1])).toContain("Not recorded");
    });
  });

  describe("forClass", () => {
    it("generates one card per student who has marks, skipping those who don't", async () => {
      prisma.gradeEntry.findMany.mockReset();
      prisma.gradeEntry.findMany
        .mockResolvedValueOnce([{ studentId: "student-1" }, { studentId: "student-2" }])
        .mockResolvedValue([grade("student-1", 82)]);

      const cards = await service.forClass(SCHOOL, "class-a", "Term 1");
      expect(cards).toHaveLength(2);
      expect(documents.renderAndStore).toHaveBeenCalledTimes(2);
    });
  });

  describe("gradeLetter", () => {
    it.each([
      [95, "A"], [80, "A"], [79, "B"], [70, "B"],
      [69, "C"], [60, "C"], [59, "D"], [50, "D"],
      [49, "E"], [40, "E"], [39, "F"], [0, "F"],
    ])("maps %i%% to %s", (percent, letter) => {
      expect(gradeLetter(percent)).toBe(letter);
    });
  });
});
