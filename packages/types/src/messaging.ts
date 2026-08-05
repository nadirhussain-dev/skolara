import { z } from "zod";

export const messageThreadSchema = z.object({
  id: z.string().uuid(),
  schoolId: z.string().uuid(),
  studentId: z.string().uuid(),
  teacherUserId: z.string().uuid(),
  parentUserId: z.string().uuid(),
  createdAt: z.coerce.date(),
});
export type MessageThread = z.infer<typeof messageThreadSchema>;

export const startThreadSchema = z.object({
  studentId: z.string().uuid(),
  teacherUserId: z.string().uuid(),
});
export type StartThreadInput = z.infer<typeof startThreadSchema>;

export const messageSchema = z.object({
  id: z.string().uuid(),
  threadId: z.string().uuid(),
  senderId: z.string().uuid(),
  body: z.string().min(1),
  createdAt: z.coerce.date(),
});
export type Message = z.infer<typeof messageSchema>;

export const sendMessageSchema = z.object({
  body: z.string().min(1),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
