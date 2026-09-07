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
import { ClassAccessService } from "../common/class-access.service";
import { StudentAccessService } from "../common/student-access.service";
import { AttendanceService } from "./attendance.service";

@Controller("attendance")
@UseGuards(JwtOrApiKeyGuard, RolesGuard)
export class AttendanceController {
  constructor(
    private attendanceService: AttendanceService,
    private classAccess: ClassAccessService,
    private studentAccess: StudentAccessService,
  ) {}

  @Post()
  @Roles("TEACHER", "SCHOOL_ADMIN")
  async mark(
    @Body(new ZodValidationPipe(markAttendanceSchema)) body: MarkAttendanceInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    await this.classAccess.assertCanTeachClass(user, body.classId);
    return this.attendanceService.markAttendance(user.schoolId, user.id, body);
  }

  @Get("school-day")
  @Roles("SCHOOL_ADMIN")
  schoolDaySummary(
    @Query("date") date: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.attendanceService.schoolDaySummary(user.schoolId, new Date(date));
  }

  @Get("class/:classId")
  @Roles("TEACHER", "SCHOOL_ADMIN")
  async findByClass(
    @Param("classId") classId: string,
    @Query("date") date: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    await this.classAccess.assertCanTeachClass(user, classId);
    return this.attendanceService.findByClassAndDate(
      user.schoolId,
      classId,
      new Date(date),
    );
  }

  @Get("student/:studentId")
  @Roles("TEACHER", "SCHOOL_ADMIN", "PARENT", "STUDENT")
  async findForStudent(
    @Param("studentId") studentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    // Without this, any parent at the school could read any other child's
    // attendance history — including which days they were absent — by
    // changing the id in the URL.
    await this.studentAccess.assertCanAccessStudent(user, studentId);
    return this.attendanceService.findForStudent(user.schoolId, studentId);
  }
}
