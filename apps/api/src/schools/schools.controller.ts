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
  createSchoolSchema,
  subscriptionStatusSchema,
  updateBrandingSchema,
  type CreateSchoolInput,
  type SubscriptionStatus,
  type UpdateBrandingInput,
} from "@skolara/types";
import { z } from "zod";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { SchoolsService } from "./schools.service";

const updateStatusSchema = z.object({ status: subscriptionStatusSchema });

@Controller("schools")
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchoolsController {
  constructor(private schoolsService: SchoolsService) {}

  @Post()
  @Roles("SUPER_ADMIN")
  create(@Body(new ZodValidationPipe(createSchoolSchema)) body: CreateSchoolInput) {
    return this.schoolsService.create(body);
  }

  @Get()
  @Roles("SUPER_ADMIN")
  findAll() {
    return this.schoolsService.findAll();
  }

  @Get("me")
  @Roles("SCHOOL_ADMIN")
  findMine(@CurrentUser() user: AuthenticatedUser) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.schoolsService.findOne(user.schoolId);
  }

  @Patch(":id/approve")
  @Roles("SUPER_ADMIN")
  approve(@Param("id") id: string) {
    return this.schoolsService.approve(id);
  }

  @Patch(":id/reject")
  @Roles("SUPER_ADMIN")
  reject(@Param("id") id: string) {
    return this.schoolsService.reject(id);
  }

  @Patch(":id/subscription-status")
  @Roles("SUPER_ADMIN")
  updateStatus(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateStatusSchema)) body: { status: SubscriptionStatus },
  ) {
    return this.schoolsService.updateSubscriptionStatus(id, body.status);
  }

  @Patch(":id/branding")
  @Roles("SUPER_ADMIN", "SCHOOL_ADMIN")
  updateBranding(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateBrandingSchema)) body: UpdateBrandingInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (user.role === "SCHOOL_ADMIN" && user.schoolId !== id) {
      throw new ForbiddenException("Cannot act outside your own school");
    }
    return this.schoolsService.updateBranding(id, body);
  }
}
