import { ForbiddenException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import { PermissionGuard } from "./permission.guard";
import type { PrismaService } from "../../prisma/prisma.service";
import type { AuthenticatedUser } from "../../auth/jwt-payload.interface";

const ADMIN: AuthenticatedUser = { id: "user-1", role: "SCHOOL_ADMIN", schoolId: "school-1" };

function contextFor(
  user: AuthenticatedUser | undefined,
  method: string,
  path: string,
  type = "http",
): ExecutionContext {
  return {
    getType: () => type,
    switchToHttp: () => ({
      getRequest: () => ({ user, method, path, route: { path }, baseUrl: "" }),
    }),
  } as unknown as ExecutionContext;
}

describe("PermissionGuard", () => {
  let prisma: { user: { findUnique: jest.Mock } };
  let guard: PermissionGuard;

  /** An account with a template naming exactly these capabilities. */
  function templated(permissions: string[], baseRole = "SCHOOL_ADMIN", role = "SCHOOL_ADMIN") {
    prisma.user.findUnique.mockResolvedValue({
      role,
      roleTemplate: { baseRole, permissions },
    });
  }

  beforeEach(() => {
    prisma = { user: { findUnique: jest.fn().mockResolvedValue({ role: "SCHOOL_ADMIN", roleTemplate: null }) } };
    guard = new PermissionGuard(prisma as unknown as PrismaService);
  });

  describe("accounts without a template", () => {
    it("lets everything through, so switching the guard on changes nothing", async () => {
      await expect(guard.canActivate(contextFor(ADMIN, "DELETE", "/students/x"))).resolves.toBe(
        true,
      );
      await expect(guard.canActivate(contextFor(ADMIN, "GET", "/invoices"))).resolves.toBe(true);
    });

    it("never queries for the platform owner", async () => {
      const superAdmin: AuthenticatedUser = {
        id: "p-1",
        role: "SUPER_ADMIN",
        schoolId: null,
      };

      await expect(guard.canActivate(contextFor(superAdmin, "GET", "/schools"))).resolves.toBe(
        true,
      );
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it("ignores unauthenticated requests — that's the JWT guard's job", async () => {
      await expect(guard.canActivate(contextFor(undefined, "POST", "/auth/login"))).resolves.toBe(
        true,
      );
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it("ignores non-HTTP contexts", async () => {
      await expect(
        guard.canActivate(contextFor(ADMIN, "GET", "/students", "rpc")),
      ).resolves.toBe(true);
    });
  });

  describe("capability derivation", () => {
    it("maps GET to read", async () => {
      templated(["students:read"]);

      await expect(guard.canActivate(contextFor(ADMIN, "GET", "/students"))).resolves.toBe(true);
    });

    it("maps every other method to write", async () => {
      templated(["students:read"]);

      for (const method of ["POST", "PATCH", "PUT", "DELETE"]) {
        await expect(
          guard.canActivate(contextFor(ADMIN, method, "/students")),
        ).rejects.toThrow(/students:write/);
      }
    });

    it("reads the resource from the first path segment, not the whole path", async () => {
      templated(["payments:write"]);

      // `payments/gateway` is still the payments resource.
      await expect(
        guard.canActivate(contextFor(ADMIN, "POST", "/payments/gateway/checkout")),
      ).resolves.toBe(true);
    });

    it("names the missing capability so an admin knows which box to tick", async () => {
      templated(["students:read"]);

      await expect(guard.canActivate(contextFor(ADMIN, "GET", "/invoices"))).rejects.toThrow(
        "Your access template doesn't include invoices:read",
      );
    });
  });

  describe("always-allowed resources", () => {
    it("lets a templated user sign in, refresh and upload", async () => {
      templated([]);

      for (const [method, path] of [
        ["POST", "/auth/refresh"],
        ["GET", "/health"],
        ["POST", "/devices"],
        ["POST", "/uploads"],
      ] as const) {
        await expect(guard.canActivate(contextFor(ADMIN, method, path))).resolves.toBe(true);
      }
    });
  });

  describe("resources no capability can name", () => {
    it("refuses a templated user the template editor itself", async () => {
      // Otherwise a school could narrow itself out of its own settings with no
      // way back that didn't involve a support call.
      templated(["students:read"]);

      await expect(
        guard.canActivate(contextFor(ADMIN, "GET", "/role-templates")),
      ).rejects.toThrow(/only available to administrators without an access template/);
    });

    it("says so plainly rather than naming an ungrantable capability", async () => {
      templated(["students:read"]);

      await expect(
        guard.canActivate(contextFor(ADMIN, "GET", "/school-groups")),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        guard.canActivate(contextFor(ADMIN, "GET", "/school-groups")),
      ).rejects.not.toThrow(/school-groups:read/);
    });
  });

  describe("stale templates", () => {
    it("fails closed when the base role no longer matches the account", async () => {
      // Somebody's role changed underneath the template. Honouring it would
      // silently widen access, so it refuses and asks for a human.
      templated(["students:read"], "TEACHER", "SCHOOL_ADMIN");

      await expect(guard.canActivate(contextFor(ADMIN, "GET", "/students"))).rejects.toThrow(
        /no longer matches your role/,
      );
    });
  });

  describe("freshness", () => {
    it("reads the template per request, so revoking takes effect at once", async () => {
      templated(["students:read"]);

      await guard.canActivate(contextFor(ADMIN, "GET", "/students"));
      await guard.canActivate(contextFor(ADMIN, "GET", "/students"));

      expect(prisma.user.findUnique).toHaveBeenCalledTimes(2);
    });
  });
});
