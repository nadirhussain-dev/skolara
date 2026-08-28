import { ExecutionContext, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { createHash } from "node:crypto";
import { JwtOrApiKeyGuard } from "./jwt-or-api-key.guard";
import type { PrismaService } from "../../prisma/prisma.service";

// Regression coverage for API keys being issue-only: the ApiKey table was
// written and read back by the management UI, but no guard ever authenticated
// with one, so a school could mint keys that did nothing.

const RAW_KEY = "sk_skolara_deadbeef";
const HASHED_KEY = createHash("sha256").update(RAW_KEY).digest("hex");

describe("JwtOrApiKeyGuard", () => {
  let prisma: { apiKey: { findFirst: jest.Mock; update: jest.Mock } };
  let guard: JwtOrApiKeyGuard;
  let request: {
    method: string;
    headers: Record<string, string>;
    header: (name: string) => string | undefined;
    user?: unknown;
  };

  function contextFor(req: typeof request): ExecutionContext {
    return {
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;
  }

  function makeRequest(method: string, headers: Record<string, string> = {}) {
    return {
      method,
      headers,
      header: (name: string) => headers[name.toLowerCase()],
    };
  }

  beforeEach(() => {
    prisma = {
      apiKey: {
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    guard = new JwtOrApiKeyGuard(prisma as unknown as PrismaService);
    request = makeRequest("GET", { "x-api-key": RAW_KEY });
  });

  it("authenticates a GET with a valid key, scoped to that key's school", async () => {
    prisma.apiKey.findFirst.mockResolvedValue({
      id: "key-1",
      schoolId: "school-1",
      lastUsedAt: null,
    });

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(prisma.apiKey.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { hashedKey: HASHED_KEY, revokedAt: null } }),
    );
    expect(request.user).toEqual({
      id: "api-key:key-1",
      role: "SCHOOL_ADMIN",
      schoolId: "school-1",
    });
  });

  it("never lets an API key write, even on a controller it can read", async () => {
    const post = makeRequest("POST", { "x-api-key": RAW_KEY });
    await expect(guard.canActivate(contextFor(post))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.apiKey.findFirst).not.toHaveBeenCalled();
  });

  it("rejects a key that doesn't exist", async () => {
    prisma.apiKey.findFirst.mockResolvedValue(null);
    await expect(guard.canActivate(contextFor(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("rejects a revoked key", async () => {
    // Revocation is expressed in the query, so a revoked key simply misses.
    prisma.apiKey.findFirst.mockResolvedValue(null);
    await expect(guard.canActivate(contextFor(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prisma.apiKey.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ revokedAt: null }) }),
    );
  });

  it("refreshes lastUsedAt when it is stale", async () => {
    prisma.apiKey.findFirst.mockResolvedValue({
      id: "key-1",
      schoolId: "school-1",
      lastUsedAt: new Date(Date.now() - 5 * 60_000),
    });

    await guard.canActivate(contextFor(request));
    expect(prisma.apiKey.update).toHaveBeenCalledWith({
      where: { id: "key-1" },
      data: { lastUsedAt: expect.any(Date) },
    });
  });

  it("skips the lastUsedAt write on a burst of requests", async () => {
    prisma.apiKey.findFirst.mockResolvedValue({
      id: "key-1",
      schoolId: "school-1",
      lastUsedAt: new Date(),
    });

    await guard.canActivate(contextFor(request));
    expect(prisma.apiKey.update).not.toHaveBeenCalled();
  });

  it("falls through to JWT auth when no API key is presented", async () => {
    const jwtOnly = makeRequest("GET");
    const jwtGuard = (guard as unknown as { jwtGuard: { canActivate: jest.Mock } }).jwtGuard;
    jest.spyOn(jwtGuard, "canActivate").mockResolvedValue(true);

    await expect(guard.canActivate(contextFor(jwtOnly))).resolves.toBe(true);
    expect(prisma.apiKey.findFirst).not.toHaveBeenCalled();
  });
});
