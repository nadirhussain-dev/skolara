import { z } from "zod";

export const devicePlatformSchema = z.enum(["IOS", "ANDROID", "WEB"]);
export type DevicePlatform = z.infer<typeof devicePlatformSchema>;

export const registerDeviceSchema = z.object({
  /** Expo push token, e.g. "ExponentPushToken[xxxxxxxx]". */
  token: z.string().min(1),
  platform: devicePlatformSchema,
});
export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;

export const deviceTokenSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  token: z.string(),
  platform: devicePlatformSchema,
  createdAt: z.coerce.date(),
  lastSeenAt: z.coerce.date(),
});
export type DeviceToken = z.infer<typeof deviceTokenSchema>;
