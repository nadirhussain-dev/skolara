import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { createClassSchema, type CreateClassInput } from "@skolara/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { ClassesService } from "./classes.service";

@Controller("classes")
@UseGuards(JwtAuthGuard, RolesGuard)
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
    return this.classesService.findAllForSchool(user.schoolId);
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
