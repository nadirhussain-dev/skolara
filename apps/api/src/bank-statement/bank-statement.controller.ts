import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { importBankStatementSchema, type ImportBankStatementInput } from "@skolara/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { BankStatementService } from "./bank-statement.service";

@Controller("bank-statement")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SCHOOL_ADMIN")
export class BankStatementController {
  constructor(private bankStatementService: BankStatementService) {}

  @Post("import")
  import(
    @Body(new ZodValidationPipe(importBankStatementSchema)) body: ImportBankStatementInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.bankStatementService.import(user.schoolId, body);
  }

  @Get("suggested-matches")
  suggestedMatches(@CurrentUser() user: AuthenticatedUser) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.bankStatementService.suggestedMatches(user.schoolId);
  }

  @Post("lines/:lineId/match/:paymentSubmissionId")
  confirmMatch(
    @Param("lineId") lineId: string,
    @Param("paymentSubmissionId") paymentSubmissionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.bankStatementService.confirmMatch(user.schoolId, lineId, paymentSubmissionId);
  }
}
