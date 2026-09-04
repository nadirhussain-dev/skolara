import { z } from "zod";

export const supportTicketStatusSchema = z.enum([
  "OPEN",
  "IN_PROGRESS",
  "WAITING_ON_SCHOOL",
  "RESOLVED",
  "CLOSED",
]);
export type SupportTicketStatus = z.infer<typeof supportTicketStatusSchema>;

export const supportTicketPrioritySchema = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);
export type SupportTicketPriority = z.infer<typeof supportTicketPrioritySchema>;

export const createSupportTicketSchema = z.object({
  subject: z.string().min(3).max(200),
  body: z.string().min(10).max(5000),
  priority: supportTicketPrioritySchema.default("NORMAL"),
});
export type CreateSupportTicketInput = z.infer<typeof createSupportTicketSchema>;

export const addSupportCommentSchema = z.object({
  body: z.string().min(1).max(5000),
  /**
   * Platform-side working note. Ignored when a school sends it — a school
   * can't leave a note hidden from itself, and honouring the flag would let
   * one write a comment nobody ever reads.
   */
  internal: z.boolean().default(false),
});
export type AddSupportCommentInput = z.infer<typeof addSupportCommentSchema>;

export const updateSupportTicketSchema = z.object({
  status: supportTicketStatusSchema.optional(),
  priority: supportTicketPrioritySchema.optional(),
});
export type UpdateSupportTicketInput = z.infer<typeof updateSupportTicketSchema>;

export const supportTicketSchema = z.object({
  id: z.string().uuid(),
  schoolId: z.string().uuid(),
  raisedByUserId: z.string().uuid(),
  subject: z.string(),
  body: z.string(),
  status: supportTicketStatusSchema,
  priority: supportTicketPrioritySchema,
  resolvedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type SupportTicket = z.infer<typeof supportTicketSchema>;

export const supportTicketCommentSchema = z.object({
  id: z.string().uuid(),
  ticketId: z.string().uuid(),
  authorUserId: z.string().uuid(),
  body: z.string(),
  internal: z.boolean(),
  createdAt: z.coerce.date(),
});
export type SupportTicketComment = z.infer<typeof supportTicketCommentSchema>;
