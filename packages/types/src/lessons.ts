import { z } from "zod";

export const syllabusTopicStatusSchema = z.enum([
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
]);
export type SyllabusTopicStatus = z.infer<typeof syllabusTopicStatusSchema>;

export const SYLLABUS_STATUS_LABELS: Record<SyllabusTopicStatus, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  COMPLETED: "Covered",
};

export const syllabusTopicSchema = z.object({
  id: z.string().uuid(),
  schoolId: z.string().uuid(),
  classId: z.string().uuid(),
  subject: z.string(),
  term: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  sortOrder: z.number().int(),
  status: syllabusTopicStatusSchema,
  plannedForDate: z.coerce.date().nullable(),
  completedOn: z.coerce.date().nullable(),
  createdByUserId: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type SyllabusTopic = z.infer<typeof syllabusTopicSchema>;

/**
 * Topics are added a syllabus at a time, not one at a time — a term's syllabus
 * arrives as a list off a curriculum document, and typing it in row by row is
 * the reason nobody fills these in.
 */
export const addSyllabusTopicsSchema = z.object({
  classId: z.string().uuid(),
  subject: z.string().min(1).max(60),
  term: z.string().min(1).max(60),
  topics: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().max(1000).optional(),
        plannedForDate: z.coerce.date().optional(),
      }),
    )
    .min(1)
    .max(200),
});
export type AddSyllabusTopicsInput = z.infer<typeof addSyllabusTopicsSchema>;

export const updateSyllabusTopicSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).nullable().optional(),
    status: syllabusTopicStatusSchema.optional(),
    plannedForDate: z.coerce.date().nullable().optional(),
    sortOrder: z.number().int().nonnegative().optional(),
  })
  .refine((patch) => Object.keys(patch).length > 0, {
    message: "Nothing to update",
  });
export type UpdateSyllabusTopicInput = z.infer<typeof updateSyllabusTopicSchema>;

export const lessonPlanSchema = z.object({
  id: z.string().uuid(),
  schoolId: z.string().uuid(),
  classId: z.string().uuid(),
  subject: z.string(),
  topicId: z.string().uuid().nullable(),
  title: z.string(),
  objectives: z.string().nullable(),
  activities: z.string().nullable(),
  resources: z.string().nullable(),
  date: z.coerce.date(),
  periodId: z.string().uuid().nullable(),
  teacherUserId: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type LessonPlan = z.infer<typeof lessonPlanSchema>;

export const upsertLessonPlanSchema = z.object({
  classId: z.string().uuid(),
  subject: z.string().min(1).max(60),
  topicId: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(200),
  objectives: z.string().max(2000).nullable().optional(),
  activities: z.string().max(4000).nullable().optional(),
  resources: z.string().max(2000).nullable().optional(),
  date: z.coerce.date(),
  periodId: z.string().uuid().nullable().optional(),
});
export type UpsertLessonPlanInput = z.infer<typeof upsertLessonPlanSchema>;

/** Coverage is derived from the topics, never stored alongside them. */
export interface SyllabusCoverage {
  subject: string;
  term: string;
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  /** Whole percent of topics marked covered. */
  percentComplete: number;
  /** Topics whose planned date has passed and that aren't covered yet. */
  overdue: number;
}
