import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { StudentAccessService } from "../common/student-access.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  PAYMENT_GATEWAY_PROVIDER,
  type PaymentGatewayProvider,
} from "./payment-gateway-provider.interface";

@Injectable()
export class PaymentGatewayService {
  constructor(
    @Inject(PAYMENT_GATEWAY_PROVIDER) private provider: PaymentGatewayProvider,
    private prisma: PrismaService,
    private studentAccess: StudentAccessService,
  ) {}

  async initiateCheckout(schoolId: string, invoiceId: string, user: AuthenticatedUser) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, schoolId },
    });
    if (!invoice) throw new NotFoundException("Invoice not found");
    await this.studentAccess.assertCanAccessStudent(user, invoice.studentId);

    const remaining = Number(invoice.amountDue) - Number(invoice.amountPaid);
    return this.provider.createCheckoutSession({
      invoiceId,
      amount: remaining,
      referenceId: invoice.term,
    });
  }

  async handleWebhook(rawBody: string, signature: string) {
    const payment = this.provider.parseWebhookPayment(rawBody, signature);
    if (!payment) return { handled: false };

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: payment.invoiceId },
    });
    if (!invoice) return { handled: false };

    const amountPaid = Number(invoice.amountPaid) + payment.amountPaid;
    const status = amountPaid >= Number(invoice.amountDue) ? "PAID" : "PARTIALLY_PAID";

    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: { amountPaid, status },
    });

    return { handled: true };
  }
}
