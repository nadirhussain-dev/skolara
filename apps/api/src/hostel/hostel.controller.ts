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
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
  allocateHostelBedSchema,
  upsertHostelRoomSchema,
  type AllocateHostelBedInput,
  type UpsertHostelRoomInput,
} from "@skolara/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { StudentAccessService } from "../common/student-access.service";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { HostelService } from "./hostel.service";

/**
 * Ungated by plan. Hostel isn't in the entitlement list, and adding a
 * thirteenth `Feature` would move tier boundaries that are still an open
 * business question — see the two things needed in `docs/SIX_DAY_PLAN.md`.
 * Every route is tenant-scoped and role-guarded regardless.
 */
@ApiTags("hostel")
@ApiBearerAuth()
@Controller("hostel")
@UseGuards(JwtAuthGuard, RolesGuard)
export class HostelController {
  constructor(
    private hostel: HostelService,
    private studentAccess: StudentAccessService,
  ) {}

  private schoolOf(user: AuthenticatedUser): string {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return user.schoolId;
  }

  // ---------- rooms ----------

  @Post("rooms")
  @Roles("SCHOOL_ADMIN")
  createRoom(
    @Body(new ZodValidationPipe(upsertHostelRoomSchema)) body: UpsertHostelRoomInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.hostel.createRoom(this.schoolOf(user), body);
  }

  @Get("rooms")
  @Roles("SCHOOL_ADMIN")
  listRooms(
    @Query("blockName") blockName: string | undefined,
    @Query("onlyWithFreeBeds") onlyWithFreeBeds: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.hostel.listRooms(this.schoolOf(user), {
      blockName,
      onlyWithFreeBeds: onlyWithFreeBeds === "true",
    });
  }

  @Get("summary")
  @Roles("SCHOOL_ADMIN")
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.hostel.summary(this.schoolOf(user));
  }

  @Get("rooms/:id")
  @Roles("SCHOOL_ADMIN")
  roomDetail(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.hostel.roomDetail(this.schoolOf(user), id);
  }

  @Put("rooms/:id")
  @Roles("SCHOOL_ADMIN")
  updateRoom(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(upsertHostelRoomSchema)) body: UpsertHostelRoomInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.hostel.updateRoom(this.schoolOf(user), id, body);
  }

  @Delete("rooms/:id")
  @Roles("SCHOOL_ADMIN")
  @HttpCode(204)
  removeRoom(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.hostel.removeRoom(this.schoolOf(user), id);
  }

  // ---------- allocations ----------

  @Post("rooms/:id/allocations")
  @Roles("SCHOOL_ADMIN")
  allocate(
    @Param("id") roomId: string,
    @Body(new ZodValidationPipe(allocateHostelBedSchema)) body: AllocateHostelBedInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.hostel.allocate(this.schoolOf(user), roomId, body);
  }

  @Patch("allocations/:id/vacate")
  @Roles("SCHOOL_ADMIN")
  vacate(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.hostel.vacate(this.schoolOf(user), id);
  }

  /**
   * A family can see where their own child lives. Room detail stays
   * admin-only: it names every other resident, which is not a parent's to see.
   */
  @Get("student/:studentId")
  @Roles("SCHOOL_ADMIN", "PARENT", "STUDENT")
  async forStudent(
    @Param("studentId") studentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.studentAccess.assertCanAccessStudent(user, studentId);
    return this.hostel.forStudent(this.schoolOf(user), studentId);
  }
}
