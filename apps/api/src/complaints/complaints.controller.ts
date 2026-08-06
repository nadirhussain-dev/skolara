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
  addComplaintCommentSchema,
  createComplaintSchema,
  updateComplaintStatusSchema,
  type AddComplaintCommentInput,
  type CreateComplaintInput,
  type UpdateComplaintStatusInput,
} from "@skolara/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { ComplaintsService } from "./complaints.service";

@Controller("complaints")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComplaintsController {
  constructor(private complaintsService: ComplaintsService) {}

  @Post()
  @Roles("PARENT", "STUDENT")
  create(
    @Body(new ZodValidationPipe(createComplaintSchema)) body: CreateComplaintInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.complaintsService.create(user.schoolId, user.id, body);
  }

  @Get()
  @Roles("SCHOOL_ADMIN")
  findAll(@CurrentUser() user: AuthenticatedUser) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.complaintsService.findAllForSchool(user.schoolId);
  }

  @Get("mine")
  @Roles("PARENT", "STUDENT")
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.complaintsService.findMine(user.id);
  }

  @Get(":id")
  @Roles("SCHOOL_ADMIN", "PARENT", "STUDENT")
  findOne(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.complaintsService.findOne(user.schoolId, user.id, user.role, id);
  }

  @Post(":id/comments")
  @Roles("SCHOOL_ADMIN", "PARENT", "STUDENT")
  addComment(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(addComplaintCommentSchema)) body: AddComplaintCommentInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.complaintsService.addComment(user.schoolId, user.id, user.role, id, body);
  }

  @Patch(":id/status")
  @Roles("SCHOOL_ADMIN")
  updateStatus(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateComplaintStatusSchema)) body: UpdateComplaintStatusInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.complaintsService.updateStatus(user.schoolId, id, body.status);
  }
}
