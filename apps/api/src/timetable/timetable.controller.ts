import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Put,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
  createPeriodSchema,
  upsertTimetableEntrySchema,
  type CreatePeriodInput,
  type UpsertTimetableEntryInput,
} from "@skolara/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { StudentAccessService } from "../common/student-access.service";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { TimetableService } from "./timetable.service";

@ApiTags("timetable")
@ApiBearerAuth()
@Controller("timetable")
@UseGuards(JwtAuthGuard, RolesGuard)
export class TimetableController {
  constructor(
    private timetableService: TimetableService,
    private studentAccess: StudentAccessService,
  ) {}

  private schoolOf(user: AuthenticatedUser): string {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return user.schoolId;
  }

  // ---------- periods ----------

  @Get("periods")
  @Roles("SCHOOL_ADMIN", "TEACHER", "STUDENT", "PARENT")
  listPeriods(@CurrentUser() user: AuthenticatedUser) {
    return this.timetableService.listPeriods(this.schoolOf(user));
  }

  @Post("periods")
  @Roles("SCHOOL_ADMIN")
  createPeriod(
    @Body(new ZodValidationPipe(createPeriodSchema)) body: CreatePeriodInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.timetableService.createPeriod(this.schoolOf(user), body);
  }

  @Delete("periods/:id")
  @Roles("SCHOOL_ADMIN")
  @HttpCode(204)
  deletePeriod(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.timetableService.deletePeriod(this.schoolOf(user), id);
  }

  // ---------- entries ----------

  /**
   * Idempotent by (class, day, period): placing a lesson replaces whatever that
   * class had in the slot, which is why this is a PUT rather than a POST.
   */
  @Put("entries")
  @Roles("SCHOOL_ADMIN")
  upsertEntry(
    @Body(new ZodValidationPipe(upsertTimetableEntrySchema))
    body: UpsertTimetableEntryInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.timetableService.upsertEntry(this.schoolOf(user), body);
  }

  @Delete("entries/:id")
  @Roles("SCHOOL_ADMIN")
  @HttpCode(204)
  deleteEntry(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.timetableService.deleteEntry(this.schoolOf(user), id);
  }

  // ---------- reads ----------

  /**
   * Readable by every role in the school. A timetable isn't sensitive — a
   * student seeing another class's schedule is normal, and it's what makes a
   * shared school-wide view possible.
   */
  @Get("class/:classId")
  @Roles("SCHOOL_ADMIN", "TEACHER", "STUDENT", "PARENT")
  forClass(
    @Param("classId") classId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.timetableService.forClass(this.schoolOf(user), classId);
  }

  @Get("mine")
  @Roles("TEACHER")
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.timetableService.forTeacher(this.schoolOf(user), user.id);
  }

  @Get("teacher/:teacherUserId")
  @Roles("SCHOOL_ADMIN")
  forTeacher(
    @Param("teacherUserId") teacherUserId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.timetableService.forTeacher(this.schoolOf(user), teacherUserId);
  }

  @Get("student/:studentId")
  @Roles("SCHOOL_ADMIN", "TEACHER", "STUDENT", "PARENT")
  async forStudent(
    @Param("studentId") studentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Parents and students may only read their own; the guard above only
    // establishes the role.
    await this.studentAccess.assertCanAccessStudent(user, studentId);
    return this.timetableService.forStudent(this.schoolOf(user), studentId);
  }
}
