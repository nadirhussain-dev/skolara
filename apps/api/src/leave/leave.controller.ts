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
  leaveStatusSchema,
  requestLeaveSchema,
  reviewLeaveSchema,
  type LeaveStatus,
  type RequestLeaveInput,
  type ReviewLeaveInput,
} from "@skolara/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { LeaveService } from "./leave.service";

@ApiTags("leave")
@ApiBearerAuth()
@Controller("leave")
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeaveController {
  constructor(private leave: LeaveService) {}

  private schoolOf(user: AuthenticatedUser): string {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return user.schoolId;
  }

  // Staff only. Parents and students don't take staff leave — a student
  // absence is an attendance record, not a leave request.
  @Post()
  @Roles("TEACHER", "SCHOOL_ADMIN")
  request(
    @Body(new ZodValidationPipe(requestLeaveSchema)) body: RequestLeaveInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leave.request(this.schoolOf(user), user.id, body);
  }

  @Get("mine")
  @Roles("TEACHER", "SCHOOL_ADMIN")
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.leave.findMine(user.id);
  }

  @Get("balances")
  @Roles("TEACHER", "SCHOOL_ADMIN")
  balances(@CurrentUser() user: AuthenticatedUser) {
    return this.leave.balances(this.schoolOf(user), user.id);
  }

  @Get()
  @Roles("SCHOOL_ADMIN")
  findAll(@CurrentUser() user: AuthenticatedUser, @Query("status") status?: string) {
    const parsed = status ? leaveStatusSchema.safeParse(status) : null;
    return this.leave.findForSchool(
      this.schoolOf(user),
      parsed?.success ? (parsed.data as LeaveStatus) : undefined,
    );
  }

  @Patch(":id/review")
  @Roles("SCHOOL_ADMIN")
  review(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(reviewLeaveSchema)) body: ReviewLeaveInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leave.review(this.schoolOf(user), id, user.id, body);
  }

  @Patch(":id/cancel")
  @Roles("TEACHER", "SCHOOL_ADMIN")
  cancel(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.leave.cancel(user.id, id);
  }
}
