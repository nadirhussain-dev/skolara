import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import type { AuthResponse, LoginInput } from "@skolara/types";
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

    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      schoolId: user.schoolId,
    };

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

    return {
      accessToken,
      refreshToken,
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
}
