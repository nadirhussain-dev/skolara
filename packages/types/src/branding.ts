import { z } from "zod";

export const updateBrandingSchema = z.object({
  logoUrl: z.string().url().optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "expected a hex color like #3730A3")
    .optional(),
});
export type UpdateBrandingInput = z.infer<typeof updateBrandingSchema>;
