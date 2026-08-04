import { z } from "zod";

export const subscriptionPlanSchema = z.enum([
  "BASIC",
  "STANDARD",
  "PREMIUM",
  "ENTERPRISE",
]);
export type SubscriptionPlan = z.infer<typeof subscriptionPlanSchema>;

export const subscriptionStatusSchema = z.enum([
  "TRIAL",
  "ACTIVE",
  "EXPIRED",
  "SUSPENDED",
]);
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;

export const schoolSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2),
  subdomain: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "lowercase letters, numbers, and hyphens only"),
  plan: subscriptionPlanSchema,
  subscriptionStatus: subscriptionStatusSchema,
  trialEndsAt: z.coerce.date().nullable(),
  logoUrl: z.string().url().nullable(),
  primaryColor: z.string().nullable(),
  createdAt: z.coerce.date(),
});
export type School = z.infer<typeof schoolSchema>;

export const createSchoolSchema = schoolSchema.pick({
  name: true,
  subdomain: true,
  plan: true,
});
export type CreateSchoolInput = z.infer<typeof createSchoolSchema>;
