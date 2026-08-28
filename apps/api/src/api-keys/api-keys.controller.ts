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
import { createApiKeySchema, type CreateApiKeyInput } from "@skolara/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RequiresFeature } from "../common/decorators/requires-feature.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { FeatureGuard } from "../common/guards/feature.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { ApiKeysService } from "./api-keys.service";

@Controller("api-keys")
@RequiresFeature("API_ACCESS")
@UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
@Roles("SCHOOL_ADMIN")
export class ApiKeysController {
  constructor(private apiKeysService: ApiKeysService) {}

  @Post()
  create(
    @Body(new ZodValidationPipe(createApiKeySchema)) body: CreateApiKeyInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.apiKeysService.create(user.schoolId, body);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.apiKeysService.findAll(user.schoolId);
  }

  @Delete(":id")
  revoke(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.apiKeysService.revoke(user.schoolId, id);
  }
}
