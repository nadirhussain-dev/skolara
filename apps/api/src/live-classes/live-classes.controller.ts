import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { upsertLiveClassSchema, type UpsertLiveClassInput } from "@skolara/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ClassAccessService } from "../common/class-access.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { StudentAccessService } from "../common/student-access.service";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { LiveClassesService } from "./live-classes.service";

@ApiTags("live-classes")
@ApiBearerAuth()
@Controller("live-classes")
@UseGuards(JwtAuthGuard, RolesGuard)
export class LiveClassesController {
  constructor(
    private liveClasses: LiveClassesService,
    private classAccess: ClassAccessService,
    private studentAccess: StudentAccessService,
  ) {}

  private schoolOf(user: AuthenticatedUser): string {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return user.schoolId;
  }

  @Post()
  @Roles("TEACHER", "SCHOOL_ADMIN")
  async create(
    @Body(new ZodValidationPipe(upsertLiveClassSchema)) body: UpsertLiveClassInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.classAccess.assertCanTeachClass(user, body.classId);
    return this.liveClasses.create(this.schoolOf(user), user.id, body);
  }

  @Put(":id")
  @Roles("TEACHER", "SCHOOL_ADMIN")
  async update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(upsertLiveClassSchema)) body: UpsertLiveClassInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Both classes: the one it currently belongs to, and the one it is being
    // moved to. Checking only the second would let a teacher rewrite a session
    // in a class they don't teach.
    await this.assertCanEdit(user, id);
    await this.classAccess.assertCanTeachClass(user, body.classId);
    return this.liveClasses.update(this.schoolOf(user), id, body);
  }

  @Delete(":id")
  @Roles("TEACHER", "SCHOOL_ADMIN")
  @HttpCode(204)
  async remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.assertCanEdit(user, id);
    return this.liveClasses.remove(this.schoolOf(user), id);
  }

  @Get("class/:classId")
  @Roles("TEACHER", "SCHOOL_ADMIN")
  async findForClass(
    @Param("classId") classId: string,
    @Query("includePast") includePast: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.classAccess.assertCanTeachClass(user, classId);
    return this.liveClasses.findForClass(
      this.schoolOf(user),
      classId,
      includePast === "true",
    );
  }

  @Get("mine")
  @Roles("TEACHER")
  mine(
    @Query("includePast") includePast: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.liveClasses.findForHost(
      this.schoolOf(user),
      user.id,
      includePast === "true",
    );
  }

  /**
   * The student and parent view. Separate route rather than a role added to
   * the class one, because this is the shape that withholds the link outside
   * the join window — the class route deliberately always carries it.
   */
  @Get("student/:studentId")
  @Roles("STUDENT", "PARENT", "TEACHER", "SCHOOL_ADMIN")
  async findForStudent(
    @Param("studentId") studentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.studentAccess.assertCanAccessStudent(user, studentId);
    return this.liveClasses.findForStudent(this.schoolOf(user), studentId);
  }

  private async assertCanEdit(user: AuthenticatedUser, id: string) {
    const classId = await this.liveClasses.classIdOf(this.schoolOf(user), id);
    await this.classAccess.assertCanTeachClass(user, classId);
  }
}
