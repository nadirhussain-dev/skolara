import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
  publishStudyMaterialSchema,
  type PublishStudyMaterialInput,
} from "@skolara/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RequiresFeature } from "../common/decorators/requires-feature.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ClassAccessService } from "../common/class-access.service";
import { FeatureGuard } from "../common/guards/feature.guard";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { StudentAccessService } from "../common/student-access.service";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { StudyMaterialsService } from "./study-materials.service";

// Materials sit in the same family as homework — the proposal's "upload class
// materials" row was reachable only through an assignment attachment before
// this — so they gate on the same entitlement.
@ApiTags("study-materials")
@ApiBearerAuth()
@Controller("study-materials")
@RequiresFeature("ASSIGNMENTS")
@UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
export class StudyMaterialsController {
  constructor(
    private materials: StudyMaterialsService,
    private classAccess: ClassAccessService,
    private studentAccess: StudentAccessService,
  ) {}

  private schoolOf(user: AuthenticatedUser): string {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return user.schoolId;
  }

  @Post()
  @Roles("TEACHER", "SCHOOL_ADMIN")
  async publish(
    @Body(new ZodValidationPipe(publishStudyMaterialSchema))
    body: PublishStudyMaterialInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.classAccess.assertCanTeachClass(user, body.classId);
    return this.materials.publish(this.schoolOf(user), user.id, body);
  }

  @Get("class/:classId")
  @Roles("TEACHER", "SCHOOL_ADMIN")
  async findForClass(
    @Param("classId") classId: string,
    @Query("subject") subject: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.classAccess.assertCanTeachClass(user, classId);
    return this.materials.findForClass(this.schoolOf(user), classId, subject);
  }

  @Get("class/:classId/subjects")
  @Roles("TEACHER", "SCHOOL_ADMIN")
  async subjectsForClass(
    @Param("classId") classId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.classAccess.assertCanTeachClass(user, classId);
    return this.materials.subjectsForClass(this.schoolOf(user), classId);
  }

  /**
   * How students and parents read the library. Deliberately not the class
   * route: that one asserts the caller teaches the class, and widening it for
   * families would let any parent enumerate any class in the school.
   */
  @Get("student/:studentId")
  @Roles("TEACHER", "SCHOOL_ADMIN", "STUDENT", "PARENT")
  async findForStudent(
    @Param("studentId") studentId: string,
    @Query("subject") subject: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.studentAccess.assertCanAccessStudent(user, studentId);
    return this.materials.findForStudent(this.schoolOf(user), studentId, subject);
  }

  @Delete(":id")
  @Roles("TEACHER", "SCHOOL_ADMIN")
  @HttpCode(204)
  withdraw(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.materials.withdraw(this.schoolOf(user), id, user);
  }
}
