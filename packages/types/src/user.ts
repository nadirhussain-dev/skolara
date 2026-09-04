import { z } from "zod";
import { roleSchema } from "./role";

export const userSchema = z.object({
  id: z.string().uuid(),
  schoolId: z.string().uuid().nullable(),
  role: roleSchema,
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().nullable(),
  isActive: z.boolean(),
  /**
   * The access template narrowing this account, if any. Null for every user
   * until a school builds one — a template only ever removes access, never
   * grants it, so the role above remains the source of what they *could* do.
   */
  roleTemplateId: z.string().uuid().nullable(),
  createdAt: z.coerce.date(),
});
export type User = z.infer<typeof userSchema>;

export const createUserSchema = userSchema
  .pick({
    schoolId: true,
    role: true,
    email: true,
    firstName: true,
    lastName: true,
  })
  .extend({
    password: z.string().min(8),
    phone: z.string().optional(),
  });
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const setUserActiveSchema = z.object({
  isActive: z.boolean(),
});
export type SetUserActiveInput = z.infer<typeof setUserActiveSchema>;
