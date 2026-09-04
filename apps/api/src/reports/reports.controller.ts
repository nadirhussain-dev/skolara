import { Controller, ForbiddenException, Get, Header, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RequiresFeature } from "../common/decorators/requires-feature.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { FeatureGuard } from "../common/guards/feature.guard";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { ReportsService } from "./reports.service";

function filename(prefix: string): string {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}.csv`;
}

@ApiTags("reports")
@ApiBearerAuth()
@Controller("reports")
@UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
export class ReportsController {
  constructor(private reports: ReportsService) {}

  @Get("platform-revenue.csv")
  @Roles("SUPER_ADMIN")
  @Header("Content-Type", "text/csv; charset=utf-8")
  async platformRevenue(@Res() res: Response) {
    const csv = await this.reports.platformRevenueCsv();
    res.setHeader("Content-Disposition", `attachment; filename="${filename("platform-revenue")}"`);
    res.send(csv);
  }

  @Get("fee-collection.csv")
  @Roles("SCHOOL_ADMIN")
  @RequiresFeature("ANALYTICS")
  @Header("Content-Type", "text/csv; charset=utf-8")
  async feeCollection(@CurrentUser() user: AuthenticatedUser, @Res() res: Response) {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    const csv = await this.reports.feeCollectionCsv(user.schoolId);
    res.setHeader("Content-Disposition", `attachment; filename="${filename("fee-collection")}"`);
    res.send(csv);
  }
}
