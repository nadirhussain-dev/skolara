import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  CreateQuizInput,
  QuizAttemptStatus,
  QuizQuestionForStudent,
  ReplaceQuizQuestionsInput,
  SaveQuizAnswerInput,
} from "@skolara/types";
import { PrismaService } from "../prisma/prisma.service";

const QUESTION_ORDER = { sortOrder: "asc" } as const;

/** The three fields expiry needs, so it works on any shape that carries them. */
interface SettleableAttempt {
  id: string;
  status: QuizAttemptStatus;
  expiresAt: Date | null;
}

@Injectable()
export class QuizzesService {
  constructor(private prisma: PrismaService) {}

  // ---------- authoring ----------

  async create(schoolId: string, createdByUserId: string, input: CreateQuizInput) {
    const schoolClass = await this.prisma.schoolClass.findFirst({
      where: { id: input.classId, schoolId },
      select: { id: true },
    });
    if (!schoolClass) throw new NotFoundException("Class not found");

    try {
      return await this.prisma.quiz.create({
        data: {
          schoolId,
          classId: input.classId,
          subject: input.subject,
          title: input.title,
          instructions: input.instructions ?? null,
          timeLimitMinutes: input.timeLimitMinutes ?? null,
          opensAt: input.opensAt ?? null,
          closesAt: input.closesAt ?? null,
          maxAttempts: input.maxAttempts ?? 1,
          gradeTerm: input.gradeTerm ?? null,
          gradeExamType: input.gradeExamType ?? null,
          createdByUserId,
          questions: {
            create: input.questions.map((question, index) => ({
              prompt: question.prompt,
              options: question.options,
              correctIndex: question.correctIndex,
              marks: question.marks ?? 1,
              sortOrder: index,
            })),
          },
        },
        include: { questions: { orderBy: QUESTION_ORDER } },
      });
    } catch (error) {
      throw this.translateGradebookClash(error);
    }
  }

