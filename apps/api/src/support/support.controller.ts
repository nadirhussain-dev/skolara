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
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
  addSupportCommentSchema,
  createSupportTicketSchema,
  supportTicketStatusSchema,
  updateSupportTicketSchema,
  type AddSupportCommentInput,
  type CreateSupportTicketInput,
  type SupportTicketStatus,
  type UpdateSupportTicketInput,
} from "@skolara/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { SupportService } from "./support.service";

@ApiTags("support")
@ApiBearerAuth()
@Controller("support/tickets")
@UseGuards(JwtAuthGuard, RolesGuard)
export class SupportController {
  constructor(private support: SupportService) {}

  @Post()
  @Roles("SCHOOL_ADMIN")
  create(
    @Body(new ZodValidationPipe(createSupportTicketSchema))
    body: CreateSupportTicketInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.support.create(user.schoolId, user.id, body);
  }

  @Get()
  @Roles("SUPER_ADMIN", "SCHOOL_ADMIN")
  findAll(@CurrentUser() user: AuthenticatedUser, @Query("status") status?: string) {
    const parsed = status ? supportTicketStatusSchema.safeParse(status) : null;
    return this.support.findVisibleFor(
      user,
      parsed?.success ? (parsed.data as SupportTicketStatus) : undefined,
    );
  }

  @Get(":id")
  @Roles("SUPER_ADMIN", "SCHOOL_ADMIN")
  findOne(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.support.findOne(user, id);
  }

  @Post(":id/comments")
  @Roles("SUPER_ADMIN", "SCHOOL_ADMIN")
  addComment(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(addSupportCommentSchema)) body: AddSupportCommentInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.support.addComment(user, id, body);
  }

  // Status and priority are the platform's call — a school reclassifying its
  // own ticket as urgent would make the queue ordering meaningless.
  @Patch(":id")
  @Roles("SUPER_ADMIN")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateSupportTicketSchema))
    body: UpdateSupportTicketInput,
  ) {
    return this.support.update(id, body);
  }
}
