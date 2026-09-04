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
import { Throttle } from "@nestjs/throttler";
import {
  createSchoolSchema,
  registerSchoolSchema,
  subscriptionStatusSchema,
  updateBrandingSchema,
  updateCommunicationSchema,
  type CreateSchoolInput,
  type RegisterSchoolInput,
  type SubscriptionStatus,
  type UpdateBrandingInput,
  type UpdateCommunicationInput,
} from "@skolara/types";
import { z } from "zod";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { RequiresFeature } from "../common/decorators/requires-feature.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { FeatureGuard } from "../common/guards/feature.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { SchoolsService } from "./schools.service";

const updateStatusSchema = z.object({ status: subscriptionStatusSchema });

@Controller("schools")
@UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
export class SchoolsController {
  constructor(private schoolsService: SchoolsService) {}

  // Public: this is the self-serve signup form. Rate-limited hard because it
  // creates rows and sits outside authentication.
  @Post("register")
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } })
  register(@Body(new ZodValidationPipe(registerSchoolSchema)) body: RegisterSchoolInput) {
    return this.schoolsService.register(body);
  }

  @Get("subdomain-available/:subdomain")
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60 * 1000 } })
  subdomainAvailable(@Param("subdomain") subdomain: string) {
    return this.schoolsService.isSubdomainAvailable(subdomain.toLowerCase());
  }

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
  @RequiresFeature("WHITE_LABEL")
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

  /**
   * Not behind an entitlement, unlike branding above: which channel a school's
   * alerts go out on is how it reaches its parents at all, not a premium
   * flourish. A school whose families don't use WhatsApp has to be able to
   * switch on any plan.
   */
  @Patch(":id/communication")
  @Roles("SUPER_ADMIN", "SCHOOL_ADMIN")
  updateCommunication(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateCommunicationSchema))
    body: UpdateCommunicationInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (user.role === "SCHOOL_ADMIN" && user.schoolId !== id) {
      throw new ForbiddenException("Cannot act outside your own school");
    }
    return this.schoolsService.updateCommunication(id, body);
  }
}
