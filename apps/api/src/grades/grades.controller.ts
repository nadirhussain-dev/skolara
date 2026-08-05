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
import { upsertGradeEntrySchema, type UpsertGradeEntryInput } from "@skolara/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { StudentAccessService } from "../common/student-access.service";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { GradesService } from "./grades.service";

@Controller("grades")
@UseGuards(JwtAuthGuard, RolesGuard)
export class GradesController {
  constructor(
    private gradesService: GradesService,
    private studentAccess: StudentAccessService,
  ) {}

  @Post()
  @Roles("TEACHER", "SCHOOL_ADMIN")
  upsert(
    @Body(new ZodValidationPipe(upsertGradeEntrySchema)) body: UpsertGradeEntryInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.gradesService.upsert(user.schoolId, user.id, body);
  }

  @Get("class/:classId")
  @Roles("TEACHER", "SCHOOL_ADMIN")
  findForClass(
    @Param("classId") classId: string,
    @Query("term") term: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.gradesService.findForClass(user.schoolId, classId, term);
  }

  @Get("student/:studentId")
  @Roles("TEACHER", "SCHOOL_ADMIN", "PARENT", "STUDENT")
  async findForStudent(
    @Param("studentId") studentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    await this.studentAccess.assertCanAccessStudent(user, studentId);
    return this.gradesService.findForStudent(user.schoolId, studentId);
  }
}
