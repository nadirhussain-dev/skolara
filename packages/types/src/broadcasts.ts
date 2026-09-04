import { z } from "zod";
import { roleSchema } from "./role";

export const createBroadcastSchema = z.object({
  title: z.string().min(3).max(200),
  body: z.string().min(3).max(2000),
  /** Empty means everyone. */
  audienceRoles: z.array(roleSchema).default([]),
  expiresAt: z.coerce.date().optional(),
});
export type CreateBroadcastInput = z.infer<typeof createBroadcastSchema>;

export const platformBroadcastSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  body: z.string(),
  audienceRoles: z.array(roleSchema),
  publishedByUserId: z.string().uuid(),
  expiresAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
});
export type PlatformBroadcast = z.infer<typeof platformBroadcastSchema>;
