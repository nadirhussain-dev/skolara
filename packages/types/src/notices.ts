import { z } from "zod";

export const noticeAudienceSchema = z.enum([
  "ALL",
  "TEACHERS",
  "PARENTS",
  "STUDENTS",
  "CLASS",
]);
export type NoticeAudience = z.infer<typeof noticeAudienceSchema>;

export const noticeSchema = z.object({
  id: z.string().uuid(),
  schoolId: z.string().uuid(),
  title: z.string().min(1),
  body: z.string().min(1),
  audience: noticeAudienceSchema,
  classId: z.string().uuid().nullable(),
  publishedByUserId: z.string().uuid(),
  createdAt: z.coerce.date(),
});
export type Notice = z.infer<typeof noticeSchema>;

export const createNoticeSchema = z
  .object({
    title: z.string().min(1),
    body: z.string().min(1),
    audience: noticeAudienceSchema,
    classId: z.string().uuid().optional(),
  })
  .refine((data) => data.audience !== "CLASS" || Boolean(data.classId), {
    message: "classId is required when audience is CLASS",
    path: ["classId"],
  });
export type CreateNoticeInput = z.infer<typeof createNoticeSchema>;
