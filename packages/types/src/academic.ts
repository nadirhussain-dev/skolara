import { z } from "zod";

export const admitStudentSchema = z.object({
  schoolId: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  admissionNumber: z.string().min(1),
  dateOfBirth: z.coerce.date(),
  classId: z.string().uuid().optional(),
  parentUserIds: z.array(z.string().uuid()).default([]),
});
export type AdmitStudentInput = z.infer<typeof admitStudentSchema>;

export const createTeacherSchema = z.object({
  schoolId: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  employeeNumber: z.string().min(1),
  subjects: z.array(z.string()).default([]),
});
export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;

export const classSchema = z.object({
  id: z.string().uuid(),
  schoolId: z.string().uuid(),
  name: z.string().min(1), // e.g. "Grade 6"
  section: z.string().min(1), // e.g. "A"
  academicYear: z.string(), // e.g. "2026-2027"
  classTeacherId: z.string().uuid().nullable(),
});
export type SchoolClass = z.infer<typeof classSchema>;

export const createClassSchema = classSchema.omit({ id: true });
export type CreateClassInput = z.infer<typeof createClassSchema>;

export const studentProfileSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  schoolId: z.string().uuid(),
  classId: z.string().uuid().nullable(),
  admissionNumber: z.string(),
  dateOfBirth: z.coerce.date(),
});
export type StudentProfile = z.infer<typeof studentProfileSchema>;

export const teacherProfileSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  schoolId: z.string().uuid(),
  employeeNumber: z.string(),
  subjects: z.array(z.string()),
});
export type TeacherProfile = z.infer<typeof teacherProfileSchema>;
