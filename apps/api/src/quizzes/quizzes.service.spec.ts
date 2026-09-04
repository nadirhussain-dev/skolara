import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { QuizzesService } from "./quizzes.service";
import type { PrismaService } from "../prisma/prisma.service";

const SCHOOL = "school-1";
const CLASS = "class-1";
const TEACHER = "teacher-1";
const STUDENT_USER = "student-user-1";
const STUDENT = "student-1";
const QUIZ = "quiz-1";
const ATTEMPT = "attempt-1";

const questions = [
  { id: "q1", prompt: "2 + 2?", options: ["3", "4"], correctIndex: 1, marks: 2, sortOrder: 0 },
  { id: "q2", prompt: "Capital?", options: ["Lahore", "Islamabad"], correctIndex: 1, marks: 3, sortOrder: 1 },
];

const publishedQuiz = {
  id: QUIZ,
  schoolId: SCHOOL,
  classId: CLASS,
  subject: "Maths",
  title: "Unit 1 quiz",
  maxAttempts: 1,
  timeLimitMinutes: 10,
  opensAt: null,
  closesAt: null,
  publishedAt: new Date("2026-01-01"),
  gradeTerm: null,
  gradeExamType: null,
  createdByUserId: TEACHER,
};

describe("QuizzesService", () => {
  let prisma: {
    quiz: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    quizQuestion: { findFirst: jest.Mock; findMany: jest.Mock; deleteMany: jest.Mock; createMany: jest.Mock };
    quizAttempt: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
    };
    quizAnswer: { upsert: jest.Mock; update: jest.Mock };
    gradeEntry: { upsert: jest.Mock };
    schoolClass: { findFirst: jest.Mock };
    studentProfile: { findFirst: jest.Mock; findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: QuizzesService;

  /** An attempt with two saved answers, one right and one wrong. */
  function attemptWithAnswers(
    overrides: Partial<{ status: string; expiresAt: Date | null }> = {},
    answers: {
      id: string;
      questionId: string;
      selectedIndex: number;
      isCorrect?: boolean;
      marksAwarded?: number;
    }[] = [
      { id: "a1", questionId: "q1", selectedIndex: 1 },
      { id: "a2", questionId: "q2", selectedIndex: 0 },
    ],
  ) {
    return {
      id: ATTEMPT,
      schoolId: SCHOOL,
      quizId: QUIZ,
      studentId: STUDENT,
      attemptNumber: 1,
      status: "IN_PROGRESS",
      startedAt: new Date(),
      expiresAt: null,
      submittedAt: null,
      score: null,
      maxScore: null,
      quiz: { ...publishedQuiz, questions },
      answers,
      ...overrides,
    };
  }

  beforeEach(() => {
    prisma = {
      quiz: {
        create: jest.fn().mockResolvedValue({ id: QUIZ }),
        findFirst: jest.fn().mockResolvedValue(publishedQuiz),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn().mockResolvedValue(publishedQuiz),
        update: jest.fn().mockResolvedValue(publishedQuiz),
        delete: jest.fn(),
      },
      quizQuestion: {
        findFirst: jest.fn().mockResolvedValue({ id: "q1", options: ["3", "4"] }),
        findMany: jest.fn().mockResolvedValue(questions),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      quizAttempt: {
        create: jest.fn().mockResolvedValue({ id: ATTEMPT }),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        findUniqueOrThrow: jest.fn().mockResolvedValue(attemptWithAnswers()),
        update: jest.fn(),
      },
      quizAnswer: { upsert: jest.fn(), update: jest.fn() },
      gradeEntry: { upsert: jest.fn() },
      schoolClass: { findFirst: jest.fn().mockResolvedValue({ id: CLASS }) },
      studentProfile: {
        findFirst: jest.fn().mockResolvedValue({ id: STUDENT, classId: CLASS }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn().mockImplementation(async (arg) =>
        typeof arg === "function" ? arg(prisma) : Promise.all(arg),
      ),
    };
    service = new QuizzesService(prisma as unknown as PrismaService);
  });

  describe("create", () => {
    it("numbers questions by their position in the payload", async () => {
      await service.create(SCHOOL, TEACHER, {
        classId: CLASS,
        subject: "Maths",
        title: "Unit 1",
        questions: [
          { prompt: "a", options: ["x", "y"], correctIndex: 0, marks: 1 },
          { prompt: "b", options: ["x", "y"], correctIndex: 1, marks: 2 },
        ],
      });

      const created = prisma.quiz.create.mock.calls[0][0].data;
      expect(created.questions.create.map((q: { sortOrder: number }) => q.sortOrder)).toEqual([0, 1]);
      expect(created.publishedAt).toBeUndefined();
    });

    it("refuses a class in another school", async () => {
      prisma.schoolClass.findFirst.mockResolvedValue(null);

      await expect(
        service.create(SCHOOL, TEACHER, {
          classId: CLASS,
          subject: "Maths",
          title: "Unit 1",
          maxAttempts: 1,
          questions: [{ prompt: "a", options: ["x", "y"], correctIndex: 0, marks: 1 }],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("replaceQuestions", () => {
    it("refuses to rewrite a published paper", async () => {
      await expect(
        service.replaceQuestions(SCHOOL, QUIZ, {
          questions: [{ prompt: "a", options: ["x", "y"], correctIndex: 0, marks: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.quizQuestion.deleteMany).not.toHaveBeenCalled();
    });

    it("allows it while the quiz is a draft", async () => {
      prisma.quiz.findFirst.mockResolvedValue({ ...publishedQuiz, publishedAt: null });

      await service.replaceQuestions(SCHOOL, QUIZ, {
        questions: [{ prompt: "a", options: ["x", "y"], correctIndex: 0, marks: 1 }],
      });

      expect(prisma.quizQuestion.deleteMany).toHaveBeenCalledWith({ where: { quizId: QUIZ } });
      expect(prisma.quizQuestion.createMany).toHaveBeenCalled();
    });
  });

  describe("publish", () => {
    it("refuses a paper with no questions", async () => {
      prisma.quiz.findFirst.mockResolvedValue({
        ...publishedQuiz,
        publishedAt: null,
        _count: { questions: 0 },
      });

      await expect(service.publish(SCHOOL, QUIZ)).rejects.toThrow(BadRequestException);
    });

    it("is idempotent once published", async () => {
      prisma.quiz.findFirst.mockResolvedValue({ ...publishedQuiz, _count: { questions: 2 } });

      await service.publish(SCHOOL, QUIZ);

      expect(prisma.quiz.update).not.toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("refuses once students have sat it", async () => {
      prisma.quiz.findFirst.mockResolvedValue({ ...publishedQuiz, _count: { attempts: 3 } });

      await expect(service.remove(SCHOOL, QUIZ)).rejects.toThrow(BadRequestException);
      expect(prisma.quiz.delete).not.toHaveBeenCalled();
    });
  });

  describe("startAttempt", () => {
    it("fixes the deadline from the time limit at the moment it starts", async () => {
      const before = Date.now();
      await service.startAttempt(SCHOOL, QUIZ, STUDENT_USER);

      const { expiresAt } = prisma.quizAttempt.create.mock.calls[0][0].data;
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + 10 * 60_000);
      expect(expiresAt.getTime()).toBeLessThan(before + 11 * 60_000);
    });

    it("leaves the deadline unset on an untimed quiz", async () => {
      prisma.quiz.findFirst.mockResolvedValue({ ...publishedQuiz, timeLimitMinutes: null });

      await service.startAttempt(SCHOOL, QUIZ, STUDENT_USER);

      expect(prisma.quizAttempt.create.mock.calls[0][0].data.expiresAt).toBeNull();
    });

    it("refuses a quiz set for another class", async () => {
      prisma.studentProfile.findFirst.mockResolvedValue({ id: STUDENT, classId: "class-2" });

      await expect(service.startAttempt(SCHOOL, QUIZ, STUDENT_USER)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("refuses a quiz that has closed", async () => {
      prisma.quiz.findFirst.mockResolvedValue({
        ...publishedQuiz,
        closesAt: new Date(Date.now() - 1000),
      });

      await expect(service.startAttempt(SCHOOL, QUIZ, STUDENT_USER)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("refuses a quiz that hasn't opened", async () => {
      prisma.quiz.findFirst.mockResolvedValue({
        ...publishedQuiz,
        opensAt: new Date(Date.now() + 60_000),
      });

      await expect(service.startAttempt(SCHOOL, QUIZ, STUDENT_USER)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("resumes an attempt still in progress rather than opening a second", async () => {
      prisma.quizAttempt.findMany.mockResolvedValue([
        { id: ATTEMPT, attemptNumber: 1, status: "IN_PROGRESS", expiresAt: null },
      ]);

      await service.startAttempt(SCHOOL, QUIZ, STUDENT_USER);

      expect(prisma.quizAttempt.create).not.toHaveBeenCalled();
    });

    it("refuses once the attempt allowance is spent", async () => {
      prisma.quizAttempt.findMany.mockResolvedValue([
        { id: ATTEMPT, attemptNumber: 1, status: "SUBMITTED", expiresAt: null },
      ]);

      await expect(service.startAttempt(SCHOOL, QUIZ, STUDENT_USER)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("counts an attempt that just ran out of time against the allowance", async () => {
      prisma.quizAttempt.findMany.mockResolvedValue([
        {
          id: ATTEMPT,
          attemptNumber: 1,
          status: "IN_PROGRESS",
          expiresAt: new Date(Date.now() - 60_000),
        },
      ]);

      // Running out of time is a sitting, not a free retry.
      await expect(service.startAttempt(SCHOOL, QUIZ, STUDENT_USER)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.quizAttempt.create).not.toHaveBeenCalled();
    });

    it("refuses an account with no student record", async () => {
      prisma.studentProfile.findFirst.mockResolvedValue(null);

      await expect(service.startAttempt(SCHOOL, QUIZ, STUDENT_USER)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("attemptPaper", () => {
    it("never carries the answer key", async () => {
      const paper = await service.attemptPaper(ATTEMPT);

      for (const question of paper.questions) {
        expect(question).not.toHaveProperty("correctIndex");
      }
    });

    it("returns the student's own selections without saying whether they're right", async () => {
      const paper = await service.attemptPaper(ATTEMPT);

      expect(paper.answers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ questionId: "q1", selectedIndex: 1 }),
          expect.objectContaining({ questionId: "q2", selectedIndex: 0 }),
        ]),
      );
      // The query selects only the two fields above, so correctness can't leak
      // back to a student still working on the paper.
      for (const answer of paper.answers as Record<string, unknown>[]) {
        expect(answer).not.toHaveProperty("isCorrect");
        expect(answer).not.toHaveProperty("marksAwarded");
      }
    });
  });

  describe("saveAnswer", () => {
    beforeEach(() => {
      prisma.quizAttempt.findFirst.mockResolvedValue({
        id: ATTEMPT,
        quizId: QUIZ,
        status: "IN_PROGRESS",
        expiresAt: null,
      });
    });

    it("saves a selection as it is made", async () => {
      await service.saveAnswer(SCHOOL, ATTEMPT, STUDENT_USER, {
        questionId: "q1",
        selectedIndex: 1,
      });

      expect(prisma.quizAnswer.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { attemptId_questionId: { attemptId: ATTEMPT, questionId: "q1" } },
        }),
      );
    });

    it("refuses a selection past the end of the option list", async () => {
      await expect(
        service.saveAnswer(SCHOOL, ATTEMPT, STUDENT_USER, { questionId: "q1", selectedIndex: 5 }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.quizAnswer.upsert).not.toHaveBeenCalled();
    });

    it("refuses a question from another quiz", async () => {
      prisma.quizQuestion.findFirst.mockResolvedValue(null);

      await expect(
        service.saveAnswer(SCHOOL, ATTEMPT, STUDENT_USER, { questionId: "q9", selectedIndex: 0 }),
      ).rejects.toThrow(NotFoundException);
    });

    it("refuses once the clock has run out, and settles the attempt", async () => {
      prisma.quizAttempt.findFirst.mockResolvedValue({
        id: ATTEMPT,
        quizId: QUIZ,
        status: "IN_PROGRESS",
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        service.saveAnswer(SCHOOL, ATTEMPT, STUDENT_USER, { questionId: "q1", selectedIndex: 0 }),
      ).rejects.toThrow(BadRequestException);
      // Graded on the way past, so the score reflects what arrived in time.
      expect(prisma.quizAttempt.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: "EXPIRED" }) }),
      );
    });

    it("refuses an attempt belonging to another student", async () => {
      prisma.quizAttempt.findFirst.mockResolvedValue(null);

      await expect(
        service.saveAnswer(SCHOOL, ATTEMPT, STUDENT_USER, { questionId: "q1", selectedIndex: 0 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("grading", () => {
    beforeEach(() => {
      prisma.quizAttempt.findFirst.mockResolvedValue({
        id: ATTEMPT,
        quizId: QUIZ,
        status: "IN_PROGRESS",
        expiresAt: null,
      });
    });

    it("awards the question's marks for a correct choice and nothing for a wrong one", async () => {
      prisma.quizAttempt.findUniqueOrThrow
        .mockResolvedValueOnce(attemptWithAnswers())
        .mockResolvedValue(attemptWithAnswers({ status: "SUBMITTED" }));

      await service.submitAttempt(SCHOOL, ATTEMPT, STUDENT_USER);

      // q1 right (2 marks), q2 wrong (0) out of a 5-mark paper.
      expect(prisma.quizAttempt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "SUBMITTED", score: 2, maxScore: 5 }),
        }),
      );
      expect(prisma.quizAnswer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "a1" },
          data: { isCorrect: true, marksAwarded: 2 },
        }),
      );
      expect(prisma.quizAnswer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "a2" },
          data: { isCorrect: false, marksAwarded: 0 },
        }),
      );
    });

    it("scores an unanswered question as zero without inventing an answer row", async () => {
      prisma.quizAttempt.findUniqueOrThrow
        .mockResolvedValueOnce(
          attemptWithAnswers({}, [{ id: "a2", questionId: "q2", selectedIndex: 1 }]),
        )
        .mockResolvedValue(attemptWithAnswers({ status: "SUBMITTED" }));

      await service.submitAttempt(SCHOOL, ATTEMPT, STUDENT_USER);

      // Only q2 answered, and correctly: 3 of 5.
      expect(prisma.quizAttempt.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ score: 3, maxScore: 5 }) }),
      );
      expect(prisma.quizAnswer.update).toHaveBeenCalledTimes(1);
    });

    it("stays out of the gradebook when the quiz names no term", async () => {
      prisma.quizAttempt.findUniqueOrThrow
        .mockResolvedValueOnce(attemptWithAnswers())
        .mockResolvedValue(attemptWithAnswers({ status: "SUBMITTED" }));

      await service.submitAttempt(SCHOOL, ATTEMPT, STUDENT_USER);

      expect(prisma.gradeEntry.upsert).not.toHaveBeenCalled();
    });

    it("writes the best settled attempt into the gradebook when it names one", async () => {
      prisma.quiz.findUniqueOrThrow.mockResolvedValue({
        ...publishedQuiz,
        gradeTerm: "Term 1",
        gradeExamType: "Unit 1 quiz",
      });
      prisma.quizAttempt.findUniqueOrThrow
        .mockResolvedValueOnce(attemptWithAnswers())
        .mockResolvedValue(attemptWithAnswers({ status: "SUBMITTED" }));
      // An earlier, better sitting — a retake must not be able to lower a mark.
      prisma.quizAttempt.findFirst.mockImplementation((args: { orderBy?: unknown }) =>
        args.orderBy
          ? Promise.resolve({ id: "attempt-0", score: 5, maxScore: 5 })
          : Promise.resolve({ id: ATTEMPT, quizId: QUIZ, status: "IN_PROGRESS", expiresAt: null }),
      );

      await service.submitAttempt(SCHOOL, ATTEMPT, STUDENT_USER);

      expect(prisma.gradeEntry.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            studentId_subject_term_examType: {
              studentId: STUDENT,
              subject: "Maths",
              term: "Term 1",
              examType: "Unit 1 quiz",
            },
          },
          create: expect.objectContaining({
            marksObtained: 5,
            maxMarks: 5,
            gradedByUserId: TEACHER,
          }),
        }),
      );
    });

    it("refuses to submit an attempt twice", async () => {
      prisma.quizAttempt.findFirst.mockResolvedValue({
        id: ATTEMPT,
        quizId: QUIZ,
        status: "SUBMITTED",
        expiresAt: null,
      });

      await expect(service.submitAttempt(SCHOOL, ATTEMPT, STUDENT_USER)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("returns the marked paper for a submit that lost the race with the clock", async () => {
      prisma.quizAttempt.findFirst.mockResolvedValue({
        id: ATTEMPT,
        quizId: QUIZ,
        status: "IN_PROGRESS",
        expiresAt: new Date(Date.now() - 1000),
      });
      prisma.quizAttempt.findUniqueOrThrow
        .mockResolvedValueOnce(attemptWithAnswers())
        .mockResolvedValue(
          attemptWithAnswers({ status: "EXPIRED" }, [
            { id: "a1", questionId: "q1", selectedIndex: 1, isCorrect: true, marksAwarded: 2 },
          ]),
        );

      const result = await service.submitAttempt(SCHOOL, ATTEMPT, STUDENT_USER);

      expect(result.status).toBe("EXPIRED");
      expect(result.questions[0]).toEqual(
        expect.objectContaining({ correctIndex: 1, selectedIndex: 1, isCorrect: true }),
      );
    });
  });

  describe("attemptResult", () => {
    it("refuses to release the answer key while the paper is still open", async () => {
      prisma.quizAttempt.findUniqueOrThrow.mockResolvedValue(attemptWithAnswers());

      await expect(service.attemptResult(ATTEMPT)).rejects.toThrow(BadRequestException);
    });

    it("marks an unanswered question as wrong and worth nothing", async () => {
      prisma.quizAttempt.findUniqueOrThrow.mockResolvedValue(
        attemptWithAnswers({ status: "SUBMITTED" }, []),
      );

      const result = await service.attemptResult(ATTEMPT);

      expect(result.questions).toHaveLength(2);
      expect(result.questions.every((q) => q.selectedIndex === null && !q.isCorrect)).toBe(true);
      expect(result.questions.every((q) => q.marksAwarded === 0)).toBe(true);
    });
  });

  describe("findForStudent", () => {
    it("only offers published quizzes for the student's own class", async () => {
      await service.findForStudent(SCHOOL, STUDENT);

      expect(prisma.quiz.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { schoolId: SCHOOL, classId: CLASS, publishedAt: { not: null } },
        }),
      );
    });

    it("marks a quiz unavailable once the allowance is used", async () => {
      prisma.quiz.findMany.mockResolvedValue([
        {
          ...publishedQuiz,
          _count: { questions: 2 },
          questions: [{ marks: 2 }, { marks: 3 }],
          attempts: [{ id: ATTEMPT, attemptNumber: 1, status: "SUBMITTED", score: 2, maxScore: 5 }],
        },
      ]);

      const [quiz] = await service.findForStudent(SCHOOL, STUDENT);

      expect(quiz.totalMarks).toBe(5);
      expect(quiz.isOpen).toBe(true);
      expect(quiz.canAttempt).toBe(false);
    });

    it("returns nothing for a student not yet placed in a class", async () => {
      prisma.studentProfile.findFirst.mockResolvedValue({ id: STUDENT, classId: null });

      await expect(service.findForStudent(SCHOOL, STUDENT)).resolves.toEqual([]);
    });
  });

  describe("results", () => {
    it("lists every student in the class, including those who never sat it", async () => {
      prisma.studentProfile.findMany.mockResolvedValue([
        { id: STUDENT, admissionNumber: "A1", user: { firstName: "Ayesha", lastName: "Khan" } },
        { id: "student-2", admissionNumber: "A2", user: { firstName: "Bilal", lastName: "Ahmed" } },
      ]);
      prisma.quizAttempt.findMany.mockResolvedValue([
        { studentId: STUDENT, attemptNumber: 1, status: "SUBMITTED", score: 2 },
        { studentId: STUDENT, attemptNumber: 2, status: "SUBMITTED", score: 4 },
      ]);

      const { rows, maxScore } = await service.results(SCHOOL, QUIZ);

      expect(maxScore).toBe(5);
      expect(rows).toHaveLength(2);
      // Best of the two sittings, as a percentage of the paper.
      expect(rows[0]).toEqual(
        expect.objectContaining({ attemptCount: 2, bestScore: 4, percentage: 80 }),
      );
      expect(rows[1]).toEqual(
        expect.objectContaining({ attemptCount: 0, bestScore: null, percentage: null }),
      );
    });
  });
});
