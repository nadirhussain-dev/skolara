import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PLANS, planIncludes, type Feature } from "@skolara/types";
import type { AuthenticatedUser } from "../../auth/jwt-payload.interface";
import { PrismaService } from "../../prisma/prisma.service";
import { FEATURE_KEY } from "../decorators/requires-feature.decorator";

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<Feature | undefined>(FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();

    // The platform owner isn't on a plan and isn't subject to plan gating.
    if (user?.role === "SUPER_ADMIN") return true;
    if (!user?.schoolId) throw new ForbiddenException("No school context");

    const school = await this.prisma.school.findUnique({
      where: { id: user.schoolId },
      select: { plan: true },
    });
    if (!school) throw new ForbiddenException("No school context");

    if (!planIncludes(school.plan, required)) {
      // Naming the plan that would unlock it turns a dead end into an upsell,
      // and saves a support round-trip explaining why the button did nothing.
      throw new ForbiddenException(
        `Your ${PLANS[school.plan].name} plan doesn't include this feature. ` +
          `Upgrade to ${requiredPlanName(required)} to enable it.`,
      );
    }

    return true;
  }
}

function requiredPlanName(feature: Feature): string {
  const tier = (["BASIC", "STANDARD", "PREMIUM", "ENTERPRISE"] as const).find((plan) =>
    planIncludes(plan, feature),
  );
  return tier ? PLANS[tier].name : "a higher plan";
}
