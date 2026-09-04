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
  createQuizSchema,
  replaceQuizQuestionsSchema,
  saveQuizAnswerSchema,
  type CreateQuizInput,
  type ReplaceQuizQuestionsInput,
  type SaveQuizAnswerInput,
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
import { QuizzesService } from "./quizzes.service";

// Quizzes are assessment, so they gate on the same entitlement as exams.
@ApiTags("quizzes")
@ApiBearerAuth()
@Controller("quizzes")
@RequiresFeature("EXAMS")
@UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
export class QuizzesController {
  constructor(
    private quizzes: QuizzesService,
    private classAccess: ClassAccessService,
    private studentAccess: StudentAccessService,
  ) {}

  private schoolOf(user: AuthenticatedUser): string {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return user.schoolId;
  }

  // ---------- authoring ----------

  @Post()
  @Roles("TEACHER", "SCHOOL_ADMIN")
  async create(
    @Body(new ZodValidationPipe(createQuizSchema)) body: CreateQuizInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.classAccess.assertCanTeachClass(user, body.classId);
    return this.quizzes.create(this.schoolOf(user), user.id, body);
  }

  @Put(":id/questions")
  @Roles("TEACHER", "SCHOOL_ADMIN")
  async replaceQuestions(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(replaceQuizQuestionsSchema))
    body: ReplaceQuizQuestionsInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.assertCanEdit(user, id);
    return this.quizzes.replaceQuestions(this.schoolOf(user), id, body);
  }

  @Patch(":id/publish")
  @Roles("TEACHER", "SCHOOL_ADMIN")
  async publish(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.assertCanEdit(user, id);
    return this.quizzes.publish(this.schoolOf(user), id);
  }

  @Delete(":id")
  @Roles("TEACHER", "SCHOOL_ADMIN")
  @HttpCode(204)
  async remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.assertCanEdit(user, id);
    return this.quizzes.remove(this.schoolOf(user), id);
  }

  // ---------- staff reads ----------

  @Get("class/:classId")
  @Roles("TEACHER", "SCHOOL_ADMIN")
  async findForClass(
    @Param("classId") classId: string,
    @Query("subject") subject: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.classAccess.assertCanTeachClass(user, classId);
    return this.quizzes.findForClass(this.schoolOf(user), classId, subject);
  }

  /**
   * The paper with its answer key. Staff only, and the route deliberately
   * doesn't accept student or parent roles at all — a nulled-out answer key is
   * one refactor away from being a leaked one.
   */
  @Get(":id")
  @Roles("TEACHER", "SCHOOL_ADMIN")
  async findOne(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.assertCanEdit(user, id);
    return this.quizzes.findOne(this.schoolOf(user), id);
  }

  @Get(":id/results")
  @Roles("TEACHER", "SCHOOL_ADMIN")
  async results(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.assertCanEdit(user, id);
    return this.quizzes.results(this.schoolOf(user), id);
  }

  // ---------- student and family reads ----------

  @Get("student/:studentId/available")
  @Roles("STUDENT", "PARENT", "TEACHER", "SCHOOL_ADMIN")
  async findForStudent(
    @Param("studentId") studentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.studentAccess.assertCanAccessStudent(user, studentId);
    return this.quizzes.findForStudent(this.schoolOf(user), studentId);
  }

  @Get("student/:studentId/attempts")
  @Roles("STUDENT", "PARENT", "TEACHER", "SCHOOL_ADMIN")
  async attemptsForStudent(
    @Param("studentId") studentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.studentAccess.assertCanAccessStudent(user, studentId);
    return this.quizzes.attemptsForStudent(this.schoolOf(user), studentId);
  }

  // ---------- sitting a quiz ----------
  //
  // Students only, throughout. A parent may read their child's results but may
  // not open a paper or answer a question on their behalf — which is why these
  // routes take no student id and resolve the sitter from the token instead.

  @Post(":id/attempts")
  @Roles("STUDENT")
  start(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.quizzes.startAttempt(this.schoolOf(user), id, user.id);
  }

  @Put("attempts/:attemptId/answer")
  @Roles("STUDENT")
  saveAnswer(
    @Param("attemptId") attemptId: string,
    @Body(new ZodValidationPipe(saveQuizAnswerSchema)) body: SaveQuizAnswerInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.quizzes.saveAnswer(this.schoolOf(user), attemptId, user.id, body);
  }

  @Post("attempts/:attemptId/submit")
  @Roles("STUDENT")
  submit(@Param("attemptId") attemptId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.quizzes.submitAttempt(this.schoolOf(user), attemptId, user.id);
  }

  // ---------- internals ----------

  /**
   * A quiz is editable by whoever teaches its class. Resolving the class from
   * the quiz rather than trusting a body parameter means a teacher can't reach
   * a colleague's paper by guessing an id.
   */
  private async assertCanEdit(user: AuthenticatedUser, quizId: string) {
    const quiz = await this.quizzes.findOne(this.schoolOf(user), quizId);
    await this.classAccess.assertCanTeachClass(user, quiz.classId);
  }
}
