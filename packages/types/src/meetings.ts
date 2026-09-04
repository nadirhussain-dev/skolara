import { z } from "zod";

export const meetingSlotSchema = z.object({
  id: z.string().uuid(),
  schoolId: z.string().uuid(),
  teacherUserId: z.string().uuid(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  bookedByParentUserId: z.string().uuid().nullable(),
  studentId: z.string().uuid().nullable(),
  bookedAt: z.coerce.date().nullable(),
  note: z.string().nullable(),
});
export type MeetingSlot = z.infer<typeof meetingSlotSchema>;

/**
 * Teachers publish slots in batches — an evening of ten-minute appointments
 * is one action, not ten.
 */
export const publishMeetingSlotsSchema = z.object({
  slots: z
    .array(
      z
        .object({
          startsAt: z.coerce.date(),
          endsAt: z.coerce.date(),
        })
        .refine((slot) => slot.endsAt > slot.startsAt, {
          message: "A slot must end after it starts",
          path: ["endsAt"],
        }),
    )
    .min(1)
    .max(60),
});
export type PublishMeetingSlotsInput = z.infer<typeof publishMeetingSlotsSchema>;

export const bookMeetingSlotSchema = z.object({
  studentId: z.string().uuid(),
  note: z.string().max(300).optional(),
});
export type BookMeetingSlotInput = z.infer<typeof bookMeetingSlotSchema>;
