import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { admitStudentSchema, type AdmitStudentInput } from "@skolara/types";
import { z } from "zod";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtOrApiKeyGuard } from "../common/guards/jwt-or-api-key.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { ClassAccessService } from "../common/class-access.service";
import { StudentsService } from "./students.service";

const assignClassSchema = z.object({ classId: z.string().uuid() });
const linkParentSchema = z.object({ parentUserId: z.string().uuid() });

@Controller("students")
@UseGuards(JwtOrApiKeyGuard, RolesGuard)
@Roles("SCHOOL_ADMIN")
export class StudentsController {
  constructor(
    private studentsService: StudentsService,
    private classAccess: ClassAccessService,
  ) {}

  @Post()
  admit(
    @Body(new ZodValidationPipe(admitStudentSchema)) body: AdmitStudentInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (user.schoolId !== body.schoolId) {
      throw new ForbiddenException("Cannot act outside your own school");
    }
    return this.studentsService.admit(body);
  }

  @Get()
  @Roles("SCHOOL_ADMIN", "TEACHER")
  async findAllForClass(
    @Query("classId") classId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    if (user.role === "TEACHER") {
      // A teacher needs the roster of a class they teach, to take its
      // register and enter its marks, and nothing wider: not the whole
      // school, and not a colleague's class.
      if (!classId) throw new ForbiddenException("Choose a class");
      await this.classAccess.assertCanTeachClass(user, classId);
    }
    // For an admin, no classId means the whole school.
    return this.studentsService.findAllForClass(user.schoolId, classId || undefined);
  }

  @Get("mine")
  @Roles("PARENT", "STUDENT")
  findMine(@CurrentUser() user: AuthenticatedUser) {
    // A parent's children, or for a student account, the student themself, so
    // the family app works the same way for both.
    return user.role === "STUDENT"
      ? this.studentsService.findOwnProfile(user.id)
      : this.studentsService.findChildrenForParent(user.id);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.studentsService.findOne(user.schoolId, id);
  }

  @Patch(":id/class")
  assignClass(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(assignClassSchema)) body: { classId: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.studentsService.assignClass(user.schoolId, id, body.classId);
  }

  @Get(":id/parents")
  findParents(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.studentsService.findParents(user.schoolId, id);
  }

  @Post(":id/parents")
  linkParent(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(linkParentSchema)) body: { parentUserId: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.studentsService.linkParent(user.schoolId, id, body.parentUserId);
  }

  @Delete(":id/parents/:parentUserId")
  unlinkParent(
    @Param("id") id: string,
    @Param("parentUserId") parentUserId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.studentsService.unlinkParent(user.schoolId, id, parentUserId);
  }
}
