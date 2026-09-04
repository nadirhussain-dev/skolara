import { z } from "zod";

/**
 * Which phone channel a school's alerts go out on.
 *
 * SMS is billed per message and WhatsApp effectively isn't, so `BOTH` is a
 * deliberate choice a school makes rather than a default it discovers on an
 * invoice.
 */
export const phoneChannelSchema = z.enum(["WHATSAPP", "SMS", "BOTH"]);
export type PhoneChannel = z.infer<typeof phoneChannelSchema>;

export const updateCommunicationSchema = z.object({
  phoneChannel: phoneChannelSchema,
});
export type UpdateCommunicationInput = z.infer<typeof updateCommunicationSchema>;
