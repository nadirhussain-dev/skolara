import { z } from "zod";

export const inAppNotificationSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  body: z.string(),
  /** Where tapping it should lead, e.g. { screen: "payments" }. */
  data: z.record(z.string()).nullable(),
  readAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
});
export type InAppNotification = z.infer<typeof inAppNotificationSchema>;

export const notificationInboxSchema = z.object({
  unreadCount: z.number(),
  items: z.array(inAppNotificationSchema),
});
export type NotificationInbox = z.infer<typeof notificationInboxSchema>;

/** Omit `ids` to mark everything read. */
export const markNotificationsReadSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100).optional(),
});
export type MarkNotificationsReadInput = z.infer<typeof markNotificationsReadSchema>;
