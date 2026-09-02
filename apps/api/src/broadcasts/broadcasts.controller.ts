import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { createBroadcastSchema, type CreateBroadcastInput } from "@skolara/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { BroadcastsService } from "./broadcasts.service";

@ApiTags("broadcasts")
@ApiBearerAuth()
@Controller("broadcasts")
@UseGuards(JwtAuthGuard, RolesGuard)
export class BroadcastsController {
  constructor(private broadcasts: BroadcastsService) {}

  @Post()
  @Roles("SUPER_ADMIN")
  create(
    @Body(new ZodValidationPipe(createBroadcastSchema)) body: CreateBroadcastInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.broadcasts.create(user.id, body);
  }

  /** Every signed-in user, whatever their role — that's the point. */
  @Get("active")
  @Roles("SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "STUDENT", "PARENT")
  active(@CurrentUser() user: AuthenticatedUser) {
    return this.broadcasts.findActiveFor(user);
  }

  @Get()
  @Roles("SUPER_ADMIN")
  findAll() {
    return this.broadcasts.findAll();
  }

  @Delete(":id")
  @Roles("SUPER_ADMIN")
  @HttpCode(204)
  withdraw(@Param("id") id: string) {
    return this.broadcasts.withdraw(id);
  }
}
