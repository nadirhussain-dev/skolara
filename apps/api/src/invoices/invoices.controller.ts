import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { createInvoiceSchema, type CreateInvoiceInput } from "@skolara/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { InvoicesService } from "./invoices.service";

@Controller("invoices")
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  @Post()
  @Roles("SCHOOL_ADMIN")
  @UsePipes(new ZodValidationPipe(createInvoiceSchema))
  create(@Body() body: CreateInvoiceInput, @CurrentUser() user: AuthenticatedUser) {
    if (user.schoolId !== body.schoolId) {
      throw new ForbiddenException("Cannot act outside your own school");
    }
    return this.invoicesService.create(body);
  }

  @Get("student/:studentId")
  @Roles("SCHOOL_ADMIN", "PARENT", "STUDENT")
  findForStudent(
    @Param("studentId") studentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.invoicesService.findAllForStudent(user.schoolId, studentId);
  }
}
