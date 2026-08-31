import { Controller, ForbiddenException, Get, Param, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RequiresFeature } from "../common/decorators/requires-feature.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtOrApiKeyGuard } from "../common/guards/jwt-or-api-key.guard";
import { FeatureGuard } from "../common/guards/feature.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { AnalyticsService } from "./analytics.service";

@Controller("analytics")
@UseGuards(JwtOrApiKeyGuard, RolesGuard, FeatureGuard)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get("platform")
  @Roles("SUPER_ADMIN")
  platform() {
    return this.analyticsService.platform();
  }

  @Get("school")
  @Roles("SCHOOL_ADMIN")
  @RequiresFeature("ANALYTICS")
  school(@CurrentUser() user: AuthenticatedUser) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.analyticsService.school(user.schoolId);
  }

  @Get("defaulter-risk/:studentId")
  @Roles("SCHOOL_ADMIN")
  @RequiresFeature("AI")
  defaulterRisk(
    @Param("studentId") studentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return this.analyticsService.defaulterRiskWithExplanation(user.schoolId, studentId);
  }
}
