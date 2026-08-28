import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { markAttendanceSchema, type MarkAttendanceInput } from "@skolara/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtOrApiKeyGuard } from "../common/guards/jwt-or-api-key.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { AttendanceService } from "./attendance.service";

@Controller("attendance")
@UseGuards(JwtOrApiKeyGuard, RolesGuard)
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  @Post()
  @Roles("TEACHER", "SCHOOL_ADMIN")
  mark(
    @Body(new ZodValidationPipe(markAttendanceSchema)) body: MarkAttendanceInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.attendanceService.markAttendance(user.schoolId, user.id, body);
  }

  @Get("class/:classId")
  @Roles("TEACHER", "SCHOOL_ADMIN")
  findByClass(
    @Param("classId") classId: string,
    @Query("date") date: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.attendanceService.findByClassAndDate(
      user.schoolId,
      classId,
      new Date(date),
    );
  }

  @Get("student/:studentId")
  @Roles("TEACHER", "SCHOOL_ADMIN", "PARENT", "STUDENT")
  findForStudent(
    @Param("studentId") studentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.attendanceService.findForStudent(user.schoolId, studentId);
  }
}
