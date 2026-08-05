import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  UseGuards,
} from "@nestjs/common";
import { createNoticeSchema, type CreateNoticeInput } from "@skolara/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { NoticesService } from "./notices.service";

@Controller("notices")
@UseGuards(JwtAuthGuard, RolesGuard)
export class NoticesController {
  constructor(private noticesService: NoticesService) {}

  @Post()
  @Roles("SCHOOL_ADMIN")
  create(
    @Body(new ZodValidationPipe(createNoticeSchema)) body: CreateNoticeInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.noticesService.create(user.schoolId, user.id, body);
  }

  @Get()
  findVisible(@CurrentUser() user: AuthenticatedUser) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.noticesService.findVisibleFor(user.schoolId, user);
  }
}