  /**
   * Questions can only change while the quiz is a draft. Editing a paper
   * students have already sat would silently regrade their attempts against
   * questions they never saw.
   */
  async replaceQuestions(
    schoolId: string,
    quizId: string,
    input: ReplaceQuizQuestionsInput,
  ) {
    const quiz = await this.findOwn(schoolId, quizId);
    if (quiz.publishedAt) {
      throw new BadRequestException("A published quiz's questions can't be changed");
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.quizQuestion.deleteMany({ where: { quizId } });
      await tx.quizQuestion.createMany({
        data: input.questions.map((question, index) => ({
          quizId,
          prompt: question.prompt,
          options: question.options,
          correctIndex: question.correctIndex,
          marks: question.marks ?? 1,
          sortOrder: index,
        })),
      });
      return tx.quiz.findUniqueOrThrow({
        where: { id: quizId },
        include: { questions: { orderBy: QUESTION_ORDER } },
      });
    });
  }

  async publish(schoolId: string, quizId: string) {
    const quiz = await this.prisma.quiz.findFirst({
      where: { id: quizId, schoolId },
      include: { _count: { select: { questions: true } } },
    });
    if (!quiz) throw new NotFoundException("Quiz not found");
    if (quiz._count.questions === 0) {
      throw new BadRequestException("Add at least one question before publishing");
    }
    if (quiz.publishedAt) return quiz;

    return this.prisma.quiz.update({
      where: { id: quizId },
      data: { publishedAt: new Date() },
      include: { questions: { orderBy: QUESTION_ORDER } },
    });
  }

  /** Removal is only safe while nobody has sat it — attempts are results. */
  async remove(schoolId: string, quizId: string) {
    const quiz = await this.prisma.quiz.findFirst({
      where: { id: quizId, schoolId },
      include: { _count: { select: { attempts: true } } },
    });
    if (!quiz) throw new NotFoundException("Quiz not found");
    if (quiz._count.attempts > 0) {
      throw new BadRequestException(
        "Students have already sat this quiz — it can't be deleted",
      );
    }
    await this.prisma.quiz.delete({ where: { id: quizId } });
  }

  // ---------- staff reads ----------

  findForClass(schoolId: string, classId: string, subject?: string) {
    return this.prisma.quiz.findMany({
      where: { schoolId, classId, ...(subject ? { subject } : {}) },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { questions: true, attempts: true } },
        class: { select: { id: true, name: true, section: true } },
      },
    });
  }

  /** The full paper including the answer key — staff only. */
  async findOne(schoolId: string, quizId: string) {
    const quiz = await this.prisma.quiz.findFirst({
      where: { id: quizId, schoolId },
      include: {
        questions: { orderBy: QUESTION_ORDER },
        class: { select: { id: true, name: true, section: true } },
        _count: { select: { attempts: true } },
      },
    });
    if (!quiz) throw new NotFoundException("Quiz not found");
    return quiz;
  }

  /**
   * One row per student in the class, whether or not they sat it — a results
   * table that hides the students who didn't turn up isn't much use to a
   * teacher chasing them.
   */
  async results(schoolId: string, quizId: string) {
    const quiz = await this.findOwn(schoolId, quizId);
    const [students, attempts] = await Promise.all([
      this.prisma.studentProfile.findMany({
        where: { schoolId, classId: quiz.classId },
        select: {
          id: true,
          admissionNumber: true,
          user: { select: { firstName: true, lastName: true } },
        },
        orderBy: { admissionNumber: "asc" },
      }),
      this.prisma.quizAttempt.findMany({
        where: { quizId },
        orderBy: { attemptNumber: "asc" },
      }),
    ]);

    const maxScore = await this.totalMarks(quizId);

    return {
      quizId,
      maxScore,
      rows: students.map((student) => {
        const own = attempts.filter((attempt) => attempt.studentId === student.id);
        const graded = own.filter((attempt) => attempt.score !== null);
        const best = graded.reduce<(typeof graded)[number] | undefined>(
          (winner, attempt) =>
            !winner || Number(attempt.score) > Number(winner.score) ? attempt : winner,
          undefined,
        );
        return {
          student,
          attemptCount: own.length,
          bestScore: best ? Number(best.score) : null,
          percentage:
            best && maxScore > 0 ? Math.round((Number(best.score) / maxScore) * 1000) / 10 : null,
          lastStatus: own.at(-1)?.status ?? null,
        };
      }),
    };
  }

  // ---------- student reads ----------

  /**
   * What a student can see: published quizzes for their class, each with their
   * own attempt history. Never carries the answer key.
   */
  async findForStudent(schoolId: string, studentId: string) {
    const student = await this.prisma.studentProfile.findFirst({
      where: { id: studentId, schoolId },
      select: { classId: true },
    });
    if (!student) throw new NotFoundException("Student not found");
    if (!student.classId) return [];

    const quizzes = await this.prisma.quiz.findMany({
      where: { schoolId, classId: student.classId, publishedAt: { not: null } },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { questions: true } },
        questions: { select: { marks: true } },
        attempts: {
          where: { studentId },
          orderBy: { attemptNumber: "asc" },
          select: {
            id: true,
            attemptNumber: true,
            status: true,
            startedAt: true,
            expiresAt: true,
            submittedAt: true,
            score: true,
            maxScore: true,
          },
        },
      },
    });

    const now = new Date();
    return quizzes.map(({ questions, ...quiz }) => {
      const attempts = quiz.attempts.map((attempt) => ({
        ...attempt,
        score: attempt.score === null ? null : Number(attempt.score),
        maxScore: attempt.maxScore === null ? null : Number(attempt.maxScore),
      }));
      const open =
        (!quiz.opensAt || quiz.opensAt <= now) && (!quiz.closesAt || quiz.closesAt > now);
      return {
        ...quiz,
        attempts,
        totalMarks: questions.reduce((sum, question) => sum + Number(question.marks), 0),
        isOpen: open,
        // The single answer the app actually needs: can this student start now?
        canAttempt: open && attempts.length < quiz.maxAttempts,
      };
    });
  }

  // ---------- sitting a quiz ----------

  /**
   * Starts the next attempt, or hands back the one already in progress so a
   * student who closed the app doesn't lose the paper.
   */
  async startAttempt(schoolId: string, quizId: string, studentUserId: string) {
    const student = await this.resolveOwnStudent(schoolId, studentUserId);
    const quiz = await this.prisma.quiz.findFirst({
      where: { id: quizId, schoolId, publishedAt: { not: null } },
    });
    if (!quiz) throw new NotFoundException("Quiz not found");
    if (quiz.classId !== student.classId) {
      throw new ForbiddenException("That quiz isn't set for your class");
    }

    const now = new Date();
    if (quiz.opensAt && quiz.opensAt > now) {
      throw new BadRequestException("That quiz hasn't opened yet");
    }
    if (quiz.closesAt && quiz.closesAt <= now) {
      throw new BadRequestException("That quiz has closed");
    }

    const existing = await this.prisma.quizAttempt.findMany({
      where: { quizId, studentId: student.id },
      orderBy: { attemptNumber: "asc" },
    });

    const inProgress = existing.find((attempt) => attempt.status === "IN_PROGRESS");
    if (inProgress) {
      // Resuming rather than starting fresh: the deadline was fixed when the
      // paper opened, so reopening it can't buy more time.
      const settled = await this.finalizeIfExpired(inProgress);
      if (settled.status === "IN_PROGRESS") return this.attemptPaper(settled.id);
    }

    // Every attempt counts against the allowance, including one that just
    // expired above — running out of time is a sitting, not a free retry.
    if (existing.length >= quiz.maxAttempts) {
      throw new BadRequestException(
        quiz.maxAttempts === 1
          ? "You've already sat this quiz"
          : `You've used all ${quiz.maxAttempts} attempts`,
      );
    }

    const attemptNumber = (existing.at(-1)?.attemptNumber ?? 0) + 1;
    const expiresAt = quiz.timeLimitMinutes
      ? new Date(now.getTime() + quiz.timeLimitMinutes * 60_000)
      : null;

    try {
      const attempt = await this.prisma.quizAttempt.create({
        data: {
          schoolId,
          quizId,
          studentId: student.id,
          attemptNumber,
          expiresAt,
        },
      });
      return this.attemptPaper(attempt.id);
    } catch (error) {
      // The unique index on (quiz, student, attemptNumber) turned a double tap
      // into a losing race rather than two open papers.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("That attempt is already open — reload and continue it");
      }
      throw error;
    }
  }

  /** The paper as the student sees it: questions, their saved answers, deadline. */
  async attemptPaper(attemptId: string) {
    const attempt = await this.prisma.quizAttempt.findUniqueOrThrow({
      where: { id: attemptId },
      include: {
        quiz: { include: { questions: { orderBy: QUESTION_ORDER } } },
        answers: { select: { questionId: true, selectedIndex: true } },
      },
    });

    const { quiz, answers, ...rest } = attempt;
    const { questions, ...quizWithoutQuestions } = quiz;

    return {
      ...rest,
      score: rest.score === null ? null : Number(rest.score),
      maxScore: rest.maxScore === null ? null : Number(rest.maxScore),
      quiz: quizWithoutQuestions,
      // `correctIndex` is dropped by construction rather than nulled out.
      questions: questions.map(
        ({ correctIndex: _correctIndex, ...question }): QuizQuestionForStudent => ({
          ...question,
          marks: Number(question.marks),
        }),
      ),
      // Only the student's own selections come back — never whether they were
      // right, which is only known once the paper is submitted.
      answers,
    };
  }

  async saveAnswer(
    schoolId: string,
    attemptId: string,
    studentUserId: string,
    input: SaveQuizAnswerInput,
  ) {
    const attempt = await this.ownAttempt(schoolId, attemptId, studentUserId);
    const settled = await this.finalizeIfExpired(attempt);
    if (settled.status !== "IN_PROGRESS") {
      throw new BadRequestException(
        settled.status === "EXPIRED" ? "Time is up on that attempt" : "That attempt is submitted",
      );
    }

    const question = await this.prisma.quizQuestion.findFirst({
      where: { id: input.questionId, quizId: attempt.quizId },
      select: { id: true, options: true },
    });
    if (!question) throw new NotFoundException("Question not found on this quiz");
    if (input.selectedIndex >= question.options.length) {
      throw new BadRequestException("That option doesn't exist on this question");
    }

    // Answers are saved as they're chosen, not posted in one lump at the end.
    // That's what makes a timed paper survive a dead battery: the attempt is
    // graded on whatever reached the server before the deadline.
    await this.prisma.quizAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId: input.questionId } },
      create: { attemptId, questionId: input.questionId, selectedIndex: input.selectedIndex },
      update: { selectedIndex: input.selectedIndex, answeredAt: new Date() },
    });

    return { saved: true as const, questionId: input.questionId };
  }

  async submitAttempt(schoolId: string, attemptId: string, studentUserId: string) {
    const attempt = await this.ownAttempt(schoolId, attemptId, studentUserId);
    const settled = await this.finalizeIfExpired(attempt);
    if (settled.status === "SUBMITTED") {
      throw new BadRequestException("That attempt is already submitted");
    }
    if (settled.status === "EXPIRED") {
      // Already graded on what was saved — return it rather than erroring, so
      // a submit that lost a race with the clock still shows a result.
      return this.attemptResult(attemptId);
    }

    await this.grade(attemptId, "SUBMITTED");
    return this.attemptResult(attemptId);
  }

  /**
   * The marked paper: per-question correctness and the answer key, released
   * only once the attempt is settled.
   */
  async attemptResult(attemptId: string) {
    const attempt = await this.prisma.quizAttempt.findUniqueOrThrow({
      where: { id: attemptId },
      include: {
        quiz: { include: { questions: { orderBy: QUESTION_ORDER } } },
        answers: true,
      },
    });
    if (attempt.status === "IN_PROGRESS") {
      throw new BadRequestException("That attempt hasn't been submitted yet");
    }

    const byQuestion = new Map(attempt.answers.map((answer) => [answer.questionId, answer]));
    const { quiz, answers: _answers, ...rest } = attempt;
    const { questions, ...quizWithoutQuestions } = quiz;

    return {
      ...rest,
      score: rest.score === null ? null : Number(rest.score),
      maxScore: rest.maxScore === null ? null : Number(rest.maxScore),
      quiz: quizWithoutQuestions,
      questions: questions.map((question) => {
        const answer = byQuestion.get(question.id);
        return {
          id: question.id,
          prompt: question.prompt,
          options: question.options,
          marks: Number(question.marks),
          correctIndex: question.correctIndex,
          selectedIndex: answer?.selectedIndex ?? null,
          isCorrect: answer?.isCorrect ?? false,
          marksAwarded: answer ? Number(answer.marksAwarded ?? 0) : 0,
        };
      }),
    };
  }

  /** Every attempt a student has made, for the parent-facing results list. */
  async attemptsForStudent(schoolId: string, studentId: string) {
    const attempts = await this.prisma.quizAttempt.findMany({
      where: { schoolId, studentId, status: { not: "IN_PROGRESS" } },
      orderBy: { startedAt: "desc" },
      include: { quiz: { select: { id: true, title: true, subject: true } } },
    });
    return attempts.map((attempt) => ({
      ...attempt,
      score: attempt.score === null ? null : Number(attempt.score),
      maxScore: attempt.maxScore === null ? null : Number(attempt.maxScore),
    }));
  }

  // ---------- grading ----------

  /**
   * Marks every saved answer and settles the attempt. An unanswered question
   * simply has no row, and so scores nothing — which is why the answers have
   * to be saved as they are chosen.
   */
  private async grade(attemptId: string, status: "SUBMITTED" | "EXPIRED") {
    const attempt = await this.prisma.quizAttempt.findUniqueOrThrow({
      where: { id: attemptId },
      include: {
        quiz: { include: { questions: { orderBy: QUESTION_ORDER } } },
        answers: true,
      },
    });

    const key = new Map(
      attempt.quiz.questions.map((question) => [
        question.id,
        { correctIndex: question.correctIndex, marks: Number(question.marks) },
      ]),
    );
    const maxScore = attempt.quiz.questions.reduce(
      (sum, question) => sum + Number(question.marks),
      0,
    );

    let score = 0;
    const marked = attempt.answers.map((answer) => {
      const question = key.get(answer.questionId);
      const isCorrect = Boolean(question) && answer.selectedIndex === question!.correctIndex;
      const marksAwarded = isCorrect ? question!.marks : 0;
      score += marksAwarded;
      return { id: answer.id, isCorrect, marksAwarded };
    });

    await this.prisma.$transaction([
      ...marked.map((answer) =>
        this.prisma.quizAnswer.update({
          where: { id: answer.id },
          data: { isCorrect: answer.isCorrect, marksAwarded: answer.marksAwarded },
        }),
      ),
      this.prisma.quizAttempt.update({
        where: { id: attemptId },
        data: { status, submittedAt: new Date(), score, maxScore },
      }),
    ]);

    await this.syncGradebook(attempt.quizId, attempt.studentId);
  }

  /**
   * Pushes the student's best settled attempt into the gradebook, so a quiz
   * score reaches the report card through the same table as an exam mark
   * rather than living in a parallel one.
   *
   * Best rather than latest: a second attempt is practice, and a school that
   * offers retakes doesn't mean the retake to be able to lower a mark.
   */
  private async syncGradebook(quizId: string, studentId: string) {
    const quiz = await this.prisma.quiz.findUniqueOrThrow({ where: { id: quizId } });
    if (!quiz.gradeTerm || !quiz.gradeExamType) return;

    const best = await this.prisma.quizAttempt.findFirst({
      where: { quizId, studentId, status: { not: "IN_PROGRESS" }, score: { not: null } },
      orderBy: { score: "desc" },
    });
    if (!best) return;

    await this.prisma.gradeEntry.upsert({
      where: {
        studentId_subject_term_examType: {
          studentId,
          subject: quiz.subject,
          term: quiz.gradeTerm,
          examType: quiz.gradeExamType,
        },
      },
      create: {
        schoolId: quiz.schoolId,
        studentId,
        classId: quiz.classId,
        subject: quiz.subject,
        term: quiz.gradeTerm,
        examType: quiz.gradeExamType,
        marksObtained: best.score ?? 0,
        maxMarks: best.maxScore ?? 0,
        // Attributed to whoever set the paper — nobody keyed this in.
        gradedByUserId: quiz.createdByUserId,
      },
      update: {
        marksObtained: best.score ?? 0,
        maxMarks: best.maxScore ?? 0,
      },
    });
  }

  /**
   * Settles an attempt whose time has run out. Expiry is decided here, on read
   * or write, rather than by a scheduled job — an attempt nobody touches again
   * costs nothing to leave open, and there is no cron in this deployment.
   */
  private async finalizeIfExpired<T extends SettleableAttempt>(attempt: T): Promise<T> {
    if (attempt.status !== "IN_PROGRESS" || !attempt.expiresAt) return attempt;
    if (attempt.expiresAt > new Date()) return attempt;

    await this.grade(attempt.id, "EXPIRED");
    return { ...attempt, status: "EXPIRED" };
  }

  // ---------- internals ----------

  private async findOwn(schoolId: string, quizId: string) {
    const quiz = await this.prisma.quiz.findFirst({ where: { id: quizId, schoolId } });
    if (!quiz) throw new NotFoundException("Quiz not found");
    return quiz;
  }

  private async totalMarks(quizId: string): Promise<number> {
    const questions = await this.prisma.quizQuestion.findMany({
      where: { quizId },
      select: { marks: true },
    });
    return questions.reduce((sum, question) => sum + Number(question.marks), 0);
  }

  /** The student profile behind a signed-in student account. */
  private async resolveOwnStudent(schoolId: string, userId: string) {
    const student = await this.prisma.studentProfile.findFirst({
      where: { userId, schoolId },
      select: { id: true, classId: true },
    });
    if (!student) throw new ForbiddenException("No student record for this account");
    return student;
  }

  /**
   * An attempt belongs to exactly one student, and only they may write to it.
   * Checking ownership through the signed-in account rather than a supplied
   * student id is what stops a parent sitting the paper for their child.
   */
  private async ownAttempt(schoolId: string, attemptId: string, studentUserId: string) {
    const student = await this.resolveOwnStudent(schoolId, studentUserId);
    const attempt = await this.prisma.quizAttempt.findFirst({
      where: { id: attemptId, schoolId, studentId: student.id },
      select: { id: true, quizId: true, status: true, expiresAt: true },
    });
    if (!attempt) throw new NotFoundException("Attempt not found");
    return attempt;
  }

  private translateGradebookClash(error: unknown): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return new ConflictException(
        "Another quiz for this class and subject already writes to that term and assessment name",
      );
    }
    return error;
  }
}
