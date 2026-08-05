export interface CheckoutSessionRequest {
  invoiceId: string;
  amount: number;
  referenceId: string;
}

export interface CheckoutSession {
  provider: "STRIPE" | "NONE";
  checkoutUrl: string | null;
  clientSecret: string | null;
}

export interface VerifiedWebhookPayment {
  invoiceId: string;
  amountPaid: number;
}

export interface PaymentGatewayProvider {
  createCheckoutSession(request: CheckoutSessionRequest): Promise<CheckoutSession>;
  parseWebhookPayment(rawBody: string, signature: string): VerifiedWebhookPayment | null;
}

export const PAYMENT_GATEWAY_PROVIDER = Symbol("PAYMENT_GATEWAY_PROVIDER");
