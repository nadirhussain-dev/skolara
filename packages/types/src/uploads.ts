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

export const uploadedFileSchema = z.object({
  key: z.string(),
  url: z.string().url(),
  contentType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
});
export type UploadedFile = z.infer<typeof uploadedFileSchema>;
