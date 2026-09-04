import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
  assignRoleTemplateSchema,
  upsertRoleTemplateSchema,
  type AssignRoleTemplateInput,
  type UpsertRoleTemplateInput,
} from "@skolara/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { RoleTemplatesService } from "./role-templates.service";

/**
 * `role-templates` is deliberately absent from the capability catalogue, so
 * `PermissionGuard` refuses this whole controller to anyone who holds a
 * template. Editing permissions is not something a restricted account gets to
 * do, and a school that could template its way into its own editor could
 * template its way out of it.
 */
@ApiTags("role-templates")
@ApiBearerAuth()
@Controller("role-templates")
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoleTemplatesController {
  constructor(private templates: RoleTemplatesService) {}

  private schoolOf(user: AuthenticatedUser): string {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return user.schoolId;
  }

  @Get("catalogue")
  @Roles("SCHOOL_ADMIN")
  catalogue() {
    return this.templates.catalogue();
  }

  @Post()
  @Roles("SCHOOL_ADMIN")
  create(
    @Body(new ZodValidationPipe(upsertRoleTemplateSchema)) body: UpsertRoleTemplateInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.templates.create(this.schoolOf(user), body);
  }

  @Get()
  @Roles("SCHOOL_ADMIN")
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.templates.list(this.schoolOf(user));
  }

  @Get(":id")
  @Roles("SCHOOL_ADMIN")
  findOne(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.templates.findOne(this.schoolOf(user), id);
  }

  @Put(":id")
  @Roles("SCHOOL_ADMIN")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(upsertRoleTemplateSchema)) body: UpsertRoleTemplateInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.templates.update(this.schoolOf(user), id, body);
  }

  @Delete(":id")
  @Roles("SCHOOL_ADMIN")
  @HttpCode(204)
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.templates.remove(this.schoolOf(user), id);
  }

  @Patch("users/:userId")
  @Roles("SCHOOL_ADMIN")
  assign(
    @Param("userId") userId: string,
    @Body(new ZodValidationPipe(assignRoleTemplateSchema)) body: AssignRoleTemplateInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.templates.assign(this.schoolOf(user), user.id, userId, body);
  }

  /**
   * Support path for a school that has locked itself out of its own settings.
   * Clear-only by construction: the platform owner can hand a role back, never
   * grant a capability.
   */
  @Patch("platform/users/:userId/clear")
  @Roles("SUPER_ADMIN")
  clearForUser(@Param("userId") userId: string) {
    return this.templates.clearForUser(userId);
  }
}
