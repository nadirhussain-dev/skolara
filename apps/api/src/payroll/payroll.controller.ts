import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { createPayslipSchema, type CreatePayslipInput } from "@skolara/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { PayrollService } from "./payroll.service";

@Controller("payroll")
@UseGuards(JwtAuthGuard, RolesGuard)
export class PayrollController {
  constructor(private payrollService: PayrollService) {}

  @Post("payslips")
  @Roles("SCHOOL_ADMIN")
  generate(
    @Body(new ZodValidationPipe(createPayslipSchema)) body: CreatePayslipInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.payrollService.generate(user.schoolId, body);
  }

  @Get("payslips/staff/:staffUserId")
  @Roles("SCHOOL_ADMIN")
  findForStaff(
    @Param("staffUserId") staffUserId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.payrollService.findForStaff(user.schoolId, staffUserId);
  }

  @Get("payslips/mine")
  @Roles("TEACHER", "SCHOOL_ADMIN")
  findMine(@CurrentUser() user: AuthenticatedUser) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.payrollService.findForStaff(user.schoolId, user.id);
  }
}
