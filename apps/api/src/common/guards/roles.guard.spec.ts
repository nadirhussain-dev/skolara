import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RolesGuard } from "./roles.guard";

function contextWithUser(user: { role?: string } | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe("RolesGuard", () => {
  it("allows the request through when no @Roles() is set", () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(contextWithUser({ role: "STUDENT" }))).toBe(true);
  });

  it("allows a request whose role is in the allowed list", () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(["SCHOOL_ADMIN", "TEACHER"]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(contextWithUser({ role: "TEACHER" }))).toBe(true);
  });

  it("rejects a request whose role isn't in the allowed list", () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(["SCHOOL_ADMIN"]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(contextWithUser({ role: "STUDENT" }))).toBe(false);
  });

  it("rejects when there's no authenticated user at all", () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(["SCHOOL_ADMIN"]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(contextWithUser(undefined))).toBe(false);
  });
});
