import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { createInvoiceSchema, type CreateInvoiceInput } from "@skolara/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtOrApiKeyGuard } from "../common/guards/jwt-or-api-key.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { StudentAccessService } from "../common/student-access.service";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { InvoicesService } from "./invoices.service";

@Controller("invoices")
@UseGuards(JwtOrApiKeyGuard, RolesGuard)
export class InvoicesController {
  constructor(
    private invoicesService: InvoicesService,
    private studentAccess: StudentAccessService,
  ) {}

  @Post()
  @Roles("SCHOOL_ADMIN")
  create(
    @Body(new ZodValidationPipe(createInvoiceSchema)) body: CreateInvoiceInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (user.schoolId !== body.schoolId) {
      throw new ForbiddenException("Cannot act outside your own school");
    }
    return this.invoicesService.create(body);
  }

  @Get("student/:studentId")
  @Roles("SCHOOL_ADMIN", "PARENT", "STUDENT")
  async findForStudent(
    @Param("studentId") studentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    // Scoping to the caller's school is not enough here: without this, any
    // parent or student at the school could read any other family's fee
    // balance by swapping the id in the URL. Every other student-scoped read
    // in the API goes through this service; invoices didn't.
    await this.studentAccess.assertCanAccessStudent(user, studentId);
    return this.invoicesService.findAllForStudent(user.schoolId, studentId);
  }
}
