import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { createUserSchema, type CreateUserInput, type RoleType } from "@skolara/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { UsersService } from "./users.service";

@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SCHOOL_ADMIN")
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  create(
    @Body(new ZodValidationPipe(createUserSchema)) body: CreateUserInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (user.schoolId !== body.schoolId) {
      throw new ForbiddenException("Cannot act outside your own school");
    }
    if (body.role !== "PARENT") {
      throw new ForbiddenException(
        "Use /students, /teachers, or a dedicated flow for this role",
      );
    }
    return this.usersService.createSchoolUser(body);
  }

  @Get()
  findAll(
    @Query("role") role: RoleType | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.usersService.findAllBySchool(user.schoolId, role);
  }
}
