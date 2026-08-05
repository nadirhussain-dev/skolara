import { z } from "zod";

export const apiKeySchema = z.object({
  id: z.string().uuid(),
  schoolId: z.string().uuid(),
  name: z.string().min(1),
  keyPrefix: z.string(),
  createdAt: z.coerce.date(),
  lastUsedAt: z.coerce.date().nullable(),
  revokedAt: z.coerce.date().nullable(),
});
export type ApiKey = z.infer<typeof apiKeySchema>;

export const createApiKeySchema = z.object({
  name: z.string().min(1),
});
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;

export const createApiKeyResponseSchema = apiKeySchema.extend({
  rawKey: z.string(),
});
export type CreateApiKeyResponse = z.infer<typeof createApiKeyResponseSchema>;
