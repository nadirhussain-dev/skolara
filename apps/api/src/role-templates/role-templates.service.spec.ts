import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { RoleTemplatesService } from "./role-templates.service";
import type { PrismaService } from "../prisma/prisma.service";

const SCHOOL = "school-1";
const ADMIN = "admin-1";
const TARGET = "user-2";
const TEMPLATE = "template-1";

const duplicate = () =>
  new Prisma.PrismaClientKnownRequestError("unique", {
    code: "P2002",
    clientVersion: "test",
  });

describe("RoleTemplatesService", () => {
  let prisma: {
    roleTemplate: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    user: { count: jest.Mock; findFirst: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
  };
  let service: RoleTemplatesService;

  beforeEach(() => {
    prisma = {
      roleTemplate: {
        create: jest.fn().mockResolvedValue({ id: TEMPLATE }),
        findFirst: jest.fn().mockResolvedValue({
          id: TEMPLATE,
          name: "Accountant",
          baseRole: "SCHOOL_ADMIN",
        }),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({ id: TEMPLATE }),
        delete: jest.fn(),
      },
      user: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue({ id: TARGET, role: "SCHOOL_ADMIN" }),
        findUnique: jest.fn().mockResolvedValue({ id: TARGET }),
        update: jest.fn().mockResolvedValue({ id: TARGET }),
      },
    };
    service = new RoleTemplatesService(prisma as unknown as PrismaService);
  });

  describe("create", () => {
    it("de-duplicates and sorts the capability list", async () => {
      await service.create(SCHOOL, {
        name: "Accountant",
        baseRole: "SCHOOL_ADMIN",
        permissions: ["invoices:read", "invoices:read", "grades:read"],
      });

      expect(prisma.roleTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ permissions: ["grades:read", "invoices:read"] }),
        }),
      );
    });

    it("accepts an empty capability list", async () => {
      await service.create(SCHOOL, {
        name: "Locked out",
        baseRole: "TEACHER",
        permissions: [],
      });

      expect(prisma.roleTemplate.create).toHaveBeenCalled();
    });

    it("reports a duplicate name as a conflict", async () => {
      prisma.roleTemplate.create.mockRejectedValue(duplicate());

      await expect(
        service.create(SCHOOL, {
          name: "Accountant",
          baseRole: "SCHOOL_ADMIN",
          permissions: [],
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("update", () => {
    it("refuses to change the base role while anyone holds the template", async () => {
      prisma.user.count.mockResolvedValue(2);

      await expect(
        service.update(SCHOOL, TEMPLATE, {
          name: "Accountant",
          baseRole: "TEACHER",
          permissions: [],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.roleTemplate.update).not.toHaveBeenCalled();
    });

    it("allows a base-role change on an unheld template", async () => {
      prisma.user.count.mockResolvedValue(0);

      await service.update(SCHOOL, TEMPLATE, {
        name: "Accountant",
        baseRole: "TEACHER",
        permissions: [],
      });

      expect(prisma.roleTemplate.update).toHaveBeenCalled();
    });

    it("allows a capability change while people hold it", async () => {
      prisma.user.count.mockResolvedValue(5);

      await service.update(SCHOOL, TEMPLATE, {
        name: "Accountant",
        baseRole: "SCHOOL_ADMIN",
        permissions: ["invoices:read"],
      });

      expect(prisma.roleTemplate.update).toHaveBeenCalled();
      // No need to count holders when the base role isn't moving.
      expect(prisma.user.count).not.toHaveBeenCalled();
    });

    it("refuses a template in another school", async () => {
      prisma.roleTemplate.findFirst.mockResolvedValue(null);

      await expect(
        service.update(SCHOOL, TEMPLATE, {
          name: "X",
          baseRole: "TEACHER",
          permissions: [],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("assign", () => {
    it("refuses a template whose base role differs from the user's", async () => {
      // The escalation this whole design exists to prevent: a SCHOOL_ADMIN
      // template on a teacher would read as "this account has the admin set".
      prisma.user.findFirst.mockResolvedValue({ id: TARGET, role: "TEACHER" });

      await expect(
        service.assign(SCHOOL, ADMIN, TARGET, { roleTemplateId: TEMPLATE }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("attaches a matching template", async () => {
      await service.assign(SCHOOL, ADMIN, TARGET, { roleTemplateId: TEMPLATE });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TARGET },
          data: { roleTemplateId: TEMPLATE },
        }),
      );
    });

    it("refuses to template your own account", async () => {
      // An admin who narrowed themselves out of the editor could never undo it.
      await expect(
        service.assign(SCHOOL, ADMIN, ADMIN, { roleTemplateId: TEMPLATE }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.user.findFirst).not.toHaveBeenCalled();
    });

    it("refuses to template the platform owner", async () => {
      prisma.user.findFirst.mockResolvedValue({ id: TARGET, role: "SUPER_ADMIN" });

      await expect(
        service.assign(SCHOOL, ADMIN, TARGET, { roleTemplateId: TEMPLATE }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("refuses a user in another school", async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.assign(SCHOOL, ADMIN, TARGET, { roleTemplateId: TEMPLATE }),
      ).rejects.toThrow(NotFoundException);
    });

    it("clears a template without looking one up", async () => {
      await service.assign(SCHOOL, ADMIN, TARGET, { roleTemplateId: null });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { roleTemplateId: null } }),
      );
      expect(prisma.roleTemplate.findFirst).not.toHaveBeenCalled();
    });

    it("refuses a template belonging to another school", async () => {
      prisma.roleTemplate.findFirst.mockResolvedValue(null);

      await expect(
        service.assign(SCHOOL, ADMIN, TARGET, { roleTemplateId: TEMPLATE }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe("clearForUser", () => {
    it("only ever clears — the support path never grants", async () => {
      await service.clearForUser(TARGET);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { roleTemplateId: null } }),
      );
    });

    it("refuses a user that doesn't exist", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.clearForUser(TARGET)).rejects.toThrow(NotFoundException);
    });
  });

  describe("catalogue", () => {
    it("offers presets whose capabilities are all real", async () => {
      const { groups, presets } = service.catalogue();

      const known = new Set(
        groups.flatMap((group) =>
          group.resources.flatMap((resource) => [`${resource}:read`, `${resource}:write`]),
        ),
      );
      for (const preset of presets) {
        for (const permission of preset.permissions) {
          expect(known.has(permission)).toBe(true);
        }
      }
    });

    it("never offers SUPER_ADMIN as a base role", () => {
      expect(service.catalogue().templatableRoles).not.toContain("SUPER_ADMIN");
    });
  });
});
