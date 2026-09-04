import { z } from "zod";

/**
 * How early a student may collect the join link.
 *
 * Not zero, because turning up to a lesson exactly on the minute is not how
 * anyone attends one; not an hour, because the point of holding the link back
 * is that it can't be passed around before the lesson.
 */
export const LIVE_CLASS_JOIN_LEAD_MINUTES = 10;

export const liveClassSchema = z.object({
  id: z.string().uuid(),
  schoolId: z.string().uuid(),
  classId: z.string().uuid(),
  subject: z.string(),
  title: z.string(),
  meetingUrl: z.string(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  hostUserId: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type LiveClass = z.infer<typeof liveClassSchema>;

/**
 * Only http(s). Zod's `.url()` alone accepts `javascript:` and `data:`, and
 * this string is handed straight to a browser or a phone's link handler.
 *
 * Matched with a scheme prefix rather than `new URL()`: this package is shared
 * with React Native and compiles without DOM or Node lib definitions.
 */
const meetingUrlSchema = z
  .string()
  .url()
  .max(2000)
  .refine((url) => /^https?:\/\//i.test(url), {
    message: "The meeting link must be an http or https URL",
  });

export const upsertLiveClassSchema = z
  .object({
    classId: z.string().uuid(),
    subject: z.string().min(1).max(60),
    title: z.string().min(1).max(140),
    meetingUrl: meetingUrlSchema,
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
  })
  .refine((session) => session.endsAt > session.startsAt, {
    message: "A live class must end after it starts",
    path: ["endsAt"],
  });
export type UpsertLiveClassInput = z.infer<typeof upsertLiveClassSchema>;
