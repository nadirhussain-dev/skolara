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

/**
 * One assessment on a student's performance curve.
 *
 * Percentages, not raw marks: a 45/50 quiz and a 68/100 exam are not
 * comparable as marks, and a chart that plots them on one axis is lying.
 */
export interface PerformancePoint {
  term: string;
  examType: string;
  percentage: number;
  /** The same assessment averaged across the class, for context. */
  classAveragePercentage: number | null;
  gradedAt: Date;
}

export interface SubjectPerformance {
  subject: string;
  points: PerformancePoint[];
  /** Mean of the student's own percentages in this subject. */
  average: number;
  /** Mean of the class averages over the same assessments. */
  classAverage: number | null;
}

export interface StudentPerformance {
  studentId: string;
  subjects: SubjectPerformance[];
  /** Across every subject, so the page can lead with one number. */
  overallAverage: number | null;
}
