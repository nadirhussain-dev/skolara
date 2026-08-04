import { z } from "zod";

export const attendanceStatusSchema = z.enum([
  "PRESENT",
  "ABSENT",
  "LATE",
  "EXCUSED",
]);
export type AttendanceStatus = z.infer<typeof attendanceStatusSchema>;

export const attendanceRecordSchema = z.object({
  id: z.string().uuid(),
  schoolId: z.string().uuid(),
  classId: z.string().uuid(),
  studentId: z.string().uuid(),
  date: z.coerce.date(),
  status: attendanceStatusSchema,
  markedByUserId: z.string().uuid(),
  markedOffline: z.boolean().default(false),
  createdAt: z.coerce.date(),
});
export type AttendanceRecord = z.infer<typeof attendanceRecordSchema>;

export const markAttendanceSchema = z.object({
  classId: z.string().uuid(),
  date: z.coerce.date(),
  markedOffline: z.boolean().default(false),
  entries: z.array(
    z.object({
      studentId: z.string().uuid(),
      status: attendanceStatusSchema,
    }),
  ),
});
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
