import { z } from "zod";

export const schoolGroupSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  createdAt: z.coerce.date(),
});
export type SchoolGroup = z.infer<typeof schoolGroupSchema>;

export const createSchoolGroupSchema = z.object({
  name: z.string().min(1),
});
export type CreateSchoolGroupInput = z.infer<typeof createSchoolGroupSchema>;

export const assignSchoolToGroupSchema = z.object({
  schoolId: z.string().uuid(),
});
export type AssignSchoolToGroupInput = z.infer<typeof assignSchoolToGroupSchema>;
