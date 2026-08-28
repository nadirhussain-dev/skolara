import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { FeatureGuard } from "./feature.guard";
import type { PrismaService } from "../../prisma/prisma.service";

describe("FeatureGuard", () => {
  let prisma: { school: { findUnique: jest.Mock } };
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: FeatureGuard;

  function contextFor(user: unknown): ExecutionContext {
    return {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }

  const schoolAdmin = { id: "u1", role: "SCHOOL_ADMIN", schoolId: "school-1" };

  beforeEach(() => {
    prisma = { school: { findUnique: jest.fn() } };
    reflector = { getAllAndOverride: jest.fn() };
    guard = new FeatureGuard(
      reflector as unknown as Reflector,
      prisma as unknown as PrismaService,
    );
  });

  it("lets an ungated route through without touching the database", async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    await expect(guard.canActivate(contextFor(schoolAdmin))).resolves.toBe(true);
    expect(prisma.school.findUnique).not.toHaveBeenCalled();
  });

  it("allows a feature the school's plan includes", async () => {
    reflector.getAllAndOverride.mockReturnValue("PAYROLL");
    prisma.school.findUnique.mockResolvedValue({ plan: "PREMIUM" });

    await expect(guard.canActivate(contextFor(schoolAdmin))).resolves.toBe(true);
  });

  it("blocks a feature above the school's plan", async () => {
    reflector.getAllAndOverride.mockReturnValue("PAYROLL");
    prisma.school.findUnique.mockResolvedValue({ plan: "BASIC" });

    await expect(guard.canActivate(contextFor(schoolAdmin))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("names the plan that would unlock it, so the error is an upsell not a dead end", async () => {
    reflector.getAllAndOverride.mockReturnValue("PAYROLL");
    prisma.school.findUnique.mockResolvedValue({ plan: "BASIC" });

    await expect(guard.canActivate(contextFor(schoolAdmin))).rejects.toThrow(/Premium/);
  });

  it("exempts the platform owner, who isn't on a plan", async () => {
    reflector.getAllAndOverride.mockReturnValue("SCHOOL_GROUPS");

    await expect(
      guard.canActivate(contextFor({ id: "u0", role: "SUPER_ADMIN", schoolId: null })),
    ).resolves.toBe(true);
    expect(prisma.school.findUnique).not.toHaveBeenCalled();
  });

  it("refuses when there's no school context to check a plan against", async () => {
    reflector.getAllAndOverride.mockReturnValue("PAYROLL");

    await expect(
      guard.canActivate(contextFor({ id: "u1", role: "TEACHER", schoolId: null })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
