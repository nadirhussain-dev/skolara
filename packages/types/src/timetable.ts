import { z } from "zod";

export const dayOfWeekSchema = z.enum([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]);
export type DayOfWeek = z.infer<typeof dayOfWeekSchema>;

/** Teaching week in display order. Saturday is a normal school day in much of Pakistan. */
export const TEACHING_DAYS: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

// Wall-clock time, not an instant — a period repeats weekly and carries no date.
const timeOfDaySchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be in 24-hour HH:MM format");

export const periodSchema = z.object({
  id: z.string().uuid(),
  schoolId: z.string().uuid(),
  name: z.string().min(1),
  startTime: timeOfDaySchema,
  endTime: timeOfDaySchema,
  sortOrder: z.number().int().nonnegative(),
});
export type Period = z.infer<typeof periodSchema>;

export const createPeriodSchema = periodSchema
  .pick({ name: true, startTime: true, endTime: true, sortOrder: true })
  .refine((period) => period.startTime < period.endTime, {
    message: "A period must end after it starts",
    path: ["endTime"],
  });
export type CreatePeriodInput = z.infer<typeof createPeriodSchema>;

export const timetableEntrySchema = z.object({
  id: z.string().uuid(),
  schoolId: z.string().uuid(),
  classId: z.string().uuid(),
  periodId: z.string().uuid(),
  dayOfWeek: dayOfWeekSchema,
  subject: z.string().min(1),
  teacherUserId: z.string().uuid(),
  room: z.string().nullable(),
});
export type TimetableEntry = z.infer<typeof timetableEntrySchema>;

export const upsertTimetableEntrySchema = z.object({
  classId: z.string().uuid(),
  periodId: z.string().uuid(),
  dayOfWeek: dayOfWeekSchema,
  subject: z.string().min(1),
  teacherUserId: z.string().uuid(),
  room: z.string().min(1).optional(),
});
export type UpsertTimetableEntryInput = z.infer<typeof upsertTimetableEntrySchema>;

/**
 * Which resource a rejected write would have double-booked. The UI uses this to
 * point at the specific cell rather than showing a generic failure.
 */
export const timetableConflictKindSchema = z.enum(["TEACHER", "ROOM", "CLASS"]);
export type TimetableConflictKind = z.infer<typeof timetableConflictKindSchema>;

export interface TimetableConflict {
  kind: TimetableConflictKind;
  message: string;
  /** The lesson already occupying the slot. */
  conflictsWith: {
    id: string;
    classId: string;
    subject: string;
    teacherUserId: string;
    room: string | null;
  };
}
