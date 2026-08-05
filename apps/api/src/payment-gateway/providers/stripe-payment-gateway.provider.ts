import { Logger } from "@nestjs/common";
import Stripe from "stripe";
import type {
  CheckoutSession,
  CheckoutSessionRequest,
  PaymentGatewayProvider,
  VerifiedWebhookPayment,
} from "../payment-gateway-provider.interface";

export interface StripeGatewayConfig {
  secretKey: string;
  webhookSecret: string;
  successUrl: string;
  cancelUrl: string;
}

export class StripePaymentGatewayProvider implements PaymentGatewayProvider {
  private readonly logger = new Logger(StripePaymentGatewayProvider.name);
  private readonly stripe: Stripe;

  constructor(private config: StripeGatewayConfig) {
    this.stripe = new Stripe(config.secretKey);
  }

  async createCheckoutSession(request: CheckoutSessionRequest): Promise<CheckoutSession> {
    const session = await this.stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "pkr",
            product_data: { name: `Invoice ${request.referenceId}` },
            unit_amount: Math.round(request.amount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: { invoiceId: request.invoiceId },
      success_url: this.config.successUrl,
      cancel_url: this.config.cancelUrl,
    });

    return {
      provider: "STRIPE",
      checkoutUrl: session.url,
      clientSecret: session.client_secret,
    };
  }

  parseWebhookPayment(rawBody: string, signature: string): VerifiedWebhookPayment | null {
    try {
      const event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.config.webhookSecret,
      );
      if (event.type !== "checkout.session.completed") return null;

      const session = event.data.object as Stripe.Checkout.Session;
      const invoiceId = session.metadata?.invoiceId;
      if (!invoiceId || !session.amount_total) return null;

      return { invoiceId, amountPaid: session.amount_total / 100 };
    } catch (error) {
      this.logger.warn(`Stripe webhook verification failed: ${error}`);
      return null;
    }
  }
}
