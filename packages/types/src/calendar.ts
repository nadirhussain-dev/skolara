import { z } from "zod";

export const calendarEventCategorySchema = z.enum([
  "HOLIDAY",
  "EXAM",
  "MEETING",
  "ACTIVITY",
  "TERM_START",
  "TERM_END",
  "OTHER",
]);
export type CalendarEventCategory = z.infer<typeof calendarEventCategorySchema>;

export const calendarEventSchema = z.object({
  id: z.string().uuid(),
  schoolId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().nullable(),
  category: calendarEventCategorySchema,
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  allDay: z.boolean(),
  /** Null means the whole school. */
  classId: z.string().uuid().nullable(),
  createdByUserId: z.string().uuid(),
  createdAt: z.coerce.date(),
});
export type CalendarEvent = z.infer<typeof calendarEventSchema>;

export const createCalendarEventSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().optional(),
    category: calendarEventCategorySchema.default("OTHER"),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    allDay: z.boolean().default(false),
    classId: z.string().uuid().optional(),
  })
  .refine((event) => event.endsAt >= event.startsAt, {
    message: "An event can't end before it starts",
    path: ["endsAt"],
  });
export type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>;
