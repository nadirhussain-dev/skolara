import {
  Controller,
  ForbiddenException,
  Get,
  Header,
  Param,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { ExportService } from "./export.service";

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * A tenant's own data, on demand.
 *
 * Rate-limited well below the global 100/minute: a full bundle is the most
 * expensive read in the API — every school-scoped table at once — and nothing
 * legitimate needs it more than a few times an hour.
 */
@ApiTags("export")
@ApiBearerAuth()
@Controller("export")
@UseGuards(JwtAuthGuard, RolesGuard)
@Throttle({ default: { ttl: 3_600_000, limit: 10 } })
export class ExportController {
  constructor(private exportService: ExportService) {}

  private schoolOf(user: AuthenticatedUser): string {
    if (!user.schoolId) throw new ForbiddenException("No school context");
    return user.schoolId;
  }

  /** What can be asked for as CSV, so a client needn't hardcode the list. */
  @Get("tables")
  @Roles("SCHOOL_ADMIN", "SUPER_ADMIN")
  tables() {
    return { tables: this.exportService.tableNames() };
  }

  @Get("school.json")
  @Roles("SCHOOL_ADMIN")
  async ownBundle(@CurrentUser() user: AuthenticatedUser, @Res() res: Response) {
    const schoolId = this.schoolOf(user);
    const bundle = await this.exportService.bundle(schoolId);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${bundle.manifest.school.subdomain}-${stamp()}.json"`,
    );
    // Pretty-printed: this file gets opened and read by a human at least once,
    // and the size difference is noise next to the transfer.
    res.send(JSON.stringify(bundle, null, 2));
  }

  @Get("school.csv")
  @Roles("SCHOOL_ADMIN")
  @Header("Content-Type", "text/csv; charset=utf-8")
  async ownTableCsv(
    @Query("table") table: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const csv = await this.exportService.tableCsv(this.schoolOf(user), table);
    res.setHeader("Content-Disposition", `attachment; filename="${table}-${stamp()}.csv"`);
    res.send(csv);
  }

  /**
   * The platform owner taking an export on a school's behalf — the support
   * path for "we're leaving, send us our data" when the admin has already
   * lost access.
   *
   * Separate route rather than a schoolId parameter on the one above: an
   * optional override on a self-scoped endpoint is exactly the shape that
   * becomes a cross-tenant read the day someone forgets to check the role.
   */
  @Get("school/:schoolId.json")
  @Roles("SUPER_ADMIN")
  async bundleForSchool(@Param("schoolId") schoolId: string, @Res() res: Response) {
    const bundle = await this.exportService.bundle(schoolId);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${bundle.manifest.school.subdomain}-${stamp()}.json"`,
    );
    res.send(JSON.stringify(bundle, null, 2));
  }
}
