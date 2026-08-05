import { Controller, ForbiddenException, Get, Param, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { AnalyticsService } from "./analytics.service";

@Controller("analytics")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get("platform")
  @Roles("SUPER_ADMIN")
  platform() {
    return this.analyticsService.platform();
  }

  @Get("school")
  @Roles("SCHOOL_ADMIN")
  school(@CurrentUser() user: AuthenticatedUser) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.analyticsService.school(user.schoolId);
  }

  @Get("defaulter-risk/:studentId")
  @Roles("SCHOOL_ADMIN")
  defaulterRisk(
    @Param("studentId") studentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.analyticsService.defaulterRiskWithExplanation(user.schoolId, studentId);
  }
}
