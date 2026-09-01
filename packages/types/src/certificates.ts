import { z } from "zod";

export const certificateKindSchema = z.enum([
  "ENROLMENT",
  "CHARACTER",
  "LEAVING",
  "BONAFIDE",
]);
export type CertificateKind = z.infer<typeof certificateKindSchema>;

export const CERTIFICATE_LABELS: Record<CertificateKind, string> = {
  ENROLMENT: "Certificate of Enrolment",
  CHARACTER: "Character Certificate",
  LEAVING: "School Leaving Certificate",
  BONAFIDE: "Bonafide Certificate",
};

export const issueCertificateSchema = z.object({
  studentId: z.string().uuid(),
  kind: certificateKindSchema,
  /**
   * Free-text the office adds — a reason for leaving, a conduct note. Kept
   * optional because most certificates are boilerplate over school records.
   */
  remarks: z.string().max(500).optional(),
  /** Required for LEAVING; the date the student's enrolment ends. */
  leavingDate: z.coerce.date().optional(),
});
export type IssueCertificateInput = z.infer<typeof issueCertificateSchema>;
