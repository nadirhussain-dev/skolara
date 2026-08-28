import { z } from "zod";

export const auditOutcomeSchema = z.enum(["SUCCESS", "FAILURE"]);
export type AuditOutcome = z.infer<typeof auditOutcomeSchema>;

export const auditLogSchema = z.object({
  id: z.string().uuid(),
  schoolId: z.string().uuid().nullable(),
  actorUserId: z.string().uuid().nullable(),
  actorLabel: z.string(),
  actorRole: z.string().nullable(),
  action: z.string(),
  method: z.string(),
  path: z.string(),
  entityId: z.string().nullable(),
  outcome: auditOutcomeSchema,
  statusCode: z.number().int(),
  ipAddress: z.string().nullable(),
  metadata: z.unknown().nullable(),
  createdAt: z.coerce.date(),
});
export type AuditLog = z.infer<typeof auditLogSchema>;

export interface AuditLogWithActor extends AuditLog {
  actorUser: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

export interface AuditLogPage {
  entries: AuditLogWithActor[];
  /** Pass back as `cursor` to fetch the next page; null when at the end. */
  nextCursor: string | null;
}
