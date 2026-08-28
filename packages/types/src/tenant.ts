import { z } from "zod";

export const subscriptionPlanSchema = z.enum([
  "BASIC",
  "STANDARD",
  "PREMIUM",
  "ENTERPRISE",
]);
export type SubscriptionPlan = z.infer<typeof subscriptionPlanSchema>;

export const subscriptionStatusSchema = z.enum([
  "PENDING",
  "TRIAL",
  "ACTIVE",
  "EXPIRED",
  "SUSPENDED",
  "REJECTED",
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

export const createSchoolSchema = schoolSchema
  .pick({
    name: true,
    subdomain: true,
    plan: true,
  })
  .extend({
    adminEmail: z.string().email(),
    adminPassword: z.string().min(8),
    adminFirstName: z.string().min(1),
    adminLastName: z.string().min(1),
  });
export type CreateSchoolInput = z.infer<typeof createSchoolSchema>;

/**
 * Self-serve signup. Deliberately a narrower shape than CreateSchoolInput:
 * the public form can't pick a subscription status, and ENTERPRISE is quoted
 * by sales rather than self-served.
 */
export const registerSchoolSchema = z.object({
  name: z.string().min(2),
  subdomain: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "lowercase letters, numbers, and hyphens only")
    .refine((value) => !value.startsWith("-") && !value.endsWith("-"), {
      message: "can't start or end with a hyphen",
    }),
  plan: z.enum(["BASIC", "STANDARD", "PREMIUM"]),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
  adminFirstName: z.string().min(1),
  adminLastName: z.string().min(1),
  contactPhone: z.string().min(6).optional(),
});
export type RegisterSchoolInput = z.infer<typeof registerSchoolSchema>;

export const registerSchoolResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  subdomain: z.string(),
  subscriptionStatus: subscriptionStatusSchema,
});
export type RegisterSchoolResponse = z.infer<typeof registerSchoolResponseSchema>;
