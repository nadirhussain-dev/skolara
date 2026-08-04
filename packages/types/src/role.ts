import { z } from "zod";

export const Role = {
  SUPER_ADMIN: "SUPER_ADMIN",
  SCHOOL_ADMIN: "SCHOOL_ADMIN",
  TEACHER: "TEACHER",
  PARENT: "PARENT",
  STUDENT: "STUDENT",
} as const;

export const roleSchema = z.enum([
  Role.SUPER_ADMIN,
  Role.SCHOOL_ADMIN,
  Role.TEACHER,
  Role.PARENT,
  Role.STUDENT,
]);

export type RoleType = z.infer<typeof roleSchema>;
