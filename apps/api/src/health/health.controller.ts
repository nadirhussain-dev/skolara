import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { PrismaService } from "../prisma/prisma.service";

@Controller("health")
@SkipThrottle()
export class HealthController {
  constructor(private prisma: PrismaService) {}

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
}
