import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import type { Request } from "express";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtAuthGuard } from "./jwt-auth.guard";

/**
 * How stale `lastUsedAt` is allowed to get. Without this, a busy integration
 * would issue one UPDATE per request purely to keep a timestamp fresh.
 */
const LAST_USED_REFRESH_MS = 60_000;

/**
 * Accepts either a bearer JWT (people) or an `x-api-key` header (integrations).
 *
 * API keys are deliberately read-only: they carry no individual accountability
 * — every action would land in the audit trail as "the key" rather than a
 * person — so they can view a school's data but never change it.
 */
@Injectable()
export class JwtOrApiKeyGuard implements CanActivate {
  // Instantiated directly rather than injected so that every controller can
  // use this guard without its module having to register the passport guard.
  private readonly jwtGuard = new JwtAuthGuard();

  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const presented = request.header("x-api-key");

    if (!presented) {
      return (await this.jwtGuard.canActivate(context)) as boolean;
    }

    if (request.method !== "GET") {
      throw new ForbiddenException("API keys are read-only");
    }

    const hashedKey = createHash("sha256").update(presented).digest("hex");
    const key = await this.prisma.apiKey.findFirst({
      where: { hashedKey, revokedAt: null },
      select: { id: true, schoolId: true, lastUsedAt: true },
    });
    if (!key) throw new UnauthorizedException("Invalid API key");

    if (
      !key.lastUsedAt ||
      Date.now() - key.lastUsedAt.getTime() > LAST_USED_REFRESH_MS
    ) {
      // Deliberately not awaited — a "last seen" timestamp is not worth adding
      // a write round-trip to every integration request.
      void this.prisma.apiKey
        .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
        .catch(() => undefined);
    }

    // Downstream code reads `schoolId` off the principal for tenant scoping,
    // so the key presents as a school admin confined to its own school.
    request.user = {
      id: `api-key:${key.id}`,
      role: "SCHOOL_ADMIN",
      schoolId: key.schoolId,
    };
    return true;
  }
}
