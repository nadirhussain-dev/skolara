import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import {
  reviewPaymentSchema,
  submitPaymentSchema,
  type PaymentSubmissionStatus,
  type ReviewPaymentInput,
  type SubmitPaymentInput,
} from "@skolara/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { PaymentsService } from "./payments.service";

@Controller("payments")
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post("student/:studentId")
  @Roles("PARENT", "STUDENT")
  @UsePipes(new ZodValidationPipe(submitPaymentSchema))
  async submit(
    @Param("studentId") studentId: string,
    @Body() body: SubmitPaymentInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    await this.paymentsService.assertCanSubmitFor(user, studentId);
    return this.paymentsService.submitPayment(
      user.schoolId,
      studentId,
      user.id,
      body,
    );
  }

  @Get("queue")
  @Roles("SCHOOL_ADMIN")
  queue(
    @Query("status") status: PaymentSubmissionStatus | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.paymentsService.listQueue(user.schoolId, status);
  }

  @Patch(":id/review")
  @Roles("SCHOOL_ADMIN")
  @UsePipes(new ZodValidationPipe(reviewPaymentSchema))
  review(
    @Param("id") id: string,
    @Body() body: ReviewPaymentInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.paymentsService.review(user.schoolId, id, user.id, body);
  }
}
