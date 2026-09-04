import { z } from "zod";

export const studyMaterialSchema = z.object({
  id: z.string().uuid(),
  schoolId: z.string().uuid(),
  classId: z.string().uuid(),
  subject: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  fileKey: z.string(),
  fileUrl: z.string(),
  contentType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  uploadedByUserId: z.string().uuid(),
  createdAt: z.coerce.date(),
});
export type StudyMaterial = z.infer<typeof studyMaterialSchema>;

/**
 * The file itself goes through `POST /uploads` first — the same two-step the
 * payment screenshot and homework flows use, so the multipart handling lives
 * in one place and this endpoint only ever sees JSON.
 */
export const publishStudyMaterialSchema = z.object({
  classId: z.string().uuid(),
  subject: z.string().min(1).max(60),
  title: z.string().min(1).max(140),
  description: z.string().max(1000).optional(),
  fileKey: z.string().min(1),
  fileUrl: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
});
export type PublishStudyMaterialInput = z.infer<typeof publishStudyMaterialSchema>;
