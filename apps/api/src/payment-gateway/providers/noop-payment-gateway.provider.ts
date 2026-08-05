import { Logger } from "@nestjs/common";
import type {
  CheckoutSession,
  CheckoutSessionRequest,
  PaymentGatewayProvider,
  VerifiedWebhookPayment,
} from "../payment-gateway-provider.interface";

export class NoopPaymentGatewayProvider implements PaymentGatewayProvider {
  private readonly logger = new Logger(NoopPaymentGatewayProvider.name);

  async createCheckoutSession(request: CheckoutSessionRequest): Promise<CheckoutSession> {
    this.logger.log(
      `[Gateway stub] No provider configured — invoice ${request.invoiceId} stays manual-only.`,
    );
    return { provider: "NONE", checkoutUrl: null, clientSecret: null };
  }

  parseWebhookPayment(): VerifiedWebhookPayment | null {
    return null;
  }
}
