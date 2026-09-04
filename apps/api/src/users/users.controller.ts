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
import {
  createUserSchema,
  setUserActiveSchema,
  type CreateUserInput,
  type RoleType,
  type SetUserActiveInput,
} from "@skolara/types";
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

  // Overrides the controller-level SCHOOL_ADMIN: teachers need this one, and
  // it returns staff only rather than every user in the school.
  @Get("staff-directory")
  @Roles("SCHOOL_ADMIN", "TEACHER")
  staffDirectory(@CurrentUser() user: AuthenticatedUser) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.usersService.staffDirectory(user.schoolId);
  }

  @Get()
  findAll(
    @Query("role") role: RoleType | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.usersService.findAllBySchool(user.schoolId, role);
  }

  @Patch(":id/active")
  setActive(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(setUserActiveSchema)) body: SetUserActiveInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.usersService.setActive(user.schoolId, id, body.isActive);
  }
}
