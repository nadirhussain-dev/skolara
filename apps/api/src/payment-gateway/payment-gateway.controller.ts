import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { PaymentGatewayService } from "./payment-gateway.service";

@Controller("payments/gateway")
export class PaymentGatewayController {
  constructor(private paymentGatewayService: PaymentGatewayService) {}

  @Post("checkout/:invoiceId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("PARENT", "STUDENT")
  async initiateCheckout(
    @Param("invoiceId") invoiceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.paymentGatewayService.initiateCheckout(user.schoolId, invoiceId, user);
  }

  // Stripe calls this directly (no JWT) — authenticity comes from the
  // webhook signature, verified against the raw request body.
  @Post("webhook")
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("stripe-signature") signature: string,
  ) {
    if (!req.rawBody) throw new BadRequestException("Missing raw body");
    return this.paymentGatewayService.handleWebhook(req.rawBody.toString(), signature);
  }
}
