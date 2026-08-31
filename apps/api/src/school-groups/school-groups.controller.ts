import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import {
  assignSchoolToGroupSchema,
  createSchoolGroupSchema,
  type AssignSchoolToGroupInput,
  type CreateSchoolGroupInput,
} from "@skolara/types";
import { RequiresFeature } from "../common/decorators/requires-feature.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { FeatureGuard } from "../common/guards/feature.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { SchoolGroupsService } from "./school-groups.service";

@Controller("school-groups")
@RequiresFeature("SCHOOL_GROUPS")
@UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
@Roles("SUPER_ADMIN")
export class SchoolGroupsController {
  constructor(private schoolGroupsService: SchoolGroupsService) {}

  @Post()
  create(@Body(new ZodValidationPipe(createSchoolGroupSchema)) body: CreateSchoolGroupInput) {
    return this.schoolGroupsService.create(body);
  }

  @Get()
  findAll() {
    return this.schoolGroupsService.findAll();
  }

  @Post(":id/schools")
  assignSchool(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(assignSchoolToGroupSchema)) body: AssignSchoolToGroupInput,
  ) {
    return this.schoolGroupsService.assignSchool(id, body);
  }

  @Get(":id/schools")
  findSchools(@Param("id") id: string) {
    return this.schoolGroupsService.findSchools(id);
  }
}
