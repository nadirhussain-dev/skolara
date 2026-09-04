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
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
  issueAssetSchema,
  returnAssetSchema,
  upsertInventoryItemSchema,
  type IssueAssetInput,
  type ReturnAssetInput,
  type UpsertInventoryItemInput,
} from "@skolara/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { InventoryService } from "./inventory.service";

/**
 * School-admin only, and ungated by plan for the same reason as hostel: adding
 * a `Feature` for it would move tier boundaries that are still open.
 *
 * Teachers can read nothing here yet. "What do I have out?" is a fair ask and
 * a small addition, but it wasn't in the day's scope.
 */
@ApiTags("inventory")
@ApiBearerAuth()
@Controller("inventory")
@Roles("SCHOOL_ADMIN")
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private inventory: InventoryService) {}

  private schoolOf(user: AuthenticatedUser): string {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return user.schoolId;
  }

  // ---------- items ----------

  @Post("items")
  createItem(
    @Body(new ZodValidationPipe(upsertInventoryItemSchema)) body: UpsertInventoryItemInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventory.createItem(this.schoolOf(user), body);
  }

  @Get("items")
  listItems(
    @Query("category") category: string | undefined,
    @Query("search") search: string | undefined,
    @Query("onlyAvailable") onlyAvailable: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventory.listItems(this.schoolOf(user), {
      category,
      search,
      onlyAvailable: onlyAvailable === "true",
    });
  }

  @Get("summary")
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.inventory.summary(this.schoolOf(user));
  }

  @Get("categories")
  categories(@CurrentUser() user: AuthenticatedUser) {
    return this.inventory.categories(this.schoolOf(user));
  }

  @Get("outstanding")
  outstanding(@CurrentUser() user: AuthenticatedUser) {
    return this.inventory.outstanding(this.schoolOf(user));
  }

  @Get("items/:id")
  itemDetail(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.inventory.itemDetail(this.schoolOf(user), id);
  }

  @Put("items/:id")
  updateItem(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(upsertInventoryItemSchema)) body: UpsertInventoryItemInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventory.updateItem(this.schoolOf(user), id, body);
  }

  @Delete("items/:id")
  @HttpCode(204)
  removeItem(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.inventory.removeItem(this.schoolOf(user), id);
  }

  // ---------- issue and return ----------

  @Post("items/:id/assignments")
  issue(
    @Param("id") itemId: string,
    @Body(new ZodValidationPipe(issueAssetSchema)) body: IssueAssetInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventory.issue(this.schoolOf(user), itemId, body);
  }

  @Patch("assignments/:id/return")
  returnAsset(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(returnAssetSchema)) body: ReturnAssetInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventory.returnAsset(this.schoolOf(user), id, body);
  }
}
