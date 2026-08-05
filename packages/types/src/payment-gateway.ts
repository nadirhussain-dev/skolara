import { z } from "zod";

export const initiateGatewayPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
});
export type InitiateGatewayPaymentInput = z.infer<
  typeof initiateGatewayPaymentSchema
>;

export const gatewayPaymentSessionSchema = z.object({
  provider: z.enum(["STRIPE", "NONE"]),
  checkoutUrl: z.string().url().nullable(),
  clientSecret: z.string().nullable(),
});
export type GatewayPaymentSession = z.infer<typeof gatewayPaymentSessionSchema>;
