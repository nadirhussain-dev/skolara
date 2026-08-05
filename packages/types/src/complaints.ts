import { z } from "zod";

export const complaintStatusSchema = z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]);
export type ComplaintStatus = z.infer<typeof complaintStatusSchema>;

export const complaintSchema = z.object({
  id: z.string().uuid(),
  schoolId: z.string().uuid(),
  raisedByUserId: z.string().uuid(),
  studentId: z.string().uuid().nullable(),
  subject: z.string().min(1),
  body: z.string().min(1),
  status: complaintStatusSchema,
  createdAt: z.coerce.date(),
  resolvedAt: z.coerce.date().nullable(),
});
export type Complaint = z.infer<typeof complaintSchema>;

export const createComplaintSchema = z.object({
  studentId: z.string().uuid().optional(),
  subject: z.string().min(1),
  body: z.string().min(1),
});
export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;

export const complaintCommentSchema = z.object({
  id: z.string().uuid(),
  complaintId: z.string().uuid(),
  authorUserId: z.string().uuid(),
  body: z.string().min(1),
  createdAt: z.coerce.date(),
});
export type ComplaintComment = z.infer<typeof complaintCommentSchema>;

export const addComplaintCommentSchema = z.object({
  body: z.string().min(1),
});
export type AddComplaintCommentInput = z.infer<typeof addComplaintCommentSchema>;

export const updateComplaintStatusSchema = z.object({
  status: complaintStatusSchema,
});
export type UpdateComplaintStatusInput = z.infer<typeof updateComplaintStatusSchema>;
