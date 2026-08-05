import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  assignStudentToBusSchema,
  createBusSchema,
  reportBusLocationSchema,
  type AssignStudentToBusInput,
  type CreateBusInput,
  type ReportBusLocationInput,
} from "@skolara/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { StudentAccessService } from "../common/student-access.service";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { TransportService } from "./transport.service";

@Controller("transport")
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransportController {
  constructor(
    private transportService: TransportService,
    private studentAccess: StudentAccessService,
  ) {}

  @Post("buses")
  @Roles("SCHOOL_ADMIN")
  createBus(
    @Body(new ZodValidationPipe(createBusSchema)) body: CreateBusInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.transportService.createBus(user.schoolId, body);
  }

  @Get("buses")
  @Roles("SCHOOL_ADMIN", "TEACHER")
  findBuses(@CurrentUser() user: AuthenticatedUser) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.transportService.findBuses(user.schoolId);
  }

  @Post("buses/:id/assign")
  @Roles("SCHOOL_ADMIN")
  assignStudent(
    @Param("id") busId: string,
    @Body(new ZodValidationPipe(assignStudentToBusSchema)) body: AssignStudentToBusInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.transportService.assignStudent(user.schoolId, busId, body);
  }

  // Stands in for a dedicated driver app: whoever is escorting the bus
  // (typically school staff) pings the current GPS coordinates.
  @Post("buses/:id/location")
  @Roles("SCHOOL_ADMIN", "TEACHER")
  reportLocation(
    @Param("id") busId: string,
    @Body(new ZodValidationPipe(reportBusLocationSchema)) body: ReportBusLocationInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.transportService.reportLocation(user.schoolId, busId, body);
  }

  @Get("buses/:id/location")
  @Roles("SCHOOL_ADMIN", "TEACHER", "PARENT", "STUDENT")
  latestLocation(@Param("id") busId: string, @CurrentUser() user: AuthenticatedUser) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.transportService.latestLocation(user.schoolId, busId);
  }

  @Get("student/:studentId")
  @Roles("SCHOOL_ADMIN", "PARENT", "STUDENT")
  async findForStudent(
    @Param("studentId") studentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    await this.studentAccess.assertCanAccessStudent(user, studentId);
    return this.transportService.findForStudent(user.schoolId, studentId);
  }
}
