import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  createAssignmentSchema,
  gradeAssignmentSchema,
  submitAssignmentSchema,
  type CreateAssignmentInput,
  type GradeAssignmentInput,
  type SubmitAssignmentInput,
} from "@skolara/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RequiresFeature } from "../common/decorators/requires-feature.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { FeatureGuard } from "../common/guards/feature.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { StudentAccessService } from "../common/student-access.service";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { ClassAccessService } from "../common/class-access.service";
import { AssignmentsService } from "./assignments.service";

@Controller("assignments")
@RequiresFeature("ASSIGNMENTS")
@UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
export class AssignmentsController {
  constructor(
    private assignmentsService: AssignmentsService,
    private classAccess: ClassAccessService,
    private studentAccess: StudentAccessService,
  ) {}

  @Post()
  @Roles("TEACHER", "SCHOOL_ADMIN")
  async create(
    @Body(new ZodValidationPipe(createAssignmentSchema)) body: CreateAssignmentInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    // Students and parents read assignments for their own class; only someone
    // who teaches the class may set them.
    await this.classAccess.assertCanTeachClass(user, body.classId);
    return this.assignmentsService.create(user.schoolId, user.id, body);
  }

  @Get("class/:classId")
  @Roles("TEACHER", "SCHOOL_ADMIN", "STUDENT", "PARENT")
  findForClass(
    @Param("classId") classId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.assignmentsService.findForClass(user.schoolId, classId);
  }

  @Post(":id/submissions/:studentId")
  @Roles("STUDENT", "PARENT")
  async submit(
    @Param("id") assignmentId: string,
    @Param("studentId") studentId: string,
    @Body(new ZodValidationPipe(submitAssignmentSchema)) body: SubmitAssignmentInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.studentAccess.assertCanAccessStudent(user, studentId);
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.assignmentsService.submit(user.schoolId, studentId, assignmentId, body);
  }

  @Get(":id/submissions")
  @Roles("TEACHER", "SCHOOL_ADMIN")
  findSubmissions(@Param("id") assignmentId: string, @CurrentUser() user: AuthenticatedUser) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.assignmentsService.findSubmissions(user.schoolId, assignmentId);
  }

  @Patch("submissions/:submissionId/grade")
  @Roles("TEACHER", "SCHOOL_ADMIN")
  grade(
    @Param("submissionId") submissionId: string,
    @Body(new ZodValidationPipe(gradeAssignmentSchema)) body: GradeAssignmentInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.assignmentsService.grade(user.schoolId, submissionId, body);
  }

  @Get("student/:studentId")
  @Roles("TEACHER", "SCHOOL_ADMIN", "STUDENT", "PARENT")
  async findForStudent(
    @Param("studentId") studentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.studentAccess.assertCanAccessStudent(user, studentId);
    return this.assignmentsService.findForStudent(studentId);
  }
}
