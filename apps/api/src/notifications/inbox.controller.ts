import { Body, Controller, Get, HttpCode, Post, UseGuards } from "@nestjs/common";
import { markNotificationsReadSchema, type MarkNotificationsReadInput } from "@skolara/types";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { InboxService } from "./inbox.service";

/** The signed-in user's own notifications, for every role. */
@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class InboxController {
  constructor(private inbox: InboxService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.inbox.list(user.id);
  }

  @Get("unread-count")
  unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.inbox.unreadCount(user.id);
  }

  @Post("read")
  @HttpCode(200)
  markRead(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(markNotificationsReadSchema)) body: MarkNotificationsReadInput,
  ) {
    return this.inbox.markRead(user.id, body.ids);
  }
}
