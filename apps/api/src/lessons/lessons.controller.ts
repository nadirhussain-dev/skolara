import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
  addSyllabusTopicsSchema,
  updateSyllabusTopicSchema,
  upsertLessonPlanSchema,
  type AddSyllabusTopicsInput,
  type UpdateSyllabusTopicInput,
  type UpsertLessonPlanInput,
} from "@skolara/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ClassAccessService } from "../common/class-access.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { LessonsService } from "./lessons.service";

/**
 * Lesson planning is core teaching, so it isn't behind a plan entitlement —
 * the same call made for attendance, grades and the timetable. Every route is
 * still tenant-scoped and class-scoped: a teacher reaches their own classes
 * and nothing else.
 */
@ApiTags("lessons")
@ApiBearerAuth()
@Controller("lessons")
@UseGuards(JwtAuthGuard, RolesGuard)
export class LessonsController {
  constructor(
    private lessons: LessonsService,
    private classAccess: ClassAccessService,
  ) {}

  private schoolOf(user: AuthenticatedUser): string {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return user.schoolId;
  }

  // ---------- syllabus ----------

  @Post("topics")
  @Roles("TEACHER", "SCHOOL_ADMIN")
  async addTopics(
    @Body(new ZodValidationPipe(addSyllabusTopicsSchema)) body: AddSyllabusTopicsInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.classAccess.assertCanTeachClass(user, body.classId);
    return this.lessons.addTopics(this.schoolOf(user), user.id, body);
  }

  @Get("topics/class/:classId")
  @Roles("TEACHER", "SCHOOL_ADMIN")
  async findTopics(
    @Param("classId") classId: string,
    @Query("subject") subject: string | undefined,
    @Query("term") term: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.classAccess.assertCanTeachClass(user, classId);
    return this.lessons.findTopics(this.schoolOf(user), classId, { subject, term });
  }

  @Patch("topics/:id")
  @Roles("TEACHER", "SCHOOL_ADMIN")
  async updateTopic(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateSyllabusTopicSchema)) body: UpdateSyllabusTopicInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.assertCanEditTopic(user, id);
    return this.lessons.updateTopic(this.schoolOf(user), id, body);
  }

  @Delete("topics/:id")
  @Roles("TEACHER", "SCHOOL_ADMIN")
  @HttpCode(204)
  async removeTopic(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.assertCanEditTopic(user, id);
    return this.lessons.removeTopic(this.schoolOf(user), id);
  }

  @Get("coverage/class/:classId")
  @Roles("TEACHER", "SCHOOL_ADMIN")
  async coverage(
    @Param("classId") classId: string,
    @Query("term") term: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.classAccess.assertCanTeachClass(user, classId);
    return this.lessons.coverage(this.schoolOf(user), classId, term);
  }

  // ---------- lesson plans ----------

  @Post("plans")
  @Roles("TEACHER", "SCHOOL_ADMIN")
  async createPlan(
    @Body(new ZodValidationPipe(upsertLessonPlanSchema)) body: UpsertLessonPlanInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.classAccess.assertCanTeachClass(user, body.classId);
    return this.lessons.createPlan(this.schoolOf(user), user.id, body);
  }

  @Put("plans/:id")
  @Roles("TEACHER", "SCHOOL_ADMIN")
  async updatePlan(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(upsertLessonPlanSchema)) body: UpsertLessonPlanInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Both the class it is moving from and the one it is moving to: without
    // the second check a teacher could push a plan into a colleague's class.
    await this.assertCanEditPlan(user, id);
    await this.classAccess.assertCanTeachClass(user, body.classId);
    return this.lessons.updatePlan(this.schoolOf(user), id, body);
  }

  /** A teacher's own plans. The default view — planning is personal. */
  @Get("plans/mine")
  @Roles("TEACHER")
  minePlans(
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.lessons.findPlans(this.schoolOf(user), {
      teacherUserId: user.id,
      ...parseRange(from, to),
    });
  }

  @Get("plans/class/:classId")
  @Roles("TEACHER", "SCHOOL_ADMIN")
  async plansForClass(
    @Param("classId") classId: string,
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.classAccess.assertCanTeachClass(user, classId);
    return this.lessons.findPlans(this.schoolOf(user), {
      classId,
      ...parseRange(from, to),
    });
  }

  @Delete("plans/:id")
  @Roles("TEACHER", "SCHOOL_ADMIN")
  @HttpCode(204)
  async removePlan(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.assertCanEditPlan(user, id);
    return this.lessons.removePlan(this.schoolOf(user), id);
  }

  // ---------- internals ----------

  /**
   * Resolves the class from the record rather than a body parameter, so a
   * teacher can't reach a colleague's syllabus by guessing an id.
   */
  private async assertCanEditTopic(user: AuthenticatedUser, topicId: string) {
    const classId = await this.lessons.topicClassId(this.schoolOf(user), topicId);
    await this.classAccess.assertCanTeachClass(user, classId);
  }

  private async assertCanEditPlan(user: AuthenticatedUser, planId: string) {
    const classId = await this.lessons.planClassId(this.schoolOf(user), planId);
    await this.classAccess.assertCanTeachClass(user, classId);
  }
}

/** Query dates arrive as strings; an unparseable one is simply no bound. */
function parseRange(from?: string, to?: string): { from?: Date; to?: Date } {
  const parse = (value?: string) => {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  };
  return { from: parse(from), to: parse(to) };
}
