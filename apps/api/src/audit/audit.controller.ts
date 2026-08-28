import { Controller, ForbiddenException, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { AuditService } from "./audit.service";

@ApiTags("audit")
@ApiBearerAuth()
@Controller("audit-logs")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  @Roles("SUPER_ADMIN", "SCHOOL_ADMIN")
  find(
    @CurrentUser() user: AuthenticatedUser,
    @Query("outcome") outcome?: "SUCCESS" | "FAILURE",
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string,
  ) {
    // A school admin only ever sees their own school's trail. A super admin
    // sees everything, including platform-level entries that have no school.
    if (user.role === "SCHOOL_ADMIN" && !user.schoolId) {
      throw new ForbiddenException("No school context");
    }

    return this.auditService.find({
      ...(user.role === "SCHOOL_ADMIN" ? { schoolId: user.schoolId } : {}),
      outcome: outcome === "SUCCESS" || outcome === "FAILURE" ? outcome : undefined,
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
