import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import type { AuthResponse, AuthTokens, LoginInput } from "@skolara/types";
import { PrismaService } from "../prisma/prisma.service";
import type { JwtPayload } from "./jwt-payload.interface";

const LOGIN_ALLOWED_STATUSES = new Set(["TRIAL", "ACTIVE"]);

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (user.schoolId) {
      const school = await this.prisma.school.findUnique({
        where: { id: user.schoolId },
      });
      if (!school || (input.subdomain && school.subdomain !== input.subdomain)) {
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
        createdAt: user.createdAt,
      },
    };
  }

  // Exchanges a still-valid refresh token for a new token pair (rotation —
  // each refresh token is single-use in practice since the client immediately
  // replaces it), re-checking the user/school are still in good standing
  // rather than trusting whatever was true when the token was issued.
  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
      });
    } catch {
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

    return this.issueTokens({ sub: user.id, role: user.role, schoolId: user.schoolId });
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
    return { accessToken, refreshToken };
  }
}
