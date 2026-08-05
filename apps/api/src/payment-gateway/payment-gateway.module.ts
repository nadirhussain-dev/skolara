import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { StudentAccessService } from "../common/student-access.service";
import { PAYMENT_GATEWAY_PROVIDER } from "./payment-gateway-provider.interface";
import { PaymentGatewayController } from "./payment-gateway.controller";
import { PaymentGatewayService } from "./payment-gateway.service";
import { NoopPaymentGatewayProvider } from "./providers/noop-payment-gateway.provider";
import { StripePaymentGatewayProvider } from "./providers/stripe-payment-gateway.provider";

@Module({
  controllers: [PaymentGatewayController],
  providers: [
    {
      provide: PAYMENT_GATEWAY_PROVIDER,
      useFactory: (config: ConfigService) => {
        const secretKey = config.get<string>("STRIPE_SECRET_KEY");
        const webhookSecret = config.get<string>("STRIPE_WEBHOOK_SECRET");
        if (secretKey && webhookSecret) {
          return new StripePaymentGatewayProvider({
            secretKey,
            webhookSecret,
            successUrl: config.get<string>(
              "STRIPE_SUCCESS_URL",
              "http://localhost:3000/school/payments?gateway=success",
            ),
            cancelUrl: config.get<string>(
              "STRIPE_CANCEL_URL",
              "http://localhost:3000/school/payments?gateway=cancelled",
            ),
          });
        }
        return new NoopPaymentGatewayProvider();
      },
      inject: [ConfigService],
    },
    PaymentGatewayService,
    StudentAccessService,
  ],
})
export class PaymentGatewayModule {}
