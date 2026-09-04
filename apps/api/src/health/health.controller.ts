import { Controller, Get, ServiceUnavailableException, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { PrismaService } from "../prisma/prisma.service";
import { HealthService } from "./health.service";

@ApiTags("health")
@Controller("health")
@SkipThrottle()
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private health: HealthService,
  ) {}

  // Liveness: the process is up and can answer HTTP requests.
  @Get()
  live() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }

  // Readiness: the process can also reach the database — what load balancers
  // and deploy tooling should actually gate traffic/rollouts on.
  @Get("ready")
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: "ok", database: "up", timestamp: new Date().toISOString() };
    } catch {
      throw new ServiceUnavailableException({ status: "error", database: "down" });
    }
  }

  /**
   * The detail behind the two probes above, for the platform owner's console.
   *
   * Guarded, unlike its siblings: it reports which integrations are configured
   * and how far the schema has migrated, and neither belongs on an
   * unauthenticated endpoint that a load balancer is pointed at. No secret
   * values are returned either way — only whether one is set.
   */
  @Get("detail")
  @ApiBearerAuth()
  @Roles("SUPER_ADMIN")
  @UseGuards(JwtAuthGuard, RolesGuard)
  detail() {
    return this.health.detail();
  }
}
