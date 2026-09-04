import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { createHash, randomBytes } from "crypto";
import type {
  AuthResponse,
  AuthTokens,
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
} from "@skolara/types";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import type { JwtPayload } from "./jwt-payload.interface";

const LOGIN_ALLOWED_STATUSES = new Set(["TRIAL", "ACTIVE"]);

// Refresh tokens are already high-entropy signed JWTs, not low-entropy
// secrets like passwords — a fast hash is the right tool here, a slow one
// (bcrypt) would just add latency to every refresh call for no benefit.
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Finds the account an email + optional subdomain refers to.
   *
   * Email is only unique within a school, so an address used at two schools
   * is genuinely ambiguous without a subdomain. Rather than guessing, that
   * case is rejected with the same generic error as a wrong password —
   * telling the caller "this email exists at several schools" would leak
   * where someone holds accounts.
   */
  private async resolveLoginUser(email: string, subdomain?: string) {
    if (subdomain) {
      const school = await this.prisma.school.findUnique({
        where: { subdomain },
        select: { id: true },
      });
      if (!school) return null;
      return this.prisma.user.findUnique({
        where: { schoolId_email: { schoolId: school.id, email } },
      });
    }

    // Two is enough to know it's ambiguous; no need to load every match.
    const candidates = await this.prisma.user.findMany({ where: { email }, take: 2 });
    return candidates.length === 1 ? candidates[0] : null;
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.resolveLoginUser(input.email, input.subdomain);
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (user.schoolId) {
      const school = await this.prisma.school.findUnique({
        where: { id: user.schoolId },
      });
      if (!school) {
        throw new UnauthorizedException("Invalid credentials");
      }
      if (!LOGIN_ALLOWED_STATUSES.has(school.subscriptionStatus)) {
        throw new UnauthorizedException(
          `This school's account is ${school.subscriptionStatus.toLowerCase()} — contact your platform administrator`,
        );
      }
    }

    const passwordMatches = await bcrypt.compare(
      input.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const tokens = await this.issueTokens({
      sub: user.id,
      role: user.role,
      schoolId: user.schoolId,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        schoolId: user.schoolId,
        role: user.role,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        isActive: user.isActive,
        // Carried on the login response so the app can tell a restricted
        // account from an unrestricted one without a second request. It is not
        // what enforces anything — PermissionGuard reads the template from the
        // database on every request, so revoking one takes effect at once
        // rather than at the next login.
        roleTemplateId: user.roleTemplateId,
        createdAt: user.createdAt,
      },
    };
  }

  // Exchanges a still-valid, still-unrevoked refresh token for a new pair
  // (rotation — the old one is revoked here, so replaying it after a
  // legitimate refresh now fails instead of silently working until expiry).
  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
      });
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    if (user.schoolId) {
      const school = await this.prisma.school.findUnique({ where: { id: user.schoolId } });
      if (!school || !LOGIN_ALLOWED_STATUSES.has(school.subscriptionStatus)) {
        throw new UnauthorizedException("Invalid or expired refresh token");
      }
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens({ sub: user.id, role: user.role, schoolId: user.schoolId });
  }

  // Idempotent by design: an already-revoked or unknown token is treated as
  // "already logged out" rather than an error the client has to handle.
  async logout(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // For flows that should kill every session at once — password reset/change
  // being the main one, so a stolen refresh token stops working the moment
  // the legitimate owner resets their password.
  async revokeAllSessionsForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // Always resolves the same way whether or not the email/subdomain match a
  // real account — the response must not leak account existence. The actual
  // outcome (an email landing, or nothing happening) is invisible to the caller.
  async forgotPassword(input: ForgotPasswordInput): Promise<void> {
    // Same resolution rule as login: an email used at two schools without a
    // subdomain is ambiguous, and guessing which account to reset would let
    // someone trigger a reset at a school they don't belong to.
    const user = await this.resolveLoginUser(input.email, input.subdomain);
    if (!user || !user.isActive) return;

    if (user.schoolId) {
      const school = await this.prisma.school.findUnique({ where: { id: user.schoolId } });
      if (!school) return;
    }

    const rawToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(rawToken), expiresAt },
    });

    const appUrl = this.config.get<string>("APP_URL", "http://localhost:3000");
    const resetLink = `${appUrl}/reset-password?token=${rawToken}`;

    await this.notifications.sendEmail(
      user.email,
      "Reset your Skolara password",
      `Hi ${user.firstName},\n\n` +
        "Someone requested a password reset for your Skolara account. " +
        `If this was you, set a new password within the next hour:\n\n${resetLink}\n\n` +
        "If you didn't request this, you can safely ignore this email — your password hasn't been changed.",
    );
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const stored = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(input.token) },
    });
    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw new BadRequestException("This reset link is invalid or has expired");
    }

    const passwordHash = await bcrypt.hash(input.newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: stored.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({
        where: { id: stored.id },
        data: { usedAt: new Date() },
      }),
    ]);

    // A stolen refresh token should stop working the moment the legitimate
    // owner resets their password, not linger until its own natural expiry.
    await this.revokeAllSessionsForUser(stored.userId);
  }

  private async issueTokens(payload: JwtPayload): Promise<AuthTokens> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
        expiresIn: this.config.get<string>("JWT_ACCESS_EXPIRES_IN", "15m"),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
        expiresIn: this.config.get<string>("JWT_REFRESH_EXPIRES_IN", "7d"),
      }),
    ]);

    const decoded = this.jwt.decode<{ exp: number }>(refreshToken);
    await this.prisma.refreshToken.create({
      data: {
        userId: payload.sub,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(decoded.exp * 1000),
      },
    });

    return { accessToken, refreshToken };
  }
}
