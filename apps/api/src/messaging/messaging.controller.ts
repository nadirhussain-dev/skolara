import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  sendMessageSchema,
  startThreadSchema,
  type SendMessageInput,
  type StartThreadInput,
} from "@skolara/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RequiresFeature } from "../common/decorators/requires-feature.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { FeatureGuard } from "../common/guards/feature.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { StudentAccessService } from "../common/student-access.service";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { MessagingService } from "./messaging.service";

@Controller("messages")
@RequiresFeature("MESSAGING")
@UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
export class MessagingController {
  constructor(
    private messagingService: MessagingService,
    private studentAccess: StudentAccessService,
  ) {}

  @Post("threads")
  @Roles("PARENT")
  async startThread(
    @Body(new ZodValidationPipe(startThreadSchema)) body: StartThreadInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    await this.studentAccess.assertCanAccessStudent(user, body.studentId);
    return this.messagingService.startThread(user.schoolId, user.id, body);
  }

  @Get("threads")
  @Roles("TEACHER", "PARENT")
  findThreads(@CurrentUser() user: AuthenticatedUser) {
    return this.messagingService.findThreadsFor(user.id);
  }

  @Get("threads/:id/messages")
  @Roles("TEACHER", "PARENT")
  findMessages(@Param("id") threadId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.messagingService.findMessages(user.id, threadId);
  }

  @Post("threads/:id/messages")
  @Roles("TEACHER", "PARENT")
  sendMessage(
    @Param("id") threadId: string,
    @Body(new ZodValidationPipe(sendMessageSchema)) body: SendMessageInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.messagingService.sendMessage(user.id, threadId, body);
  }
}
