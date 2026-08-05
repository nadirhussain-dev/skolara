import { z } from "zod";

export const examSchema = z.object({
  id: z.string().uuid(),
  schoolId: z.string().uuid(),
  classId: z.string().uuid(),
  name: z.string().min(1),
  term: z.string().min(1),
  examType: z.string().min(1),
  scheduledDate: z.coerce.date(),
});
export type Exam = z.infer<typeof examSchema>;

export const createExamSchema = examSchema.omit({ id: true, schoolId: true });
export type CreateExamInput = z.infer<typeof createExamSchema>;

export const rankListEntrySchema = z.object({
  studentId: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  totalMarksObtained: z.number(),
  totalMaxMarks: z.number(),
  percentage: z.number(),
  rank: z.number(),
});
export type RankListEntry = z.infer<typeof rankListEntrySchema>;
