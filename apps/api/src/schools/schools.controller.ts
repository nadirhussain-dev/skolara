import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  createSchoolSchema,
  subscriptionStatusSchema,
  type CreateSchoolInput,
  type SubscriptionStatus,
} from "@skolara/types";
import { z } from "zod";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { SchoolsService } from "./schools.service";

const updateStatusSchema = z.object({ status: subscriptionStatusSchema });

@Controller("schools")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN")
export class SchoolsController {
  constructor(private schoolsService: SchoolsService) {}

  @Post()
  create(@Body(new ZodValidationPipe(createSchoolSchema)) body: CreateSchoolInput) {
    return this.schoolsService.create(body);
  }

  @Get()
  findAll() {
    return this.schoolsService.findAll();
  }

  @Patch(":id/approve")
  approve(@Param("id") id: string) {
    return this.schoolsService.approve(id);
  }

  @Patch(":id/reject")
  reject(@Param("id") id: string) {
    return this.schoolsService.reject(id);
  }

  @Patch(":id/subscription-status")
  updateStatus(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateStatusSchema)) body: { status: SubscriptionStatus },
  ) {
    return this.schoolsService.updateSubscriptionStatus(id, body.status);
  }
}
