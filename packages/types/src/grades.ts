import { z } from "zod";

export const gradeEntrySchema = z.object({
  id: z.string().uuid(),
  schoolId: z.string().uuid(),
  studentId: z.string().uuid(),
  classId: z.string().uuid(),
  subject: z.string().min(1),
  term: z.string().min(1),
  examType: z.string().min(1),
  marksObtained: z.number().nonnegative(),
  maxMarks: z.number().positive(),
  comments: z.string().nullable(),
  gradedByUserId: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type GradeEntry = z.infer<typeof gradeEntrySchema>;

export const upsertGradeEntrySchema = z.object({
  classId: z.string().uuid(),
  studentId: z.string().uuid(),
  subject: z.string().min(1),
  term: z.string().min(1),
  examType: z.string().min(1),
  marksObtained: z.number().nonnegative(),
  maxMarks: z.number().positive(),
  comments: z.string().optional(),
});
export type UpsertGradeEntryInput = z.infer<typeof upsertGradeEntrySchema>;
