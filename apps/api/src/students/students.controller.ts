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
import { admitStudentSchema, type AdmitStudentInput } from "@skolara/types";
import { z } from "zod";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtOrApiKeyGuard } from "../common/guards/jwt-or-api-key.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { StudentsService } from "./students.service";

const assignClassSchema = z.object({ classId: z.string().uuid() });

@Controller("students")
@UseGuards(JwtOrApiKeyGuard, RolesGuard)
@Roles("SCHOOL_ADMIN")
export class StudentsController {
  constructor(private studentsService: StudentsService) {}

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
  findAllForClass(
    @Query("classId") classId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.studentsService.findAllForClass(user.schoolId, classId);
  }

  @Get("mine")
  @Roles("PARENT")
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.studentsService.findChildrenForParent(user.id);
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
}
