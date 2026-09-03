import { z } from "zod";

export const quizAttemptStatusSchema = z.enum(["IN_PROGRESS", "SUBMITTED", "EXPIRED"]);
export type QuizAttemptStatus = z.infer<typeof quizAttemptStatusSchema>;

export const MAX_QUIZ_OPTIONS = 6;
export const MAX_QUIZ_QUESTIONS = 100;

export const quizQuestionSchema = z.object({
  id: z.string().uuid(),
  quizId: z.string().uuid(),
  prompt: z.string(),
  options: z.array(z.string()),
  correctIndex: z.number().int(),
  marks: z.coerce.number(),
  sortOrder: z.number().int(),
});
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;

/**
 * A question as a student sees it. `correctIndex` is stripped rather than
 * nulled: an optional field is one careless spread away from being sent, and
 * the answer key is the one thing this payload must never carry.
 */
export type QuizQuestionForStudent = Omit<QuizQuestion, "correctIndex">;

export const quizSchema = z.object({
  id: z.string().uuid(),
  schoolId: z.string().uuid(),
  classId: z.string().uuid(),
  subject: z.string(),
  title: z.string(),
  instructions: z.string().nullable(),
  timeLimitMinutes: z.number().int().nullable(),
  opensAt: z.coerce.date().nullable(),
  closesAt: z.coerce.date().nullable(),
  maxAttempts: z.number().int(),
  publishedAt: z.coerce.date().nullable(),
  gradeTerm: z.string().nullable(),
  gradeExamType: z.string().nullable(),
  createdByUserId: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Quiz = z.infer<typeof quizSchema>;

export const quizAttemptSchema = z.object({
  id: z.string().uuid(),
  schoolId: z.string().uuid(),
  quizId: z.string().uuid(),
  studentId: z.string().uuid(),
  attemptNumber: z.number().int(),
  status: quizAttemptStatusSchema,
  startedAt: z.coerce.date(),
  expiresAt: z.coerce.date().nullable(),
  submittedAt: z.coerce.date().nullable(),
  score: z.coerce.number().nullable(),
  maxScore: z.coerce.number().nullable(),
});
export type QuizAttempt = z.infer<typeof quizAttemptSchema>;

export const quizAnswerSchema = z.object({
  id: z.string().uuid(),
  attemptId: z.string().uuid(),
  questionId: z.string().uuid(),
  selectedIndex: z.number().int(),
  isCorrect: z.boolean().nullable(),
  marksAwarded: z.coerce.number().nullable(),
  answeredAt: z.coerce.date(),
});
export type QuizAnswer = z.infer<typeof quizAnswerSchema>;

// Optional rather than `.default(1)`: a Zod default lands only in the parsed
// output, so `CreateQuizInput` — inferred from the output — would force every
// caller to supply the value the default exists to avoid. The service applies
// the fallback instead.
const questionInputSchema = z
  .object({
    prompt: z.string().min(1).max(1000),
    options: z.array(z.string().min(1).max(300)).min(2).max(MAX_QUIZ_OPTIONS),
    correctIndex: z.number().int().nonnegative(),
    marks: z.number().positive().max(100).optional(),
  })
  .refine((question) => question.correctIndex < question.options.length, {
    message: "correctIndex must point at one of the options",
    path: ["correctIndex"],
  });
export type QuizQuestionInput = z.infer<typeof questionInputSchema>;

export const createQuizSchema = z
  .object({
    classId: z.string().uuid(),
    subject: z.string().min(1).max(60),
    title: z.string().min(1).max(140),
    instructions: z.string().max(2000).optional(),
    timeLimitMinutes: z.number().int().min(1).max(480).optional(),
    opensAt: z.coerce.date().optional(),
    closesAt: z.coerce.date().optional(),
    maxAttempts: z.number().int().min(1).max(10).optional(),
    // Both or neither: half a gradebook target would land a mark in a cell
    // nobody can find.
    gradeTerm: z.string().min(1).max(60).optional(),
    gradeExamType: z.string().min(1).max(60).optional(),
    questions: z.array(questionInputSchema).min(1).max(MAX_QUIZ_QUESTIONS),
  })
  .refine((quiz) => !quiz.closesAt || !quiz.opensAt || quiz.closesAt > quiz.opensAt, {
    message: "A quiz must close after it opens",
    path: ["closesAt"],
  })
  .refine((quiz) => Boolean(quiz.gradeTerm) === Boolean(quiz.gradeExamType), {
    message: "Set both a term and an assessment name, or neither",
    path: ["gradeExamType"],
  });
export type CreateQuizInput = z.infer<typeof createQuizSchema>;

/** Replaces the whole question set. Only allowed while the quiz is a draft. */
export const replaceQuizQuestionsSchema = z.object({
  questions: z.array(questionInputSchema).min(1).max(MAX_QUIZ_QUESTIONS),
});
export type ReplaceQuizQuestionsInput = z.infer<typeof replaceQuizQuestionsSchema>;

export const saveQuizAnswerSchema = z.object({
  questionId: z.string().uuid(),
  selectedIndex: z.number().int().nonnegative().max(MAX_QUIZ_OPTIONS - 1),
});
export type SaveQuizAnswerInput = z.infer<typeof saveQuizAnswerSchema>;
