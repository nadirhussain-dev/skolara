import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { createExamSchema, type CreateExamInput } from "@skolara/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { ExamsService } from "./exams.service";

@Controller("exams")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExamsController {
  constructor(private examsService: ExamsService) {}

  @Post()
  @Roles("SCHOOL_ADMIN", "TEACHER")
  create(
    @Body(new ZodValidationPipe(createExamSchema)) body: CreateExamInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.examsService.create(user.schoolId, body);
  }

  @Get("class/:classId")
  @Roles("SCHOOL_ADMIN", "TEACHER", "STUDENT", "PARENT")
  findForClass(
    @Param("classId") classId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.examsService.findForClass(user.schoolId, classId);
  }

  @Get(":id/rank-list")
  @Roles("SCHOOL_ADMIN", "TEACHER")
  rankList(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.examsService.rankList(user.schoolId, id);
  }
}
