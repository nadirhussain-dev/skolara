import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { upsertGradeEntrySchema, type UpsertGradeEntryInput } from "@skolara/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RequiresFeature } from "../common/decorators/requires-feature.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtOrApiKeyGuard } from "../common/guards/jwt-or-api-key.guard";
import { FeatureGuard } from "../common/guards/feature.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { ClassAccessService } from "../common/class-access.service";
import { StudentAccessService } from "../common/student-access.service";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { GradesService } from "./grades.service";

@Controller("grades")
@UseGuards(JwtOrApiKeyGuard, RolesGuard, FeatureGuard)
export class GradesController {
  constructor(
    private gradesService: GradesService,
    private studentAccess: StudentAccessService,
    private classAccess: ClassAccessService,
  ) {}

  @Post()
  @Roles("TEACHER", "SCHOOL_ADMIN")
  async upsert(
    @Body(new ZodValidationPipe(upsertGradeEntrySchema)) body: UpsertGradeEntryInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    await this.classAccess.assertCanTeachClass(user, body.classId);
    return this.gradesService.upsert(user.schoolId, user.id, body);
  }

  @Get("class/:classId")
  @Roles("TEACHER", "SCHOOL_ADMIN")
  async findForClass(
    @Param("classId") classId: string,
    @Query("term") term: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    await this.classAccess.assertCanTeachClass(user, classId);
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

  @Patch(":id/generate-comment")
  @Roles("TEACHER", "SCHOOL_ADMIN")
  @RequiresFeature("AI")
  generateComment(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.gradesService.generateComment(user.schoolId, id);
  }
}
