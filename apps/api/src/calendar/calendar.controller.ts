import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
  createCalendarEventSchema,
  type CreateCalendarEventInput,
} from "@skolara/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { CalendarService } from "./calendar.service";

@ApiTags("calendar")
@ApiBearerAuth()
@Controller("calendar")
@UseGuards(JwtAuthGuard, RolesGuard)
export class CalendarController {
  constructor(private calendarService: CalendarService) {}

  private schoolOf(user: AuthenticatedUser): string {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return user.schoolId;
  }

  @Get()
  @Roles("SCHOOL_ADMIN", "TEACHER", "STUDENT", "PARENT")
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.calendarService.findVisibleFor(
      this.schoolOf(user),
      user,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Post()
  @Roles("SCHOOL_ADMIN")
  create(
    @Body(new ZodValidationPipe(createCalendarEventSchema))
    body: CreateCalendarEventInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.calendarService.create(this.schoolOf(user), user.id, body);
  }

  @Delete(":id")
  @Roles("SCHOOL_ADMIN")
  @HttpCode(204)
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.calendarService.remove(this.schoolOf(user), id);
  }
}
