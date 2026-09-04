import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import {
  ALWAYS_ALLOWED_RESOURCES,
  CAPABILITY_RESOURCES,
  capability,
  type CapabilityAction,
} from "@skolara/types";
import type { Request } from "express";
import type { AuthenticatedUser } from "../../auth/jwt-payload.interface";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Enforces a user's role template, if they have one.
 *
 * Registered globally rather than per controller, on the same reasoning as the
 * audit interceptor: a new endpoint is covered the moment it exists instead of
 * whenever somebody remembers to annotate it. The alternative — a
 * `@RequiresPermission` decorator on each of ninety handlers — is a feature
 * that silently stops covering whatever gets added next.
 *
 * The capability is derived from the request rather than declared:
 * `<first path segment>:read` for GET and HEAD, `:write` for everything else.
 * That mapping is coarse on purpose. A template is a job description
 * ("accountant sees fees"), not an ACL, and a school admin editing eighty
 * checkboxes is already at the limit of what anyone will configure.
 *
 * Users without a template are unaffected, which is every account until a
 * school builds one — so this can be switched on globally without changing the
 * behaviour of a single existing request.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== "http") return true;

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;

    // Unauthenticated routes are the JWT guard's business, not this one's.
    if (!user) return true;
    // The platform owner has no school and so no template to narrow them.
    if (user.role === "SUPER_ADMIN") return true;

    // Read from the database per request rather than from the token, so
    // revoking a capability takes effect immediately instead of at the next
    // refresh. Same trade-off the feature guard already makes for plans.
    const account = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        role: true,
        roleTemplate: { select: { baseRole: true, permissions: true } },
      },
    });
    const template = account?.roleTemplate;
    if (!template) return true;

    // A template whose base role no longer matches the account is stale —
    // somebody's role changed underneath it. Ignoring it would silently widen
    // access, so it fails closed and asks an admin to look.
    if (account && template.baseRole !== account.role) {
      throw new ForbiddenException(
        "Your access template no longer matches your role — ask an administrator to reassign it",
      );
    }

    const resource = resourceOf(request);
    if (!resource || ALWAYS_ALLOWED_RESOURCES.includes(resource)) return true;

    // A resource no capability can name — `role-templates` and `school-groups`
    // among them — is unreachable for anyone holding a template, by
    // construction. That is the intent: whoever can edit templates must not be
    // someone a template restricts, or a school could lock itself out of its
    // own permissions editor. Said plainly, because "doesn't include
    // role-templates:write" would send an admin looking for a checkbox that
    // deliberately doesn't exist.
    if (!CAPABILITY_RESOURCES.includes(resource)) {
      throw new ForbiddenException(
        "That area is only available to administrators without an access template",
      );
    }

    const action: CapabilityAction =
      request.method === "GET" || request.method === "HEAD" ? "read" : "write";
    const required = capability(resource, action);

    if (!template.permissions.includes(required)) {
      // Naming the capability turns "forbidden" into something an admin can
      // actually tick a box for.
      throw new ForbiddenException(
        `Your access template doesn't include ${required}`,
      );
    }

    return true;
  }
}

/**
 * The first path segment, which is every controller's base path.
 *
 * Read from the mounted route rather than `request.path` so a global prefix or
 * a versioned mount can't shift which segment counts as the resource.
 */
function resourceOf(request: Request): string | null {
  const path = (request.route?.path ?? request.path ?? "") as string;
  const fromBase = request.baseUrl ? `${request.baseUrl}${path}` : path;
  const segment = fromBase.split("?")[0]?.split("/").filter(Boolean)[0];
  return segment ?? null;
}
