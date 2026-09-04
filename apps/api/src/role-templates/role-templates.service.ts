import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  CAPABILITY_GROUPS,
  ROLE_TEMPLATE_PRESETS,
  TEMPLATABLE_ROLES,
  type AssignRoleTemplateInput,
  type UpsertRoleTemplateInput,
} from "@skolara/types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class RoleTemplatesService {
  constructor(private prisma: PrismaService) {}

  /** What the editor renders: the capability grid and some starting points. */
  catalogue() {
    return {
      groups: CAPABILITY_GROUPS,
      presets: ROLE_TEMPLATE_PRESETS,
      templatableRoles: TEMPLATABLE_ROLES,
    };
  }

  async create(schoolId: string, input: UpsertRoleTemplateInput) {
    try {
      return await this.prisma.roleTemplate.create({
        data: {
          schoolId,
          name: input.name,
          baseRole: input.baseRole,
          // De-duplicated: a repeated capability is harmless but makes the
          // stored row disagree with what the editor shows back.
          permissions: [...new Set(input.permissions)].sort(),
        },
      });
    } catch (error) {
      throw this.translateDuplicateName(error);
    }
  }

  /**
   * Changing a template's base role would leave its current holders mismatched
   * — the guard fails those closed, so it is a silent lockout rather than a
   * silent widening, but it is still not something to do by accident.
   */
  async update(schoolId: string, id: string, input: UpsertRoleTemplateInput) {
    const template = await this.own(schoolId, id);

    if (template.baseRole !== input.baseRole) {
      const holders = await this.prisma.user.count({ where: { roleTemplateId: id } });
      if (holders > 0) {
        throw new BadRequestException(
          `${holders} ${holders === 1 ? "person is" : "people are"} on this template — unassign them before changing its base role`,
        );
      }
    }

    try {
      return await this.prisma.roleTemplate.update({
        where: { id },
        data: {
          name: input.name,
          baseRole: input.baseRole,
          permissions: [...new Set(input.permissions)].sort(),
        },
      });
    } catch (error) {
      throw this.translateDuplicateName(error);
    }
  }

  /**
   * Deleting a template returns its holders to their unrestricted role, via
   * the foreign key's SET NULL. That is the right direction to fail: a
   * template only ever removes access, so losing one cannot grant anything the
   * role doesn't already carry.
   */
  async remove(schoolId: string, id: string) {
    await this.own(schoolId, id);
    await this.prisma.roleTemplate.delete({ where: { id } });
  }

  list(schoolId: string) {
    return this.prisma.roleTemplate.findMany({
      where: { schoolId },
      orderBy: [{ baseRole: "asc" }, { name: "asc" }],
      include: { _count: { select: { users: true } } },
    });
  }

  async findOne(schoolId: string, id: string) {
    const template = await this.prisma.roleTemplate.findFirst({
      where: { id, schoolId },
      include: {
        users: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
          orderBy: { firstName: "asc" },
        },
      },
    });
    if (!template) throw new NotFoundException("Template not found");
    return template;
  }

  /**
   * Attaches a template to a user, or clears it.
   *
   * Two rules carry the security of the whole feature:
   *
   * 1. The template's base role must equal the user's actual role. Without
   *    this, attaching a SCHOOL_ADMIN template to a teacher would be read by
   *    the guard as "this account's capabilities are the admin set", and a
   *    narrowing feature would become an escalation one.
   * 2. Nobody may template themselves. A school admin who narrowed their own
   *    account out of the template editor could never undo it, and the escape
   *    hatch would be a support call.
   */
  async assign(
    schoolId: string,
    actingUserId: string,
    targetUserId: string,
    input: AssignRoleTemplateInput,
  ) {
    if (actingUserId === targetUserId) {
      throw new BadRequestException(
        "You can't put an access template on your own account — ask another administrator",
      );
    }

    const target = await this.prisma.user.findFirst({
      where: { id: targetUserId, schoolId },
      select: { id: true, role: true },
    });
    if (!target) throw new NotFoundException("User not found");
    if (target.role === "SUPER_ADMIN") {
      throw new ForbiddenException("The platform owner can't be templated");
    }

    if (input.roleTemplateId === null) {
      return this.prisma.user.update({
        where: { id: targetUserId },
        data: { roleTemplateId: null },
        select: SAFE_USER_SELECT,
      });
    }

    const template = await this.own(schoolId, input.roleTemplateId);
    if (template.baseRole !== target.role) {
      throw new BadRequestException(
        `That template is for ${template.baseRole.toLowerCase().replace("_", " ")} accounts, and this one is ${target.role.toLowerCase().replace("_", " ")}`,
      );
    }

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { roleTemplateId: input.roleTemplateId },
      select: SAFE_USER_SELECT,
    });
  }

  /**
   * The platform owner's escape hatch, for a school that has templated its way
   * out of its own settings. Deliberately clear-only — the support path is
   * "give them their role back", never "grant them something".
   */
  async clearForUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException("User not found");

    return this.prisma.user.update({
      where: { id: userId },
      data: { roleTemplateId: null },
      select: SAFE_USER_SELECT,
    });
  }

  // ---------- internals ----------

  private async own(schoolId: string, id: string) {
    const template = await this.prisma.roleTemplate.findFirst({
      where: { id, schoolId },
      select: { id: true, name: true, baseRole: true },
    });
    if (!template) throw new NotFoundException("Template not found");
    return template;
  }

  private translateDuplicateName(error: unknown): unknown {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return new ConflictException("This school already has a template with that name");
    }
    return error;
  }
}

const SAFE_USER_SELECT = {
  id: true,
  role: true,
  email: true,
  firstName: true,
  lastName: true,
  isActive: true,
  roleTemplateId: true,
} as const;
