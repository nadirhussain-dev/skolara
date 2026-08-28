import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { createClassSchema, type CreateClassInput } from "@skolara/types";
import { z } from "zod";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtOrApiKeyGuard } from "../common/guards/jwt-or-api-key.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { ClassesService } from "./classes.service";

const assignTeacherSchema = z.object({ teacherUserId: z.string().uuid() });

@Controller("classes")
@UseGuards(JwtOrApiKeyGuard, RolesGuard)
export class ClassesController {
  constructor(private classesService: ClassesService) {}

  @Post()
  @Roles("SCHOOL_ADMIN")
  create(
    @Body(new ZodValidationPipe(createClassSchema)) body: CreateClassInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.assertSameSchool(user, body.schoolId);
    return this.classesService.create(body);
  }

  @Get()
  @Roles("SCHOOL_ADMIN", "TEACHER")
  findAll(@CurrentUser() user: AuthenticatedUser) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    // A teacher's class list is their own classes, not the whole school's.
    return this.classesService.findAllForSchool(
      user.schoolId,
      user.role === "TEACHER" ? user.id : undefined,
    );
  }

  @Get(":id/teachers")
  @Roles("SCHOOL_ADMIN")
  findTeachers(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.classesService.findTeachers(user.schoolId, id);
  }

  @Post(":id/teachers")
  @Roles("SCHOOL_ADMIN")
  assignTeacher(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(assignTeacherSchema)) body: { teacherUserId: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.classesService.assignTeacher(user.schoolId, id, body.teacherUserId);
  }

  @Delete(":id/teachers/:teacherUserId")
  @Roles("SCHOOL_ADMIN")
  unassignTeacher(
    @Param("id") id: string,
    @Param("teacherUserId") teacherUserId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.classesService.unassignTeacher(user.schoolId, id, teacherUserId);
  }

  @Get(":id")
  @Roles("SCHOOL_ADMIN", "TEACHER")
  findOne(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.classesService.findOne(user.schoolId, id);
  }

  private assertSameSchool(user: AuthenticatedUser, schoolId: string) {
    if (user.schoolId !== schoolId) {
      throw new ForbiddenException("Cannot act outside your own school");
    }
  }
}
