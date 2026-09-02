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
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
  bookMeetingSlotSchema,
  publishMeetingSlotsSchema,
  type BookMeetingSlotInput,
  type PublishMeetingSlotsInput,
} from "@skolara/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RequiresFeature } from "../common/decorators/requires-feature.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { FeatureGuard } from "../common/guards/feature.guard";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { MeetingsService } from "./meetings.service";

// Meetings are part of the parent-communication layer, gated with messaging.
@ApiTags("meetings")
@ApiBearerAuth()
@Controller("meetings")
@RequiresFeature("MESSAGING")
@UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
export class MeetingsController {
  constructor(private meetings: MeetingsService) {}

  private schoolOf(user: AuthenticatedUser): string {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return user.schoolId;
  }

  @Post("slots")
  @Roles("TEACHER")
  publish(
    @Body(new ZodValidationPipe(publishMeetingSlotsSchema))
    body: PublishMeetingSlotsInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.meetings.publish(this.schoolOf(user), user.id, body);
  }

  @Get("slots/mine")
  @Roles("TEACHER")
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.meetings.mine(this.schoolOf(user), user.id);
  }

  @Get("slots/available")
  @Roles("PARENT", "SCHOOL_ADMIN")
  available(
    @CurrentUser() user: AuthenticatedUser,
    @Query("teacherUserId") teacherUserId?: string,
  ) {
    return this.meetings.available(this.schoolOf(user), teacherUserId);
  }

  @Get("slots/booked")
  @Roles("PARENT")
  booked(@CurrentUser() user: AuthenticatedUser) {
    return this.meetings.bookedByParent(this.schoolOf(user), user.id);
  }

  @Post("slots/:id/book")
  @Roles("PARENT")
  book(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(bookMeetingSlotSchema)) body: BookMeetingSlotInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.meetings.book(this.schoolOf(user), id, user.id, body);
  }

  @Patch("slots/:id/cancel-booking")
  @Roles("PARENT")
  @HttpCode(204)
  cancelBooking(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.meetings.cancelBooking(this.schoolOf(user), id, user.id);
  }

  @Delete("slots/:id")
  @Roles("TEACHER")
  @HttpCode(204)
  withdraw(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.meetings.withdraw(this.schoolOf(user), id, user.id);
  }
}
