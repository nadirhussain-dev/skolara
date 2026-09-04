import { z } from "zod";

/**
 * What a file is being uploaded for. Used to namespace storage keys so a
 * school's payment screenshots and homework attachments stay separable.
 */
export const uploadPurposeSchema = z.enum([
  "PAYMENT_SCREENSHOT",
  "ASSIGNMENT_SUBMISSION",
  "SCHOOL_LOGO",
  "STUDENT_DOCUMENT",
  "STUDY_MATERIAL",
  // Rendered by the API rather than uploaded by a person — report cards, fee
  // receipts, certificates.
  "GENERATED_DOCUMENT",
]);
export type UploadPurpose = z.infer<typeof uploadPurposeSchema>;

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const ALLOWED_UPLOAD_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
] as const;

/**
 * Types a teacher may add to the study-materials library on top of the shared
 * allowlist. Notes and worksheets arrive as Office documents far more often
 * than as PDFs, and a library that refuses a `.docx` is a library nobody uses.
 *
 * Still an explicit allowlist — widened for one purpose, not opened up.
 */
export const STUDY_MATERIAL_EXTRA_MIME_TYPES = [
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
] as const;

export function allowedMimeTypesFor(purpose: UploadPurpose): readonly string[] {
  return purpose === "STUDY_MATERIAL"
    ? [...ALLOWED_UPLOAD_MIME_TYPES, ...STUDY_MATERIAL_EXTRA_MIME_TYPES]
    : ALLOWED_UPLOAD_MIME_TYPES;
}

export const uploadedFileSchema = z.object({
  key: z.string(),
  url: z.string().url(),
  contentType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
});
export type UploadedFile = z.infer<typeof uploadedFileSchema>;
