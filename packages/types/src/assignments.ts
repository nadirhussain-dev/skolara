import { z } from "zod";

export const assignmentSchema = z.object({
  id: z.string().uuid(),
  schoolId: z.string().uuid(),
  classId: z.string().uuid(),
  subject: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable(),
  dueDate: z.coerce.date(),
  createdByUserId: z.string().uuid(),
  createdAt: z.coerce.date(),
});
export type Assignment = z.infer<typeof assignmentSchema>;

export const createAssignmentSchema = z.object({
  classId: z.string().uuid(),
  subject: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.coerce.date(),
});
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;

export const assignmentSubmissionSchema = z.object({
  id: z.string().uuid(),
  assignmentId: z.string().uuid(),
  studentId: z.string().uuid(),
  fileUrl: z.string().url(),
  note: z.string().nullable(),
  grade: z.string().nullable(),
  feedback: z.string().nullable(),
  submittedAt: z.coerce.date(),
});
export type AssignmentSubmission = z.infer<typeof assignmentSubmissionSchema>;

export const submitAssignmentSchema = z.object({
  fileUrl: z.string().url(),
  note: z.string().optional(),
});
export type SubmitAssignmentInput = z.infer<typeof submitAssignmentSchema>;

export const gradeAssignmentSchema = z.object({
  grade: z.string().min(1),
  feedback: z.string().optional(),
});
export type GradeAssignmentInput = z.infer<typeof gradeAssignmentSchema>;
