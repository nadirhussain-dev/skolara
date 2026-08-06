import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import * as bcrypt from "bcrypt";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock };
    school: { findUnique: jest.Mock };
    refreshToken: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    passwordResetToken: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let jwt: { signAsync: jest.Mock; verifyAsync: jest.Mock; decode: jest.Mock };
  let notifications: { sendEmail: jest.Mock };

  const PASSWORD = "correct-horse-battery-staple";
  let passwordHash: string;

  const baseUser = {
    id: "user-1",
    role: "SCHOOL_ADMIN" as const,
    schoolId: "school-1",
    email: "admin@school.test",
    firstName: "A",
    lastName: "B",
    phone: null,
    isActive: true,
    createdAt: new Date(),
  };

  const activeSchool = {
    id: "school-1",
    subdomain: "school1",
    subscriptionStatus: "ACTIVE",
  };

  // A stored RefreshToken record considered valid — not revoked, not expired.
  const validStoredToken = {
    id: "stored-1",
    userId: "user-1",
    tokenHash: "irrelevant-in-tests",
    revokedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
  };

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(PASSWORD, 10);
  });

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn() },
      school: { findUnique: jest.fn() },
      refreshToken: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      passwordResetToken: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
    };
    jwt = { signAsync: jest.fn(), verifyAsync: jest.fn(), decode: jest.fn() };
    notifications = { sendEmail: jest.fn() };

    const config = {
      getOrThrow: jest.fn((key: string) => `secret-for-${key}`),
      get: jest.fn((_key: string, fallback?: string) => fallback),
    };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get(AuthService);
    jwt.signAsync.mockResolvedValue("signed-token");
    jwt.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });
    prisma.refreshToken.create.mockResolvedValue({});
  });

  describe("login", () => {
    it("rejects an unknown email", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: "nobody@x.test", password: PASSWORD }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("rejects a deactivated account", async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...baseUser,
        passwordHash,
        isActive: false,
      });

      await expect(
        service.login({ email: baseUser.email, password: PASSWORD }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("rejects a subdomain that doesn't match the user's school", async () => {
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, passwordHash });
      prisma.school.findUnique.mockResolvedValue(activeSchool);

      await expect(
        service.login({
          email: baseUser.email,
          password: PASSWORD,
          subdomain: "someone-elses-school",
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it.each(["PENDING", "SUSPENDED", "REJECTED", "EXPIRED"] as const)(
      "rejects login when the school's subscription is %s",
      async (subscriptionStatus) => {
        prisma.user.findUnique.mockResolvedValue({ ...baseUser, passwordHash });
        prisma.school.findUnique.mockResolvedValue({ ...activeSchool, subscriptionStatus });

        await expect(
          service.login({ email: baseUser.email, password: PASSWORD }),
        ).rejects.toThrow(UnauthorizedException);
      },
    );

    it("rejects an incorrect password", async () => {
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, passwordHash });
      prisma.school.findUnique.mockResolvedValue(activeSchool);

      await expect(
        service.login({ email: baseUser.email, password: "wrong-password" }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("issues both tokens, persists the refresh token, and returns the public user shape", async () => {
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, passwordHash });
      prisma.school.findUnique.mockResolvedValue(activeSchool);

      const result = await service.login({ email: baseUser.email, password: PASSWORD });

      expect(result.accessToken).toBe("signed-token");
      expect(result.refreshToken).toBe("signed-token");
      expect(result.user.email).toBe(baseUser.email);
      expect((result.user as { passwordHash?: string }).passwordHash).toBeUndefined();
      expect(jwt.signAsync).toHaveBeenCalledTimes(2);
      expect(prisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: baseUser.id }) }),
      );
    });

    it("allows SUPER_ADMIN (no schoolId) to skip the school checks entirely", async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...baseUser,
        role: "SUPER_ADMIN",
        schoolId: null,
        passwordHash,
      });

      await expect(
        service.login({ email: baseUser.email, password: PASSWORD }),
      ).resolves.toBeDefined();
      expect(prisma.school.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("refresh", () => {
    it("rejects a token that fails JWT verification", async () => {
      jwt.verifyAsync.mockRejectedValue(new Error("bad signature"));

      await expect(service.refresh("garbage")).rejects.toThrow(UnauthorizedException);
    });

    it("rejects a syntactically valid JWT with no matching server-side record (e.g. never issued, or DB wiped)", async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: "user-1", role: "SCHOOL_ADMIN", schoolId: "school-1" });
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refresh("a-valid-looking-token")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("rejects a token that has already been revoked (reuse after rotation, or after logout)", async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: "user-1", role: "SCHOOL_ADMIN", schoolId: "school-1" });
      prisma.refreshToken.findUnique.mockResolvedValue({
        ...validStoredToken,
        revokedAt: new Date(),
      });

      await expect(service.refresh("a-valid-looking-token")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("rejects a token whose stored record has already expired", async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: "user-1", role: "SCHOOL_ADMIN", schoolId: "school-1" });
      prisma.refreshToken.findUnique.mockResolvedValue({
        ...validStoredToken,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.refresh("a-valid-looking-token")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("rejects a valid token for a user that no longer exists", async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: "user-1", role: "SCHOOL_ADMIN", schoolId: "school-1" });
      prisma.refreshToken.findUnique.mockResolvedValue(validStoredToken);
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.refresh("a-valid-looking-token")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("rejects a valid token whose school is no longer in good standing", async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: "user-1", role: "SCHOOL_ADMIN", schoolId: "school-1" });
      prisma.refreshToken.findUnique.mockResolvedValue(validStoredToken);
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, passwordHash });
      prisma.school.findUnique.mockResolvedValue({ ...activeSchool, subscriptionStatus: "SUSPENDED" });

      await expect(service.refresh("a-valid-looking-token")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("revokes the used token and issues a fresh pair for a still-valid session", async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: "user-1", role: "SCHOOL_ADMIN", schoolId: "school-1" });
      prisma.refreshToken.findUnique.mockResolvedValue(validStoredToken);
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, passwordHash });
      prisma.school.findUnique.mockResolvedValue(activeSchool);

      const result = await service.refresh("a-valid-looking-token");

      expect(result).toEqual({ accessToken: "signed-token", refreshToken: "signed-token" });
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: validStoredToken.id },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe("logout", () => {
    it("revokes the matching, still-active token", async () => {
      await service.logout("some-refresh-token");

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { tokenHash: expect.any(String), revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it("doesn't throw for an unknown/already-revoked token (idempotent)", async () => {
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.logout("garbage-token")).resolves.toBeUndefined();
    });
  });

  describe("revokeAllSessionsForUser", () => {
    it("revokes every active session for the user", async () => {
      await service.revokeAllSessionsForUser("user-1");

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: "user-1", revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe("forgotPassword", () => {
    it("silently no-ops for an unknown email (doesn't leak account existence)", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await service.forgotPassword({ email: "nobody@x.test" });

      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
      expect(notifications.sendEmail).not.toHaveBeenCalled();
    });

    it("silently no-ops for a deactivated account", async () => {
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, passwordHash, isActive: false });

      await service.forgotPassword({ email: baseUser.email });

      expect(notifications.sendEmail).not.toHaveBeenCalled();
    });

    it("silently no-ops when the subdomain doesn't match the user's school", async () => {
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, passwordHash });
      prisma.school.findUnique.mockResolvedValue(activeSchool);

      await service.forgotPassword({ email: baseUser.email, subdomain: "wrong-school" });

      expect(notifications.sendEmail).not.toHaveBeenCalled();
    });

    it("creates a reset token and emails a reset link for a valid account", async () => {
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, passwordHash });
      prisma.school.findUnique.mockResolvedValue(activeSchool);

      await service.forgotPassword({ email: baseUser.email });

      expect(prisma.passwordResetToken.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: baseUser.id }) }),
      );
      expect(notifications.sendEmail).toHaveBeenCalledWith(
        baseUser.email,
        expect.stringContaining("Reset"),
        expect.stringContaining("http"),
      );
    });
  });

  describe("resetPassword", () => {
    const validResetToken = {
      id: "reset-1",
      userId: "user-1",
      tokenHash: "irrelevant-in-tests",
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    };

    it("rejects an unknown token", async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue(null);

      await expect(
        service.resetPassword({ token: "garbage", newPassword: "new-password-123" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects an already-used token", async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        ...validResetToken,
        usedAt: new Date(),
      });

      await expect(
        service.resetPassword({ token: "used-token", newPassword: "new-password-123" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects an expired token", async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        ...validResetToken,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        service.resetPassword({ token: "expired-token", newPassword: "new-password-123" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("updates the password and revokes every existing session on success", async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue(validResetToken);

      await service.resetPassword({ token: "valid-token", newPassword: "new-password-123" });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: validResetToken.userId },
        data: { passwordHash: expect.any(String) },
      });
      expect(prisma.passwordResetToken.update).toHaveBeenCalledWith({
        where: { id: validResetToken.id },
        data: { usedAt: expect.any(Date) },
      });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: validResetToken.userId, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });
});
