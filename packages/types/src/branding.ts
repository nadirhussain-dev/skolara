import { z } from "zod";
import { httpUrlSchema } from "./common";

export const updateBrandingSchema = z.object({
  // Loaded as an image on every sign-in screen and dashboard.
  logoUrl: httpUrlSchema.optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "expected a hex color like #3730A3")
    .optional(),
});
export type UpdateBrandingInput = z.infer<typeof updateBrandingSchema>;
