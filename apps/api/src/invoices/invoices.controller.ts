import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import {
  bulkInvoiceSchema,
  createInvoiceSchema,
  feeReminderSchema,
  invoiceFilterSchema,
  type BulkInvoiceInput,
  type CreateInvoiceInput,
  type FeeReminderInput,
} from "@skolara/types";
import { z } from "zod";
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

  @Get()
  @Roles("SCHOOL_ADMIN")
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query("status") status?: string,
    @Query("classId") classId?: string,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    const parsedStatus = invoiceFilterSchema.safeParse(status || "ALL");
    if (!parsedStatus.success) throw new BadRequestException("Unknown status");
    const parsedClass = z.string().uuid().optional().safeParse(classId || undefined);
    if (!parsedClass.success) throw new BadRequestException("Unknown class");
    return this.invoicesService.list(user.schoolId, {
      status: parsedStatus.data,
      classId: parsedClass.data,
    });
  }

  @Post("bulk")
  @Roles("SCHOOL_ADMIN")
  // Creates up to a school's worth of rows per call.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  createBulk(
    @Body(new ZodValidationPipe(bulkInvoiceSchema)) body: BulkInvoiceInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.invoicesService.createBulk(user.schoolId, body);
  }

  @Get("defaulters")
  @Roles("SCHOOL_ADMIN")
  defaulters(@CurrentUser() user: AuthenticatedUser) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.invoicesService.defaulters(user.schoolId);
  }

  @Post("reminders")
  @HttpCode(200)
  @Roles("SCHOOL_ADMIN")
  // Each call can notify hundreds of families; keep an eager click from spamming them.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  remind(
    @Body(new ZodValidationPipe(feeReminderSchema)) body: FeeReminderInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.invoicesService.remind(user.schoolId, body.studentIds);
  }
}
